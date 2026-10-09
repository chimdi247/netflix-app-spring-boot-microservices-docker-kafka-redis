// Shared settings for every k6 script. Override any of them with `-e NAME=value`.

// Where the traffic goes: the nginx edge (login, JWT check, routing to the services). Inside Docker: http://frontend.
export const BASE_URL = (__ENV.BASE_URL || 'http://localhost:5173').replace(/\/$/, '');
export const API = `${BASE_URL}/api/v1`;

// Pre-signed URLs point at the address the BROWSER uses for the object store (http://localhost:9000). From inside
// the k6 container that address does not exist: S3_FETCH_BASE (http://minio:9000) is used instead, with the
// original Host header so the signature stays valid. Empty = use the URL as given.
export const S3_FETCH_BASE = (__ENV.S3_FETCH_BASE || '').replace(/\/$/, '');

// Direct service health checks (smoke test only; reachable inside the Docker network, not from the host)
export const DIRECT = {
  'auth-service': __ENV.AUTH_URL || 'http://auth-service:8085',
  'content-service': __ENV.CONTENT_URL || 'http://content-service:8081',
  'video-service': __ENV.VIDEO_URL || 'http://video-service:8082',
  'encoding-service': __ENV.ENCODING_URL || 'http://encoding-service:8083',
  'streaming-service': __ENV.STREAMING_URL || 'http://streaming-service:8084',
};
export const CHECK_DIRECT = (__ENV.CHECK_DIRECT || 'true') !== 'false';

export const ADMIN_EMAIL = __ENV.ADMIN_EMAIL || 'admin@example.com';
export const ADMIN_PASSWORD = __ENV.ADMIN_PASSWORD || 'password123';
export const VIEWER_EMAIL = __ENV.VIEWER_EMAIL || 'viewer@example.com';
export const VIEWER_PASSWORD = __ENV.VIEWER_PASSWORD || 'password123';

// Test users are named perf-<run>-<n>@loadtest.local and test movies "k6 ...": ./tests/cleanup.sh removes them.
export const RUN_ID = __ENV.RUN_ID || Date.now().toString(36);
export const USER_DOMAIN = 'loadtest.local';
export const PERF_PASSWORD = 'Perf-Passw0rd!';
export const SAMPLE_MOVIE_TITLE = 'k6 sample movie';

// Video used by the upload / encoding tests (12 s test clip). Absolute path inside the k6 container.
export const SAMPLE_PATH = __ENV.SAMPLE_VIDEO || '/tests/data/sample.mp4';

// Viewers created once in setup() and shared by all virtual users
export const POOL_SIZE = Number(__ENV.POOL_SIZE || 20);
// Average pause between viewer actions, seconds
export const THINK_TIME = Number(__ENV.THINK_TIME || 1);
// How long to wait for an uploaded video to become READY
export const PIPELINE_TIMEOUT_S = Number(__ENV.PIPELINE_TIMEOUT_S || 240);

// Only requests tagged phase=steady count towards thresholds; provisioning in setup() is excluded.
export function thresholds({ p95 = 800, p99 = 1500, failed = 0.01, extra = {} } = {}) {
  return Object.assign(
    {
      'http_req_failed{phase:steady}': [`rate<${failed}`],
      'http_req_duration{phase:steady}': [`p(95)<${p95}`, `p(99)<${p99}`],
      checks: ['rate>0.98'],
    },
    extra,
  );
}

export const VU_SCALE = Number(__ENV.VU_SCALE || 1);
export const vus = (n) => Math.max(1, Math.round(n * VU_SCALE));
