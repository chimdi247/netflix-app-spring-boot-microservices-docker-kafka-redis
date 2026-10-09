// BREAKPOINT (CAPACITY) TEST: raise the request rate steadily until the system breaks.
// Question it answers: "how many requests per second can we sustain before the SLO is lost?"
// Uses an open model (arrival rate), so load keeps rising even when responses slow down.
// The run stops itself as soon as p95 latency exceeds 1.5 s or errors exceed 5 %; the rate reached at that
// moment (Grafana, k6 dashboard: requests / s) is the capacity of this setup.
// Read-only mix (catalog, search, genre): it measures edge + auth check + content-service + ProxySQL/replicas.
// Raise the ceiling with -e MAX_RATE=800.
import { setupContext, pickViewer } from './lib/session.js';
import { browse, searchAndFilter } from './lib/journeys.js';

const MAX_RATE = Number(__ENV.MAX_RATE || 300);

export const options = {
  setupTimeout: '300s',
  scenarios: {
    breakpoint: {
      executor: 'ramping-arrival-rate',
      startRate: 10,
      timeUnit: '1s',
      preAllocatedVUs: 100,
      maxVUs: 1000,
      stages: [{ duration: '10m', target: MAX_RATE }],
    },
  },
  thresholds: {
    'http_req_duration{phase:steady}': [{ threshold: 'p(95)<1500', abortOnFail: true, delayAbortEval: '30s' }],
    'http_req_failed{phase:steady}': [{ threshold: 'rate<0.05', abortOnFail: true, delayAbortEval: '30s' }],
    dropped_iterations: [{ threshold: 'count<1000', abortOnFail: true }],  // k6 itself can no longer keep up
  },
};

export const setup = () => setupContext();

export default (ctx) => {
  const v = pickViewer(ctx);
  if (Math.random() < 0.7) browse(v);
  else searchAndFilter(v);
};
