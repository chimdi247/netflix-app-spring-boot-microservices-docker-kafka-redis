import http from 'k6/http';
import { check, sleep } from 'k6';
import { Counter, Trend } from 'k6/metrics';
import { PIPELINE_TIMEOUT_S, SAMPLE_MOVIE_TITLE, SAMPLE_PATH } from './config.js';
import { createMovie, deleteMovie, getMovie, listMovies, uploadVideo } from './api.js';
import tracing from 'k6/experimental/tracing';
tracing.instrumentHTTP({ propagator: 'w3c' });

// the sample clip is read once per VU (init context)
const SAMPLE = open(SAMPLE_PATH, 'b');

// metrics shown in the Grafana k6 dashboard
export const pipelineReadyTime = new Trend('pipeline_ready_time', true); // upload finished -> movie READY
export const pipelinesReady = new Counter('pipelines_ready');
export const pipelinesFailed = new Counter('pipelines_failed');
export const pipelinesTimedOut = new Counter('pipelines_timed_out');

export const sampleFile = () => http.file(SAMPLE, 'sample.mp4', 'video/mp4');

export function newMovie(title, genre = 'DRAMA') {
  return { title, description: 'Created by a k6 test', genre, director: 'k6', cast: 'Virtual Users', releaseYear: 2024, rating: 7.5, durationMinutes: 1 };
}

/** Polls the catalog entry until encoding is done. Returns 'READY', 'FAILED' or 'timeout'. */
export function waitUntilReady(token, movieId, phase = 'steady', timeoutS = PIPELINE_TIMEOUT_S) {
  const start = Date.now();
  while ((Date.now() - start) / 1000 < timeoutS) {
    const res = getMovie(token, movieId, phase);
    if (res.status === 200) {
      const status = res.json('videoStatus');
      if (status === 'READY' || status === 'FAILED') return status;
    }
    sleep(2);
  }
  return 'timeout';
}

/** create movie -> upload sample -> wait until READY, measuring the time. Returns { movieId, status }. */
export function runPipeline(adminToken, title, { phase = 'steady', cleanup = false } = {}) {
  const created = createMovie(adminToken, newMovie(title), phase);
  if (!check(created, { 'movie created (201)': (r) => r.status === 201 })) return { movieId: null, status: 'create-failed' };
  const movieId = created.json('id');

  const up = uploadVideo(adminToken, movieId, sampleFile(), phase);
  if (!check(up, { 'video uploaded (200)': (r) => r.status === 200 })) return { movieId, status: 'upload-failed' };

  const start = Date.now();
  const status = waitUntilReady(adminToken, movieId, phase);
  const elapsed = Date.now() - start;

  if (status === 'READY') {
    pipelineReadyTime.add(elapsed);
    pipelinesReady.add(1);
  } else if (status === 'FAILED') {
    pipelinesFailed.add(1);
  } else {
    pipelinesTimedOut.add(1);
  }
  if (cleanup) deleteMovie(adminToken, movieId, phase);
  return { movieId, status };
}

/**
 * Makes sure one playable movie exists for the viewer tests: reuses "k6 sample movie" if it is READY,
 * otherwise creates it (this takes about a minute). Returns its id, or null if the pipeline does not work.
 */
export function ensureSampleMovie(adminToken) {
  const list = listMovies(adminToken, { tags: { name: 'movies.list', phase: 'provision' } });
  if (list.status === 200) {
    const hit = list.json().find((m) => m.title === SAMPLE_MOVIE_TITLE && m.videoStatus === 'READY');
    if (hit) return hit.id;
  }
  const { movieId, status } = runPipeline(adminToken, SAMPLE_MOVIE_TITLE, { phase: 'provision' });
  return status === 'READY' ? movieId : null;
}
