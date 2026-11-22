-- MySQL 8.0.16+. Run inside the empty database selected for MyRest.
SET NAMES utf8mb4;
SET SESSION time_zone = '+00:00';

CREATE TABLE admin_users (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    email VARCHAR(254) NOT NULL,
    password_hash VARCHAR(255) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
    role ENUM('owner', 'editor') NOT NULL,
    disabled_at DATETIME(6) NULL,
    created_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    UNIQUE KEY uq_admin_email (email)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_as_ci;

CREATE TABLE admin_invites (
    token_hash BINARY(32) PRIMARY KEY,
    email VARCHAR(254) NOT NULL,
    role ENUM('owner', 'editor') NOT NULL,
    invited_by BIGINT UNSIGNED NOT NULL,
    expires_at DATETIME(6) NOT NULL,
    used_at DATETIME(6) NULL,
    revoked_at DATETIME(6) NULL,
    created_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    FOREIGN KEY (invited_by) REFERENCES admin_users (id),
    KEY ix_invites_expiry (expires_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_as_ci;

CREATE TABLE admin_sessions (
    token_hash BINARY(32) PRIMARY KEY,
    admin_id BIGINT UNSIGNED NOT NULL,
    expires_at DATETIME(6) NOT NULL,
    revoked_at DATETIME(6) NULL,
    created_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    FOREIGN KEY (admin_id) REFERENCES admin_users (id),
    KEY ix_sessions_expiry (expires_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE products (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    slug VARCHAR(160) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
    model_code VARCHAR(80) NOT NULL,
    name VARCHAR(180) NOT NULL,
    massage_level VARCHAR(40) NULL,
    summary VARCHAR(500) NULL,
    description TEXT NULL,
    features JSON NULL,
    specifications JSON NULL,
    source_url VARCHAR(2048) NULL,
    seo_title VARCHAR(180) NULL,
    seo_description VARCHAR(320) NULL,
    gross_price_huf INT UNSIGNED NULL,
    status ENUM('draft', 'published') NOT NULL DEFAULT 'draft',
    sort_order INT UNSIGNED NOT NULL DEFAULT 0,
    version INT UNSIGNED NOT NULL DEFAULT 1,
    deleted_at DATETIME(6) NULL,
    created_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    updated_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
    UNIQUE KEY uq_product_slug (slug),
    UNIQUE KEY uq_product_model_code (model_code),
    KEY ix_public_catalog (status, deleted_at, sort_order, id),
    CONSTRAINT ck_product_price CHECK (gross_price_huf > 0),
    CONSTRAINT ck_product_features CHECK (JSON_TYPE(features) = 'ARRAY'),
    CONSTRAINT ck_product_specs CHECK (JSON_TYPE(specifications) = 'ARRAY'),
    CONSTRAINT ck_product_publication CHECK (
        status = 'draft' OR (deleted_at IS NULL AND gross_price_huf IS NOT NULL
            AND summary IS NOT NULL AND description IS NOT NULL)
    )
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE product_images (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    product_id BIGINT UNSIGNED NOT NULL,
    url VARCHAR(2048) NOT NULL,
    alt_text VARCHAR(255) NOT NULL,
    sort_order INT UNSIGNED NOT NULL DEFAULT 0,
    FOREIGN KEY (product_id) REFERENCES products (id),
    KEY ix_product_images_order (product_id, sort_order, id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE product_variants (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    product_id BIGINT UNSIGNED NOT NULL,
    code VARCHAR(80) NOT NULL,
    color_name VARCHAR(100) NOT NULL,
    color_hex CHAR(7) CHARACTER SET ascii COLLATE ascii_bin NULL,
    sort_order INT UNSIGNED NOT NULL DEFAULT 0,
    disabled_at DATETIME(6) NULL,
    FOREIGN KEY (product_id) REFERENCES products (id),
    UNIQUE KEY uq_variant_code (product_id, code),
    KEY ix_variant_order (product_id, disabled_at, sort_order, id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE product_audit_log (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    product_id BIGINT UNSIGNED NOT NULL,
    admin_id BIGINT UNSIGNED NOT NULL,
    action ENUM('create', 'update', 'publish', 'unpublish', 'delete', 'restore') NOT NULL,
    product_version INT UNSIGNED NOT NULL,
    created_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    FOREIGN KEY (product_id) REFERENCES products (id),
    FOREIGN KEY (admin_id) REFERENCES admin_users (id),
    UNIQUE KEY uq_product_audit_version (product_id, product_version)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- Additive migration: existing Hungarian product fields and publication states stay intact.
-- Run once with CREATE permission in the selected MyRest database.
CREATE TABLE IF NOT EXISTS product_translations (
    product_id BIGINT UNSIGNED NOT NULL PRIMARY KEY,
    language CHAR(2) CHARACTER SET ascii COLLATE ascii_bin NOT NULL DEFAULT 'de',
    content JSON NOT NULL,
    status ENUM('draft', 'published') NOT NULL DEFAULT 'draft',
    FOREIGN KEY (product_id) REFERENCES products (id),
    CONSTRAINT ck_translation_language CHECK (language = 'de'),
    CONSTRAINT ck_translation_content CHECK (JSON_TYPE(content) = 'OBJECT')
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE IF NOT EXISTS orders (
 id CHAR(39) CHARACTER SET ascii COLLATE ascii_bin PRIMARY KEY,
 request_key CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL UNIQUE,
 request_hash CHAR(64) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
 snapshot JSON NOT NULL,
 status ENUM('awaiting_transfer','paid') NOT NULL DEFAULT 'awaiting_transfer',
 created_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
CREATE TABLE IF NOT EXISTS order_emails (
 order_id CHAR(39) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
 kind ENUM('customer','owner') NOT NULL,
 sent_at DATETIME(6) NULL,
 attempts INT UNSIGNED NOT NULL DEFAULT 0,
 next_attempt_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
 PRIMARY KEY(order_id, kind),
 FOREIGN KEY(order_id) REFERENCES orders(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
