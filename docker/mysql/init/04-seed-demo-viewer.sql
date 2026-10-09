-- =============================================================================
-- OPTIONAL: a regular (non-admin) account to try the role restrictions.
--
--     email    : viewer@example.com
--     password : password123     role: USER   (can browse and watch, cannot manage the catalog)
--
-- Delete this file if you only want the admin account (then run: docker compose down -v).
-- =============================================================================

INSERT INTO auth_db.users (email, password_hash, full_name, role, enabled)
VALUES ('viewer@example.com',
        '$2a$10$ofKU8ljCo7Xv1nonZD1fZu/0.zFPXGNQ8ZMUmZep.GMimkm7juzGm',
        'Demo Viewer',
        'USER',
        1)
ON DUPLICATE KEY UPDATE email = email;
