-- Removes everything the performance tests created: users perf-*@loadtest.local and the movies whose title
-- starts with "k6 " (including the shared "k6 sample movie"). The seeded admin / viewer and the demo movies stay.
-- Stored video files are not touched (MinIO console: http://localhost:9001).
DELETE FROM auth_db.users    WHERE email LIKE 'perf-%@loadtest.local';
DELETE FROM content_db.movies WHERE title LIKE 'k6 %';
