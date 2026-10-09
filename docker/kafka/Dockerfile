# Apache Kafka (KRaft, no ZooKeeper) with the Prometheus JMX exporter attached as a Java agent.
# The agent exposes broker metrics (throughput, request latency, under-replicated partitions, controller
# state, partition sizes ...) on :7071/metrics for the Grafana "Kafka" dashboard.
FROM apache/kafka:3.9.0

USER root
ARG JMX_EXPORTER_VERSION=0.20.0
ADD https://repo1.maven.org/maven2/io/prometheus/jmx/jmx_prometheus_javaagent/${JMX_EXPORTER_VERSION}/jmx_prometheus_javaagent-${JMX_EXPORTER_VERSION}.jar /opt/jmx/jmx_prometheus_javaagent.jar
COPY kafka-jmx.yml /opt/jmx/kafka-jmx.yml
# ADD from a URL creates a root-only (0600) file: the kafka user must be able to read it
RUN chmod 644 /opt/jmx/jmx_prometheus_javaagent.jar /opt/jmx/kafka-jmx.yml
USER appuser

# enabled in docker-compose.yml with:
#   KAFKA_OPTS=-javaagent:/opt/jmx/jmx_prometheus_javaagent.jar=7071:/opt/jmx/kafka-jmx.yml
EXPOSE 7071
