-- =============================================================================
-- Admin login for the first start
--
--     email    : admin@example.com
--     password : password123
--
-- Only the BCrypt hash (cost 10, $2a$ prefix) is stored, never the password. It is the exact format the
-- auth-service produces and verifies (Spring's BCryptPasswordEncoder), so this user logs in like any other.
-- Generated with the system's crypt_blowfish implementation and checked against the published bcrypt
-- test vector; to create a different hash use any bcrypt tool, e.g.:
--     htpasswd -bnBC 10 "" 'new-password' | tr -d ':\n'
--
-- Idempotent: running it twice does not change an existing admin's password.
-- =============================================================================

INSERT INTO auth_db.users (email, password_hash, full_name, role, enabled)
VALUES ('admin@example.com',
        '$2a$10$ofKU8ljCo7Xv1nonZD1fZu/0.zFPXGNQ8ZMUmZep.GMimkm7juzGm',
        'Admin User',
        'ADMIN',
        1)
ON DUPLICATE KEY UPDATE email = email;
