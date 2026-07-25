-- Connect-T broadcast media migration
-- Additive only. Existing broadcasts and receipts remain unchanged.

CREATE TABLE IF NOT EXISTS broadcasts (
  id VARCHAR(80) PRIMARY KEY,
  idempotency_key VARCHAR(100) NOT NULL,
  title VARCHAR(255) NOT NULL,
  body TEXT NOT NULL,
  category VARCHAR(60) NOT NULL DEFAULT 'announcement',
  language VARCHAR(10) NOT NULL DEFAULT 'en',
  audience_role VARCHAR(30) NOT NULL DEFAULT 'all',
  ward VARCHAR(80) NULL,
  status VARCHAR(30) NOT NULL DEFAULT 'sent',
  scheduled_at DATETIME NULL,
  sent_at DATETIME NULL,
  archived_at DATETIME NULL,
  created_by VARCHAR(80) NOT NULL,
  created_by_name VARCHAR(160) NOT NULL,
  external_push_status VARCHAR(40) NOT NULL DEFAULT 'not_configured',
  external_push_message VARCHAR(255) NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uniq_broadcast_idempotency (idempotency_key),
  KEY idx_broadcast_status_schedule (status, scheduled_at),
  KEY idx_broadcast_audience (audience_role),
  KEY idx_broadcast_ward (ward)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

SET @schema_name = DATABASE();

SET @sql = IF(
  EXISTS(SELECT 1 FROM information_schema.columns WHERE table_schema = @schema_name AND table_name = 'broadcasts' AND column_name = 'media_uri'),
  'SELECT 1',
  'ALTER TABLE broadcasts ADD COLUMN media_uri TEXT NULL AFTER created_by_name'
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @sql = IF(
  EXISTS(SELECT 1 FROM information_schema.columns WHERE table_schema = @schema_name AND table_name = 'broadcasts' AND column_name = 'media_type'),
  'SELECT 1',
  'ALTER TABLE broadcasts ADD COLUMN media_type VARCHAR(20) NULL AFTER media_uri'
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @sql = IF(
  EXISTS(SELECT 1 FROM information_schema.columns WHERE table_schema = @schema_name AND table_name = 'broadcasts' AND column_name = 'media_file_name'),
  'SELECT 1',
  'ALTER TABLE broadcasts ADD COLUMN media_file_name VARCHAR(255) NULL AFTER media_type'
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @sql = IF(
  EXISTS(SELECT 1 FROM information_schema.columns WHERE table_schema = @schema_name AND table_name = 'broadcasts' AND column_name = 'media_mime_type'),
  'SELECT 1',
  'ALTER TABLE broadcasts ADD COLUMN media_mime_type VARCHAR(120) NULL AFTER media_file_name'
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @sql = IF(
  EXISTS(SELECT 1 FROM information_schema.columns WHERE table_schema = @schema_name AND table_name = 'broadcasts' AND column_name = 'media_size_bytes'),
  'SELECT 1',
  'ALTER TABLE broadcasts ADD COLUMN media_size_bytes BIGINT NULL AFTER media_mime_type'
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @sql = IF(
  EXISTS(SELECT 1 FROM information_schema.columns WHERE table_schema = @schema_name AND table_name = 'broadcasts' AND column_name = 'media_duration_seconds'),
  'SELECT 1',
  'ALTER TABLE broadcasts ADD COLUMN media_duration_seconds INT NULL AFTER media_size_bytes'
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;
