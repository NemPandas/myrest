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
