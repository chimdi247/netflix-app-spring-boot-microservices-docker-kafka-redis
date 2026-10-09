// SMOKE TEST: one pass through every feature, as admin, as viewer and as a new user.
// Question it answers: "is the system up, is access control right, and does the whole pipeline work?"
// Run it first, and after every deploy. Takes about a minute (the encoding of the sample clip dominates).
import http from 'k6/http';
import { check, group } from 'k6';
import { ADMIN_EMAIL, ADMIN_PASSWORD, CHECK_DIRECT, DIRECT, PERF_PASSWORD, RUN_ID, USER_DOMAIN, VIEWER_EMAIL, VIEWER_PASSWORD } from './lib/config.js';
import {
  createMovie, deleteMovie, edgeHealth, fetchSigned, getMovie, getSignedPlaylist, getStream, health, listMovies,
  login, me, moviesByGenre, register, searchMovies, uploadVideo,
} from './lib/api.js';
import { newMovie, runPipeline, sampleFile } from './lib/pipeline.js';

export const options = {
  vus: 1,
  iterations: 1,
  setupTimeout: '60s',
  thresholds: {
    checks: ['rate==1'],                       // every functional check must pass
    http_req_failed: ['rate<0.01'],            // deliberate 4xx are declared as expected below
    http_req_duration: ['p(95)<3000'],
  },
};

const refused = (...codes) => ({ responseCallback: http.expectedStatuses(...codes) });

export default function () {
  let admin;
  let viewer;
  let fresh;

  group('1. health', () => {
    check(edgeHealth(), { 'edge (nginx) /healthz (200)': (r) => r.status === 200 });
    if (CHECK_DIRECT) {
      for (const [name, url] of Object.entries(DIRECT)) {
        check(health(url), { [`${name} /actuator/health (200)`]: (r) => r.status === 200 });
      }
    }
  });

  group('2. authentication', () => {
    const bad = login(ADMIN_EMAIL, 'wrong-password', 'steady', refused(401));
    check(bad, { 'wrong password is refused (401)': (r) => r.status === 401 });

    const a = login(ADMIN_EMAIL, ADMIN_PASSWORD);
    check(a, { 'seeded admin can log in (200)': (r) => r.status === 200, 'token returned': (r) => !!r.json('token'), 'role is ADMIN': (r) => r.json('user.role') === 'ADMIN' });
    admin = a.json('token');

    const v = login(VIEWER_EMAIL, VIEWER_PASSWORD);
    check(v, { 'seeded viewer can log in (200)': (r) => r.status === 200, 'role is USER': (r) => r.json('user.role') === 'USER' });
    viewer = v.json('token');

    const email = `perf-${RUN_ID}-smoke@${USER_DOMAIN}`;
    const reg = register('Smoke Tester', email, PERF_PASSWORD);
    check(reg, { 'registration (201)': (r) => r.status === 201, 'self-registered users are USER': (r) => r.json('user.role') === 'USER' });
    fresh = reg.json('token');
    check(register('Smoke Tester', email, PERF_PASSWORD, 'steady', refused(409)), { 'duplicate email is refused (409)': (r) => r.status === 409 });
    check(register('X', 'not-an-email', 'short', 'steady', refused(400)), { 'invalid registration is refused (400)': (r) => r.status === 400 });

    const who = me(fresh);
    check(who, { '/auth/me (200)': (r) => r.status === 200, 'me returns the e-mail': (r) => r.json('email') === email });
  });

  group('3. access control at the edge', () => {
    check(listMovies(null, refused(401)), { 'no token -> 401': (r) => r.status === 401 });
    check(listMovies('not.a.token', refused(401)), { 'forged token -> 401': (r) => r.status === 401 });
    check(listMovies(viewer), { 'viewer can read the catalog (200)': (r) => r.status === 200 });
    check(createMovie(viewer, newMovie('k6 forbidden'), 'steady', refused(403)), { 'viewer cannot add movies (403)': (r) => r.status === 403 });
    check(uploadVideo(viewer, 'any-id', sampleFile(), 'steady', refused(403)), { 'viewer cannot upload videos (403)': (r) => r.status === 403 });
    check(deleteMovie(viewer, 'any-id', 'steady', refused(403)), { 'viewer cannot delete movies (403)': (r) => r.status === 403 });
  });

  group('4. catalog (admin)', () => {
    const created = createMovie(admin, newMovie(`k6 smoke ${RUN_ID}`, 'COMEDY'));
    check(created, { 'movie created (201)': (r) => r.status === 201, 'starts as PENDING': (r) => r.json('videoStatus') === 'PENDING' });
    const id = created.json('id');

    check(getMovie(admin, id), { 'get by id (200)': (r) => r.status === 200 });
    check(searchMovies(admin, `k6 smoke ${RUN_ID}`), { 'search finds it': (r) => r.status === 200 && r.json().some((m) => m.id === id) });
    check(moviesByGenre(admin, 'COMEDY'), { 'genre filter finds it': (r) => r.status === 200 && r.json().some((m) => m.id === id) });
    check(createMovie(admin, { title: '' }, 'steady', refused(400)), { 'invalid movie is refused (400)': (r) => r.status === 400 });

    check(deleteMovie(admin, id, 'steady', refused(204)), { 'delete (204)': (r) => r.status === 204 });
    check(getMovie(admin, id, 'steady', refused(404)), { 'deleted movie -> 404': (r) => r.status === 404 });
    check(deleteMovie(admin, id, 'steady', refused(404)), { 'deleting again -> 404': (r) => r.status === 404 });
  });

  group('5. video pipeline: upload -> Kafka -> FFmpeg -> object store -> READY', () => {
    const { movieId, status } = runPipeline(admin, `k6 smoke video ${RUN_ID}`);
    check(status, { 'encoding finishes with READY': (s) => s === 'READY' });
    if (status !== 'READY') return;

    const stream = getStream(viewer, movieId);
    check(stream, { 'viewer gets a stream URL (200)': (r) => r.status === 200, 'URL is pre-signed': (r) => String(r.json('streamingUrl')).indexOf('X-Amz-Signature') > 0 });

    const master = fetchSigned(stream.json('streamingUrl'), 'minio.master_playlist');
    check(master, {
      'master playlist loads from the object store (200)': (r) => r.status === 200,
      'master lists 4 renditions': (r) => String(r.body).split('\n').filter((l) => l.indexOf('playlist.m3u8') >= 0).length === 4,
    });

    const variant = getSignedPlaylist(viewer, movieId, `encoded/${movieId}/720p/playlist.m3u8`);
    check(variant, { 'signed variant playlist (200)': (r) => r.status === 200, 'segments are pre-signed URLs': (r) => String(r.body).indexOf('X-Amz-Signature') > 0 });
    const segment = String(variant.body).split('\n').find((l) => l.indexOf('http') === 0);
    check(fetchSigned(String(segment).trim(), 'minio.segment', true), { 'video segment loads (200)': (r) => r.status === 200 });

    // the playlist endpoint must only sign playlists of THIS movie
    check(getSignedPlaylist(viewer, movieId, `raw/${movieId}/video.mp4`, refused(400)), { 'raw uploads cannot be signed (400)': (r) => r.status === 400 });
    check(getSignedPlaylist(viewer, movieId, `encoded/other-movie/master.m3u8`, refused(400)), { 'other movies cannot be signed (400)': (r) => r.status === 400 });

    deleteMovie(admin, movieId, 'steady', refused(204));
  });

  group('6. streaming a movie that is not ready', () => {
    const created = createMovie(admin, newMovie(`k6 smoke pending ${RUN_ID}`));
    const id = created.json('id');
    check(getStream(viewer, id, refused(404)), { 'no video yet -> 404': (r) => r.status === 404 });
    deleteMovie(admin, id, 'steady', refused(204));
  });
}
