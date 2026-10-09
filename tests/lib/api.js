import http from 'k6/http';
import { API, BASE_URL, S3_FETCH_BASE } from './config.js';

const JSON_HEADERS = { 'Content-Type': 'application/json' };

// `name` groups URLs with ids into one metric series; `phase` separates provisioning from the measured traffic.
function params(name, token, phase, extra) {
  const headers = Object.assign({}, JSON_HEADERS);
  if (token) headers.Authorization = `Bearer ${token}`;
  return Object.assign({ headers, tags: { name, phase } }, extra || {});
}
const body = (o) => JSON.stringify(o);

// ---- health --------------------------------------------------------------------------------
export const health = (url) => http.get(`${url}/actuator/health`, { tags: { name: 'health', phase: 'steady' } });
export const edgeHealth = () => http.get(`${BASE_URL}/healthz`, { tags: { name: 'edge.health', phase: 'steady' } });

// ---- auth ----------------------------------------------------------------------------------
export const login = (email, password, phase = 'steady', extra) =>
  http.post(`${API}/auth/login`, body({ email, password }), params('auth.login', null, phase, extra));

export const register = (fullName, email, password, phase = 'steady', extra) =>
  http.post(`${API}/auth/register`, body({ fullName, email, password }), params('auth.register', null, phase, extra));

export const me = (token) => http.get(`${API}/auth/me`, params('auth.me', token, 'steady'));

// ---- catalog -------------------------------------------------------------------------------
export const listMovies = (token, extra) => http.get(`${API}/movies`, params('movies.list', token, 'steady', extra));
export const getMovie = (token, id, phase = 'steady', extra) => http.get(`${API}/movies/${id}`, params('movies.get', token, phase, extra));
export const moviesByGenre = (token, genre) => http.get(`${API}/movies/genre/${genre}`, params('movies.genre', token, 'steady'));
export const searchMovies = (token, title) => http.get(`${API}/movies/search?title=${encodeURIComponent(title)}`, params('movies.search', token, 'steady'));

export const createMovie = (token, movie, phase = 'steady', extra) =>
  http.post(`${API}/movies`, body(movie), params('movies.create', token, phase, extra));

export const deleteMovie = (token, id, phase = 'steady', extra) =>
  http.del(`${API}/movies/${id}`, null, params('movies.delete', token, phase, extra));

// ---- video upload (multipart; `file` is a k6 http.file) ---------------------------------------
export function uploadVideo(token, movieId, file, phase = 'steady', extra) {
  const headers = { Authorization: `Bearer ${token}` }; // no Content-Type: k6 adds the multipart boundary
  return http.post(`${API}/videos/upload/${movieId}`, { file }, Object.assign({ headers, tags: { name: 'videos.upload', phase }, timeout: '300s' }, extra || {}));
}

// ---- streaming -----------------------------------------------------------------------------
export const getStream = (token, movieId, extra) => http.get(`${API}/stream/${movieId}`, params('stream.url', token, 'steady', extra));

export const getSignedPlaylist = (token, movieId, path, extra) =>
  http.get(`${API}/stream/${movieId}/playlist?path=${encodeURIComponent(path)}`, params('stream.playlist', token, 'steady', extra));

/**
 * GET a pre-signed object-store URL (master playlist, segment). Goes straight to the store, like a browser.
 * Inside Docker the URL's host (localhost:9000) is replaced by S3_FETCH_BASE, keeping the original Host header.
 */
export function fetchSigned(url, name, binary = false) {
  const m = url.match(/^(https?:\/\/[^/]+)(\/.*)$/);
  const p = { tags: { name, phase: 'steady' } };
  if (binary) p.responseType = 'none';
  if (S3_FETCH_BASE && m) {
    p.headers = { Host: m[1].replace(/^https?:\/\//, '') };
    return http.get(`${S3_FETCH_BASE}${m[2]}`, p);
  }
  return http.get(url, p);
}
