import { check } from 'k6';
import { ADMIN_EMAIL, ADMIN_PASSWORD, PERF_PASSWORD, POOL_SIZE, RUN_ID, USER_DOMAIN } from './config.js';
import { login, register } from './api.js';
import { ensureSampleMovie } from './pipeline.js';

/**
 * Runs once in setup(): an admin token, POOL_SIZE viewers (perf-<run>-<n>@loadtest.local) and one playable movie.
 * Registration is bcrypt-heavy, so it is kept out of the measured traffic (requests are tagged phase=provision).
 */
export function setupContext(size = POOL_SIZE) {
  const adminLogin = login(ADMIN_EMAIL, ADMIN_PASSWORD, 'provision');
  if (!check(adminLogin, { 'provision: admin login (200)': (r) => r.status === 200 })) {
    throw new Error(`Admin login failed (HTTP ${adminLogin.status}). Is the stack up and seeded? ${adminLogin.body}`);
  }
  const adminToken = adminLogin.json('token');

  const viewers = [];
  for (let i = 0; i < size; i++) {
    const email = `perf-${RUN_ID}-${i}@${USER_DOMAIN}`;
    const res = register(`Perf Viewer ${i}`, email, PERF_PASSWORD, 'provision');
    if (!check(res, { 'provision: viewer registered (201)': (r) => r.status === 201 })) {
      throw new Error(`Cannot register ${email}: HTTP ${res.status} ${res.body}`);
    }
    viewers.push({ email, token: res.json('token') });
  }

  const sampleMovieId = ensureSampleMovie(adminToken);
  if (!sampleMovieId) console.warn('No playable sample movie: the watch steps are skipped (is the encoding pipeline healthy?)');
  return { adminToken, viewers, sampleMovieId };
}

export const pickViewer = (ctx) => ctx.viewers[Math.floor(Math.random() * ctx.viewers.length)];
