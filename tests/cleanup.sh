#!/usr/bin/env bash
# Deletes the users and movies created by the performance tests (on the primary; replicas follow).

###  clean up   ./tests/cleanup.sh
set -euo pipefail
cd "$(dirname "$0")/.."
docker compose exec -T -e MYSQL_PWD="${MYSQL_ROOT_PASSWORD:-root}" mysql-primary mysql -uroot < tests/cleanup-perf-data.sql
echo "Performance test data removed."
