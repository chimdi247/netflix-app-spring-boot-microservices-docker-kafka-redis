// LOAD TEST: expected everyday viewer traffic, held long enough to reach a steady state.
// Question it answers: "does the system meet its SLOs under the load we expect?"
// Default: ramp to 20 VUs, hold 5 minutes. Scale with -e VU_SCALE=2.
import { setupContext } from './lib/session.js';
import { mixedIteration } from './lib/journeys.js';
import { thresholds, vus } from './lib/config.js';

export const options = {
  setupTimeout: '300s',
  scenarios: {
    expected_load: {
      executor: 'ramping-vus',
      startVUs: 0,
      stages: [
        { duration: '1m', target: vus(20) },  // ramp up
        { duration: '5m', target: vus(20) },  // steady state
        { duration: '30s', target: 0 },       // ramp down
      ],
      gracefulRampDown: '30s',
    },
  },
  // mirrors the Grafana SLOs (target p95 < 500 ms, failure line 800 ms)
  thresholds: thresholds({ p95: 800, p99: 1500, failed: 0.01 }),
};

export const setup = () => setupContext();
export default (ctx) => mixedIteration(ctx);
