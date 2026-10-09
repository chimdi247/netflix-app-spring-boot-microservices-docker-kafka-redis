#!/bin/sh
# One-shot job (service "kafka-init" in docker-compose.yml): creates the topics the services use, then exits.
# Idempotent (--if-not-exists). Creating them here means no service depends on start-up order.
set -e

BOOTSTRAP="${KAFKA_BOOTSTRAP:-kafka:9092}"
KT=/opt/kafka/bin/kafka-topics.sh

echo "Waiting for Kafka at ${BOOTSTRAP}..."
until $KT --bootstrap-server "$BOOTSTRAP" --list >/dev/null 2>&1; do
  sleep 2
done

# video.uploaded : video-service -> encoding-service, content-service
# video.encoded  : encoding-service -> content-service, streaming-service
for topic in video.uploaded video.encoded; do
  $KT --bootstrap-server "$BOOTSTRAP" --create --if-not-exists \
      --topic "$topic" --partitions 3 --replication-factor 1
done

echo "Topics ready:"
$KT --bootstrap-server "$BOOTSTRAP" --list
