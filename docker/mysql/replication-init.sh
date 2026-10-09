#!/bin/bash
# =============================================================================
# One-shot job (service "mysql-init" in docker-compose.yml).
#
#   1. points every replica at the primary (GTID auto-positioning) and starts replication
#   2. makes the replicas read-only (persisted, survives restarts)
#   3. waits until the data has arrived on every replica
#   4. waits until ProxySQL can reach the writer AND the reader pool
#
# Safe to run again: replicas that already replicate are left alone.
# =============================================================================
set -uo pipefail

PRIMARY="${MYSQL_PRIMARY_HOST:-mysql-primary}"
REPLICAS="${MYSQL_REPLICA_HOSTS:-mysql-replica-1 mysql-replica-2}"
PROXYSQL="${PROXYSQL_HOST:-proxysql}"
export MYSQL_PWD="${MYSQL_ROOT_PASSWORD:?MYSQL_ROOT_PASSWORD is required}"

q() { local host="$1"; shift; mysql -h "$host" -uroot --batch --skip-column-names "$@" 2>/dev/null; }

wait_up() {
  local host="$1" n=0
  until q "$host" -e "SELECT 1" >/dev/null; do
    n=$((n + 1)); [ $n -gt 90 ] && { echo "ERROR: $host did not come up"; exit 1; }
    sleep 2
  done
  echo "$host is up"
}

wait_up "$PRIMARY"
for r in $REPLICAS; do wait_up "$r"; done

for r in $REPLICAS; do
  yes_count=$(q "$r" -e "SHOW REPLICA STATUS\G" | grep -E "Replica_(IO|SQL)_Running:" | grep -c "Yes")
  if [ "$yes_count" = "2" ]; then
    echo "$r: replication already running"
  else
    echo "$r: configuring replication from $PRIMARY"
    q "$r" -e "STOP REPLICA" || true
    q "$r" -e "RESET REPLICA ALL" || true
    q "$r" -e "CHANGE REPLICATION SOURCE TO SOURCE_HOST='$PRIMARY', SOURCE_PORT=3306, SOURCE_USER='repl', SOURCE_PASSWORD='repl_pw', SOURCE_AUTO_POSITION=1, GET_SOURCE_PUBLIC_KEY=1" \
      || { echo "ERROR: CHANGE REPLICATION SOURCE failed on $r"; exit 1; }
    q "$r" -e "START REPLICA" || { echo "ERROR: START REPLICA failed on $r"; exit 1; }
  fi
  # PERSIST keeps the setting across restarts (it is not set on the command line because the image's
  # first-start initialisation needs a writable server)
  q "$r" -e "SET PERSIST read_only=ON; SET PERSIST super_read_only=ON" || true
done

# the schema and the seed data written on the primary must be present on every replica
for r in $REPLICAS; do
  n=0
  until [ "$(q "$r" -e "SELECT COUNT(*) FROM auth_db.users WHERE email='admin@example.com'")" = "1" ] \
     && [ "$(q "$r" -e "SELECT COUNT(*) FROM mysql.user WHERE user='netflix_ro'")" = "1" ]; do
    n=$((n + 1))
    if [ $n -gt 60 ]; then
      echo "ERROR: $r did not receive the data from the primary. Replica status:"
      q "$r" -e "SHOW REPLICA STATUS\G" | grep -E "Running|Error|Source_Host|Executed_Gtid"
      exit 1
    fi
    sleep 2
  done
  echo "$r: in sync with the primary"
done

# ProxySQL: writer account -> primary, reader account -> replicas
n=0
until MYSQL_PWD=netflix_pw    mysql -h "$PROXYSQL" -P6033 -unetflix    --batch --skip-column-names -e "SELECT COUNT(*) FROM auth_db.users" >/dev/null 2>&1 \
   && MYSQL_PWD=netflix_ro_pw mysql -h "$PROXYSQL" -P6033 -unetflix_ro --batch --skip-column-names -e "SELECT COUNT(*) FROM content_db.movies" >/dev/null 2>&1; do
  n=$((n + 1))
  [ $n -gt 60 ] && { echo "ERROR: ProxySQL cannot reach the database servers"; exit 1; }
  sleep 2
done
echo "ProxySQL: writer and reader pools are working"
echo "Database layer is ready."
