// PIPELINE TEST: how long does it take until an uploaded video is playable?
// A video travels: upload -> video-service -> Kafka (video.uploaded) -> encoding-service (FFmpeg, 4 renditions)
// -> object store -> Kafka (video.encoded) -> content-service + streaming-service. This test uploads the sample clip
// at a constant, low rate and measures upload-finished -> READY (metric pipeline_ready_time).
//
// Encoding is CPU-bound and the encoding-service handles one video at a time, so this is the test that shows
// Kafka consumer lag build up when uploads arrive faster than they can be encoded (Grafana: Kafka dashboard).
//
//   default: 1 upload every 20 seconds for 3 minutes (override: -e RATE_EVERY_S=10 -e DURATION=5m)
import { ADMIN_EMAIL, ADMIN_PASSWORD, RUN_ID } from './lib/config.js';
import { login } from './lib/api.js';
import { runPipeline } from './lib/pipeline.js';

const EVERY_S = Number(__ENV.RATE_EVERY_S || 20);

export const options = {
  setupTimeout: '60s',
  scenarios: {
    uploads: {
      executor: 'constant-arrival-rate',
      rate: 1,
      timeUnit: `${EVERY_S}s`,
      duration: __ENV.DURATION || '3m',
      preAllocatedVUs: 5,
      maxVUs: 50,
    },
  },
  thresholds: {
    pipeline_ready_time: [`p(95)<${Number(__ENV.READY_P95_MS || 120000)}`],
    pipelines_failed: ['count==0'],
    pipelines_timed_out: ['count==0'],
    checks: ['rate>0.99'],
  },
};

export function setup() {
  const res = login(ADMIN_EMAIL, ADMIN_PASSWORD, 'provision');
  if (res.status !== 200) throw new Error(`Admin login failed (HTTP ${res.status})`);
  return { adminToken: res.json('token') };
}

export default function (ctx) {
  runPipeline(ctx.adminToken, `k6 pipeline ${RUN_ID} ${__VU}-${__ITER}`, { cleanup: true });
}
