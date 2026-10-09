// SOAK (ENDURANCE) TEST: moderate load for a long time.
// Question it answers: "does anything leak or degrade over hours: JVM heap, DB connections, Kafka lag, Redis memory?"
// Default: 10 VUs for 30 minutes. Use -e DURATION=4h for a real soak.
// Watch in Grafana: JVM heap trend and GC time, HikariCP pools, ProxySQL connections, container memory, p95 over time.
import { setupContext } from './lib/session.js';
import { mixedIteration } from './lib/journeys.js';
import { thresholds, vus } from './lib/config.js';

export const options = {
  setupTimeout: '300s',
  scenarios: {
    soak: {
      executor: 'constant-vus',
      vus: vus(Number(__ENV.SOAK_VUS || 10)),
      duration: __ENV.DURATION || '30m',
      gracefulStop: '30s',
    },
  },
  thresholds: thresholds({ p95: 800, p99: 1500, failed: 0.01 }),
};

export const setup = () => setupContext();
export default (ctx) => mixedIteration(ctx);
