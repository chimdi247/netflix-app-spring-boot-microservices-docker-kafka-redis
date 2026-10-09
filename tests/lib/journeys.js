import { check, sleep } from 'k6';
import { PERF_PASSWORD, THINK_TIME } from './config.js';
import { fetchSigned, getSignedPlaylist, getStream, getMovie, listMovies, login, moviesByGenre, searchMovies } from './api.js';
import { pickViewer } from './session.js';

const GENRES = ['ACTION', 'COMEDY', 'DRAMA', 'HORROR', 'THRILLER', 'ROMANCE', 'DOCUMENTARY', 'ANIMATION', 'SCI_FI'];
const WORDS = ['neon', 'night', 'k6', 'static', 'the', 'long', 'sample'];
const rand = (arr) => arr[Math.floor(Math.random() * arr.length)];
const think = () => sleep(Math.max(0.1, THINK_TIME * (0.5 + Math.random())));

/** Opening the app: the whole catalog (served by the MySQL replicas through ProxySQL). */
export function browse(v) {
  const res = listMovies(v.token);
  check(res, { 'catalog (200)': (r) => r.status === 200 });
}

/** Typing in the search box and clicking a genre chip. */
export function searchAndFilter(v) {
  check(searchMovies(v.token, rand(WORDS)), { 'search (200)': (r) => r.status === 200 });
  check(moviesByGenre(v.token, rand(GENRES)), { 'genre (200)': (r) => r.status === 200 });
}

/**
 * Pressing play, like the browser player: stream URL (Redis-cached) -> master playlist from the object store ->
 * a variant playlist through the streaming-service (segment URLs signed) -> first segment from the object store.
 */
export function watch(v, movieId) {
  if (!movieId) return;
  check(getMovie(v.token, movieId), { 'movie details (200)': (r) => r.status === 200 });

  const stream = getStream(v.token, movieId);
  if (!check(stream, { 'stream url (200)': (r) => r.status === 200 })) return;

  const master = fetchSigned(stream.json('streamingUrl'), 'minio.master_playlist');
  if (!check(master, { 'master playlist (200, HLS)': (r) => r.status === 200 && String(r.body).indexOf('#EXTM3U') === 0 })) return;

  const variant = getSignedPlaylist(v.token, movieId, `encoded/${movieId}/360p/playlist.m3u8`);
  if (!check(variant, { 'signed playlist (200)': (r) => r.status === 200 })) return;

  const segment = String(variant.body).split('\n').find((l) => l.indexOf('http') === 0);
  if (segment) {
    check(fetchSigned(segment.trim(), 'minio.segment', true), { 'segment (200)': (r) => r.status === 200 });
  }
}

export function signIn(v) {
  check(login(v.email, PERF_PASSWORD), { 'login (200)': (r) => r.status === 200 });
}

/** One iteration of realistic viewer traffic: 55 % browse, 20 % search/filter, 20 % watch, 5 % login (bcrypt). */
export function mixedIteration(ctx) {
  const v = pickViewer(ctx);
  const roll = Math.random();
  if (roll < 0.55) browse(v);
  else if (roll < 0.75) searchAndFilter(v);
  else if (roll < 0.95) watch(v, ctx.sampleMovieId);
  else signIn(v);
  think();
}
