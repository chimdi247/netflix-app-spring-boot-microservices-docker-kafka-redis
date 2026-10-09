# Netflix streaming platform: Java microservices, React UI, full observability

Upload a video, watch it get encoded into four qualities, and stream it with adaptive bitrate. Five Spring Boot services talk over Kafka, MySQL (behind ProxySQL), Redis and S3-compatible storage; a React app sits in front; Grafana shows everything.

## Run everything

```bash
docker compose up -d --build
```

The first build downloads a lot (Maven dependencies, base images) and takes several minutes. Give Docker **at least 8 GB RAM** (the stack has about 35 containers). When it is up (1 to 2 minutes), three demo movies are uploaded and encoded in the background; they appear in the app after about a minute each.

| What | URL | Login |
| --- | --- | --- |
| **The app** | http://localhost:5173 | `admin@example.com` / `password123` (admin) · `viewer@example.com` / `password123` (watch only) |
| **Grafana** (dashboards, alerts, logs, traces) | http://localhost:3030 | `admin` / `admin`, folder **Netflix** |
| Kafka UI | http://localhost:8080 | |
| Redis UI | http://localhost:8081 | |
| MinIO console (video storage) | http://localhost:9001 | `minioadmin` / `minioadmin` |
| Mailpit (alert e-mails land here) | http://localhost:8025 | |
| Prometheus | http://localhost:9090 | |
| cAdvisor | http://localhost:8082 | |
| MySQL primary | `localhost:3306` | `root` / `root` |
| ProxySQL | `localhost:6033` (SQL), `localhost:6032` (admin) | `netflix` / `netflix_pw`, admin `radmin` / `radmin` |

Stop: `docker compose down`. Stop **and wipe** all data (databases, topics, videos, metrics; the SQL init scripts run again): `docker compose down -v`.

Copy `.env.example` to `.env` to change passwords, the JWT secret, SMTP settings or to use real AWS S3.

## How it fits together

```
 browser ──► nginx edge (frontend container, :5173) ── checks the JWT with the auth-service for every API call
                │
                ├─ /api/v1/auth/*    ► auth-service       users, BCrypt login, JWT          ─┐
                ├─ /api/v1/movies/*  ► content-service    catalog                          ─┤
                ├─ /api/v1/videos/*  ► video-service      upload ► MinIO + Kafka           ─┼─► ProxySQL ─► MySQL primary (writes)
                └─ /api/v1/stream/*  ► streaming-service  pre-signed HLS URLs, Redis cache ─┘              └► replica 1, replica 2 (reads)

 video.uploaded (Kafka) ► encoding-service: download ► FFmpeg (1080p/720p/480p/360p HLS) ► MinIO
 video.encoded  (Kafka) ► content-service (status READY)   ► streaming-service (Redis)
 the browser then plays the HLS stream: playlists via streaming-service, video segments straight from MinIO (pre-signed URLs)
```

- **Access control.** Backend services are not published on the host. nginx asks the auth-service (`/internal/auth/verify`) before it forwards a request: no valid token gives 401; adding, uploading or deleting movies needs the `ADMIN` role (403 otherwise). Everything else needs a valid login.
- **Passwords** are BCrypt hashes. The admin user is created by `docker/mysql/init/03-seed-admin-user.sql`.
- **MySQL.** One primary and two replicas (GTID replication). **ProxySQL** pools connections and routes by account: the `netflix` account always goes to the primary (hostgroup 10); the `netflix_ro` account is load balanced over the replicas (hostgroup 20, replicas more than 10 s behind are skipped). content-service uses both: read-only transactions use the reader pool, everything else the writer pool.
- **Storage.** MinIO provides an S3 API. The bucket is private; the browser only ever gets time-limited pre-signed URLs. Set `S3_ENDPOINT=` (empty) to use real AWS S3.

## `docker/`

| Path | What |
| --- | --- |
| `mysql/init/01-schema.sql` | creates `auth_db.users` and `content_db.movies` (services run Hibernate with `ddl-auto=none`) |
| `mysql/init/02-users.sql` | database accounts: application, read-only, ProxySQL monitor, replication, exporter |
| `mysql/init/03-seed-admin-user.sql` | **admin@example.com / password123**, stored as a BCrypt hash |
| `mysql/init/04-seed-demo-viewer.sql` | optional: viewer@example.com (delete the file if you do not want it) |
| `mysql/replication-init.sh` | one-shot job: starts replication, makes replicas read-only, waits until ProxySQL works |
| `proxysql/proxysql.cnf` | servers, hostgroups, users, health checks |
| `kafka/` | Kafka (KRaft) image with the Prometheus JMX exporter, topic creation script |
| `minio/create-bucket.sh` | creates the private bucket |
| `demo/` | `sample.mp4` and the script that seeds three demo movies |

The init SQL runs once, on the first start with empty volumes.

## Observability (`observability/`)

The Java services run with the **OpenTelemetry Java agent** (baked into each Dockerfile, no code changes for traces, logs and standard metrics). Trace context is propagated over HTTP *and* through Kafka messages, so one upload is a single trace from the browser request to the encoded result. Business metrics (uploads, encoding results and durations, logins, play requests, cache hits) use the OpenTelemetry API.

```
services ──OTLP──► otel-collector ──traces──► Tempo ──span metrics──► Prometheus
                                  ──metrics─► Prometheus
                                  ──logs────► Loki
cAdvisor, node-exporter, blackbox, mysqld-exporters (x3), ProxySQL, Kafka JMX, kafka-exporter, redis-exporter, MinIO ─► Prometheus
Grafana: Prometheus, Loki, Tempo, MySQL (via ProxySQL), ProxySQL admin  ──►  dashboards + Grafana-managed alerts ──SMTP──► e-mail
```

**Logs show traces.** In Grafana open a dashboard's log panel or Explore -> Loki, expand a log line and click **View trace in Tempo**: you get the whole request with all its spans. From a span, "Logs for this span" jumps back to the matching log lines. Log lines also print `[service,trace_id,span_id]` in the container output.

**Dashboards** (folder *Netflix*):
- **Platform Overview**: uptime, availability / latency / success SLIs against SLOs with error budget, successful vs failed HTTP requests, 5xx rate, p50/p95/p99, business KPIs (users, movies, uploads, encodings, plays, logins), container and node CPU / memory, JVM, connection pools, logs and error traces.
- **MySQL & ProxySQL**: server health, replication state and lag, read/write distribution over primary and replicas, workload, InnoDB, ProxySQL pools and routing.
- **Kafka**: broker health, throughput, request latency, topics, consumer-group lag, producers and consumers.
- **k6 Load Tests**: live test results next to what the system did meanwhile.

**Alerts** are Grafana-managed (Alerting -> Alert rules, folder *Netflix Alerts*) and sent through SMTP: container or node **CPU or memory above 50 %** for 3 minutes, plus service down, 5xx rate, p95 latency, failed encodings, MySQL down / replication stopped / lag, Kafka lag, Redis down. The default SMTP server is Mailpit (http://localhost:8025). For a real mailbox set the `SMTP_*` and `ALERT_EMAIL_TO` variables in `.env`, then `docker compose up -d grafana`. Containers are measured against their limits (Java services: 1 CPU / 1.28 GB), so the 50 % threshold means something; test it with `docker exec -d content-service sh -c 'while :; do :; done'`.

## Performance tests (`tests/`)

k6 smoke, load, stress, spike, soak, breakpoint and pipeline tests: `./tests/run.sh smoke`. See [`tests/README.md`](tests/README.md).

## What was changed in the original project

Fixed:
- `pom.xml` of video-, encoding- and streaming-service contained `<n>` instead of `<name>`: Maven refused to build them.
- The `target/` folders in the zip contained a real database password; they are gone (`.gitignore` added). Change that password if it is still in use.
- encoding-service: Kafka consumer was thrown out of the group after 5 minutes of encoding and the video was encoded again and again (`max.poll.interval.ms` raised, one record per poll); FFmpeg output could block the process (now written to a file) and had no timeout; non-16:9 videos were stretched (now letterboxed); Windows paths were hard-coded.
- streaming-service: every playlist request leaked an HTTP connection to the store (the service hung after about 50 requests); the playlist endpoint could sign **any** object in the bucket, including the raw uploads (now limited to `encoded/<movieId>/*.m3u8`); a lost Redis cache made movies unplayable (it now falls back to the bucket); real errors were reported as 404.
- content-service: unknown movie ids returned 500 (now 404, JSON errors); `show-sql` flooded the logs.

Added: auth-service (users, BCrypt, JWT, roles), the nginx edge with token checks, `DELETE /api/v1/movies/{id}`, MinIO support (S3 endpoint override), read/write routing for the database, the React app, the full observability stack, the performance tests.

Replaced: `netflix-player.html` (the React player does the same, and works with MinIO and the token checks).

## Using real AWS S3

Set in `.env`: `S3_ACCESS_KEY`, `S3_SECRET_KEY`, `AWS_REGION`, `AWS_BUCKET_NAME`, `S3_ENDPOINT=` and `S3_PUBLIC_ENDPOINT=` (both empty). Create the private bucket yourself and add a CORS rule that allows `GET` from your app's origin (the browser downloads segments from S3 directly).

## Good to know

- Playback uses hls.js, so it works in current Chrome, Edge, Firefox and desktop Safari (not iPhone Safari, which has no Media Source Extensions).
- Opening the app from another machine: set `S3_PUBLIC_ENDPOINT` to an address of the Docker host that the browser can reach, for example `http://192.168.1.20:9000`.
- `docker compose down -v` is the reset button. MySQL replicas, ProxySQL and the schema are rebuilt from the files in `docker/`.
- Encoding is CPU-heavy: while a video is encoded, the encoding-service container and the host CPU can pass 50 % and the alerts will fire. That is the alert doing its job.
- Deleting a movie removes the database row only; its files stay in the bucket.
