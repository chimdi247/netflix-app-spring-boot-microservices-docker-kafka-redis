-- =============================================================================
-- Database accounts (all mysql_native_password: works with ProxySQL and MySQL 8.0 alike)
-- Demo passwords: change them for anything but local use, and keep
-- docker/proxysql/proxysql.cnf and observability/mysqld-exporter/*.cnf in sync.
-- =============================================================================

-- Application: reached through ProxySQL. Hibernate only needs DML, the schema is created by 01-schema.sql.
CREATE USER IF NOT EXISTS 'netflix'@'%' IDENTIFIED WITH mysql_native_password BY 'netflix_pw';
GRANT SELECT, INSERT, UPDATE, DELETE ON content_db.* TO 'netflix'@'%';
GRANT SELECT, INSERT, UPDATE, DELETE ON auth_db.*    TO 'netflix'@'%';

-- Read-only account: ProxySQL routes it to the replicas (also used by Grafana for the business KPIs).
CREATE USER IF NOT EXISTS 'netflix_ro'@'%' IDENTIFIED WITH mysql_native_password BY 'netflix_ro_pw';
GRANT SELECT ON content_db.* TO 'netflix_ro'@'%';
GRANT SELECT ON auth_db.*    TO 'netflix_ro'@'%';

-- ProxySQL health / replication-lag monitor
CREATE USER IF NOT EXISTS 'monitor'@'%' IDENTIFIED WITH mysql_native_password BY 'monitor_pw';
GRANT USAGE, REPLICATION CLIENT ON *.* TO 'monitor'@'%';

-- Replication: replicas connect to the primary with this account
CREATE USER IF NOT EXISTS 'repl'@'%' IDENTIFIED WITH mysql_native_password BY 'repl_pw';
GRANT REPLICATION SLAVE ON *.* TO 'repl'@'%';

-- Prometheus mysqld-exporter (Grafana MySQL dashboards)
CREATE USER IF NOT EXISTS 'exporter'@'%' IDENTIFIED WITH mysql_native_password BY 'exporter_pw' WITH MAX_USER_CONNECTIONS 5;
GRANT PROCESS, REPLICATION CLIENT, SELECT ON *.* TO 'exporter'@'%';
