-- Connect-T broadcast media migration
-- Additive only. Existing broadcasts and receipts remain unchanged.

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
