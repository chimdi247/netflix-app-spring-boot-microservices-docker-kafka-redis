# Performance tests

[k6](https://k6.io) scripts that exercise the platform through the nginx edge, exactly like the browser does (login, JWT check, catalog, streaming, upload). They run inside Docker (nothing to install) and stream their metrics into Prometheus, so you watch them live in Grafana next to CPU, memory, JVM, MySQL / ProxySQL, Kafka and Redis.

```bash
./tests/run.sh smoke        # about 1 minute: does everything work, is access control right?
./tests/run.sh load         # 6.5 minutes: expected traffic
./tests/run.sh pipeline     # 3 minutes: how long until an uploaded video is playable?
./tests/run.sh all          # smoke -> load -> pipeline

./tests/cleanup.sh          # delete the users and movies the tests created
```

Open **Grafana -> Netflix -> "Netflix k6 Load Tests"** (http://localhost:3030) while a test runs. Summaries are written to `tests/results/`.

`setup()` of the viewer tests creates 20 viewers (`perf-<run>-<n>@loadtest.local`) and, once, the movie `k6 sample movie` by uploading `tests/data/sample.mp4` through the real pipeline (about a minute). Later runs reuse it. That provisioning is tagged `phase=provision` and excluded from the thresholds.

## The tests

| Script | Type | Shape | Question it answers |
| --- | --- | --- | --- |
| `smoke.js` | Smoke | 1 user, 1 pass | Is everything up and does every flow work? Health of the edge and all services, seeded admin and viewer login, registration, **access control** (no token 401, viewer cannot add / upload / delete 403), catalog CRUD, the **full video pipeline** (upload, Kafka, FFmpeg, MinIO, READY, signed playlists, segment download) and the security check that raw uploads cannot be signed. Every check must pass. Run it first and after every deploy. |
| `load.js` | Load | ramp to 20 VUs, hold 5 min | Does the system meet its SLOs under expected traffic? Viewer mix: 55 % browse, 20 % search / genre, 20 % watch (stream URL, playlists, segment), 5 % login. |
| `stress.js` | Stress | 20 -> 60 -> 100 -> 150 VUs, 3 min steps | How does it behave beyond capacity, which container saturates first, does it recover? Loose thresholds: you are looking at the curves. |
| `spike.js` | Spike | 10 -> 200 VUs in 20 s, hold 1 min, back to 10 | Does it survive a flash crowd and return to normal? Compare the last (recovery) minutes with the first. |
| `soak.js` | Soak | 10 VUs for 30 min (`-e DURATION=4h`) | Does anything leak over time: JVM heap, HikariCP / ProxySQL connections, Kafka lag, Redis memory? |
| `breakpoint.js` | Capacity | arrival rate rising to 300 / s over 10 min | How much can we sustain? Aborts itself when p95 > 1.5 s or errors > 5 %; the rate reached then is your capacity. Read-only mix: edge, JWT check, content-service, ProxySQL and the replicas. |
| `pipeline.js` | End-to-end latency | 1 upload every 20 s for 3 min | How long from "upload finished" to "playable"? Metric `pipeline_ready_time`. Encoding is CPU-bound and sequential, so faster uploads make Kafka consumer lag grow (Kafka dashboard). |

Pass options after the test name: `./tests/run.sh load -e VU_SCALE=2`, `./tests/run.sh soak -e DURATION=2h -e SOAK_VUS=20`, `./tests/run.sh breakpoint -e MAX_RATE=600`, `./tests/run.sh pipeline -e RATE_EVERY_S=10`.

## Settings (`-e NAME=value`)

| Name | Default | Meaning |
| --- | --- | --- |
| `BASE_URL` | `http://frontend` in Docker | Target (the nginx edge). From the host: `http://localhost:5173` |
| `VU_SCALE` | 1 | Multiplies every VU count of load, stress, spike, soak |
| `POOL_SIZE` | 20 | Viewers created in `setup()` |
| `THINK_TIME` | 1 | Average pause between viewer actions (seconds) |
| `PIPELINE_TIMEOUT_S` | 240 | How long to wait for a video to become READY |
| `DURATION` | per test | soak, pipeline |
| `MAX_RATE` | 300 | arrival-rate ceiling for breakpoint |
| `CHECK_DIRECT` | true | smoke: also probe every service's `/actuator/health` (works inside the Docker network) |
| `SAMPLE_VIDEO` | `/tests/data/sample.mp4` | video used for uploads |
| `S3_FETCH_BASE` | `http://minio:9000` (set by `run.sh`) | pre-signed URLs name `localhost:9000`, which k6 inside Docker cannot reach; this host is used instead, with the original `Host` header so the signature stays valid |

## Pass / fail criteria

Thresholds are in each script and mirror the SLOs on the Grafana dashboard. For `load` and `soak`: p95 < 800 ms (target 500 ms), p99 < 1.5 s, < 1 % failed requests, > 98 % checks. k6 exits non-zero when a threshold fails, so `./tests/run.sh smoke` works as a deploy gate in CI.

## Reading the results

- **Latency rises before errors do.** Find the load level where p95 starts climbing, then look at the "What the system did meanwhile" row of the k6 dashboard. The first container to hit its CPU limit (Java services are capped at 1 CPU in `docker-compose.yml`) is the bottleneck. Login (bcrypt) is the most CPU-hungry call.
- **Database layer:** the MySQL dashboard shows `SELECT` statements per server. Reads from the catalog should land on the replicas, writes on the primary. If every read hits the primary, ProxySQL has taken the replicas out of rotation (check replication lag).
- **Connection pools:** "Hikari pool connections in use" against the ProxySQL backend connections shows the multiplexing: many application connections, few MySQL connections.
- **Kafka lag growing while HTTP stays fast** means uploads are accepted faster than FFmpeg can encode them.
- To measure the application instead of the container caps, remove the `deploy:` limits in `docker-compose.yml`.

## Layout

```
tests/
  run.sh  cleanup.sh  cleanup-perf-data.sql
  smoke.js  load.js  stress.js  spike.js  soak.js  breakpoint.js  pipeline.js
  lib/  config.js (settings, thresholds)   api.js (one function per endpoint)
        session.js (setup: admin, viewers, sample movie)   pipeline.js (upload -> READY, custom metrics)
        journeys.js (viewer behaviour)
  data/sample.mp4     12 s test clip
  results/            summaries of each run (git-ignored)
```
