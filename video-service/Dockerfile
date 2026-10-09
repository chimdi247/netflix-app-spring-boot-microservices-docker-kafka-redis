# syntax=docker/dockerfile:1.7
# video-service: build with Maven, run on a slim JRE with the OpenTelemetry Java agent attached.

# ---------- build ----------
FROM maven:3.9-eclipse-temurin-17 AS build
WORKDIR /build
COPY pom.xml .
# dependencies first: this layer is cached until pom.xml changes ("|| true": go-offline is best effort)
RUN --mount=type=cache,target=/root/.m2 mvn -B -q dependency:go-offline || true
COPY src ./src
RUN --mount=type=cache,target=/root/.m2 mvn -B -q -DskipTests package

# ---------- runtime ----------
FROM eclipse-temurin:17-jre-alpine

# OpenTelemetry Java agent: auto-instruments Spring MVC, Kafka, JDBC, Redis, HTTP clients and Logback
# (traces, metrics, logs, context propagation) without any change to the application code.
ARG OTEL_AGENT_VERSION=2.10.0
ADD https://github.com/open-telemetry/opentelemetry-java-instrumentation/releases/download/v${OTEL_AGENT_VERSION}/opentelemetry-javaagent.jar /opt/otel/opentelemetry-javaagent.jar

RUN chmod 644 /opt/otel/opentelemetry-javaagent.jar \
 && addgroup -S app && adduser -S app -G app

WORKDIR /app
COPY --from=build /build/target/app.jar app.jar

USER app
EXPOSE 8082

# heap is capped relative to the container memory limit (set in docker-compose.yml)
ENV JAVA_OPTS="-XX:MaxRAMPercentage=40 -XX:+ExitOnOutOfMemoryError"
# exporter endpoints and the service name come from the OTEL_* variables in docker-compose.yml;
# set OTEL_JAVAAGENT_ENABLED=false to run without telemetry
ENTRYPOINT ["sh", "-c", "exec java $JAVA_OPTS -javaagent:/opt/otel/opentelemetry-javaagent.jar -jar /app/app.jar"]
