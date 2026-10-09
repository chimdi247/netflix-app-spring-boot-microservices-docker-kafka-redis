-- =============================================================================
-- Netflix platform - database schema
--
-- Executed automatically, once, the first time the MySQL PRIMARY starts with an
-- empty data volume (files in /docker-entrypoint-initdb.d run in name order).
-- Everything here is written to the binary log and therefore copied to the
-- replicas by MySQL replication, so only the primary needs these scripts.
--
-- The services run Hibernate with ddl-auto=none: THIS file owns the schema.
-- It mirrors the JPA entities (Spring Boot naming: camelCase -> snake_case).
--
-- Re-run from scratch:   docker compose down -v && docker compose up -d
-- =============================================================================

CREATE DATABASE IF NOT EXISTS auth_db    CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci;
CREATE DATABASE IF NOT EXISTS content_db CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci;

-- -----------------------------------------------------------------------------
-- auth-service  (entity com.netflix.authservice.model.User)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS auth_db.users (
    id             BIGINT       NOT NULL AUTO_INCREMENT,
    email          VARCHAR(255) NOT NULL,
    password_hash  VARCHAR(100) NOT NULL COMMENT 'BCrypt hash, never the password',
    full_name      VARCHAR(255) NOT NULL,
    role           VARCHAR(16)  NOT NULL DEFAULT 'USER',
    enabled        TINYINT(1)   NOT NULL DEFAULT 1,
    created_at     DATETIME(6)  NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    updated_at     DATETIME(6)  NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    last_login_at  DATETIME(6)  NULL,
    PRIMARY KEY (id),
    UNIQUE KEY uk_users_email (email),
    CONSTRAINT chk_users_role CHECK (role IN ('ADMIN', 'USER'))
) ENGINE = InnoDB;

-- -----------------------------------------------------------------------------
-- content-service  (entity com.netflix.contentservice.model.Movie)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS content_db.movies (
    id                VARCHAR(36)   NOT NULL COMMENT 'UUID',
    title             VARCHAR(255)  NOT NULL,
    description       VARCHAR(1000) NULL,
    genre             VARCHAR(32)   NULL COMMENT 'ACTION, COMEDY, DRAMA, HORROR, THRILLER, ROMANCE, DOCUMENTARY, ANIMATION, SCI_FI',
    director          VARCHAR(255)  NULL,
    `cast`            VARCHAR(1000) NULL,
    release_year      INT           NOT NULL DEFAULT 0,
    rating            DOUBLE        NOT NULL DEFAULT 0,
    thumbnail_url     VARCHAR(1024) NULL,
    duration_minutes  INT           NOT NULL DEFAULT 0,
    video_key         VARCHAR(512)  NULL COMMENT 'object key of the raw upload',
    hls_url           VARCHAR(1024) NULL COMMENT 'master playlist, set when encoding finished',
    video_status      VARCHAR(16)   NULL COMMENT 'PENDING, UPLOADED, ENCODING, ENCODED, READY, FAILED',
    created_at        DATETIME(6)   NULL,
    updated_at        DATETIME(6)   NULL,
    PRIMARY KEY (id),
    KEY idx_movies_genre   (genre),
    KEY idx_movies_title   (title),
    KEY idx_movies_status  (video_status),
    KEY idx_movies_created (created_at)
) ENGINE = InnoDB;
