#!/usr/bin/env bash
# Runs a performance test inside Docker (nothing to install) and streams the metrics to Grafana.
#
#   ./tests/run.sh smoke
#   ./tests/run.sh load -e VU_SCALE=2
#   ./tests/run.sh soak -e DURATION=2h
#   ./tests/run.sh all                      # smoke -> load -> pipeline
#
# Everything after the test name is passed to `k6 run` (use -e NAME=value for script settings).
set -euo pipefail
cd "$(dirname "$0")/.."

TESTS="smoke load stress spike soak breakpoint pipeline"
usage() {
  echo "Usage: $0 <test|all> [k6 options]"
  echo "Tests: $TESTS"
  exit 1
}

TEST="${1:-}"
[ -n "$TEST" ] || usage
shift || true

run_one() {
  local name="$1"; shift
  [ -f "tests/$name.js" ] || { echo "Unknown test: $name"; usage; }
  mkdir -p tests/results
  echo
  echo "=== k6: $name ==="
  docker compose --profile tests run --rm k6 run \
    -o experimental-prometheus-rw \
    --tag "testid=$name" \
    -e S3_FETCH_BASE=http://minio:9000 \
    --summary-export "/results/${name}-$(date +%Y%m%d-%H%M%S).json" \
    "/tests/$name.js" "$@"
}

echo "Starting the stack if it is not running..."
docker compose up -d >/dev/null

echo -n "Waiting for the app"
for _ in $(seq 1 90); do
  [ "$(docker inspect -f '{{.State.Health.Status}}' frontend 2>/dev/null || true)" = "healthy" ] && break
  echo -n "."; sleep 2
done
echo

if [ "$TEST" = "all" ]; then
  for t in smoke load pipeline; do run_one "$t" "$@"; done
else
  run_one "$TEST" "$@"
fi

echo
echo "Live results:  http://localhost:3030  ->  Netflix -> 'Netflix k6 Load Tests' and the other dashboards"
echo "Summary files: tests/results/"
echo "Remove the test users and movies afterwards with: ./tests/cleanup.sh"
