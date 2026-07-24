-- Connect-T production audit migration
-- Date: 2026-07-23
-- Target: Hostinger MySQL 8 compatible database
-- Safety: additive only; no user or workflow records are deleted.

SET NAMES utf8mb4;
SET time_zone = '+00:00';

CREATE TABLE IF NOT EXISTS schema_migrations (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  migration_key VARCHAR(120) NOT NULL UNIQUE,
  applied_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

DROP PROCEDURE IF EXISTS connect_t_add_column_if_missing;
DELIMITER $$
CREATE PROCEDURE connect_t_add_column_if_missing(
  IN table_name_value VARCHAR(64),
  IN column_name_value VARCHAR(64),
  IN definition_value TEXT
)
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = DATABASE()
      AND table_name = table_name_value
      AND column_name = column_name_value
  ) THEN
    SET @alter_statement = CONCAT(
      'ALTER TABLE `', REPLACE(table_name_value, '`', ''),
      '` ADD COLUMN `', REPLACE(column_name_value, '`', ''),
      '` ', definition_value
    );
    PREPARE connect_t_statement FROM @alter_statement;
    EXECUTE connect_t_statement;
    DEALLOCATE PREPARE connect_t_statement;
  END IF;
END$$
DELIMITER ;

DROP PROCEDURE IF EXISTS connect_t_add_index_if_missing;
DELIMITER $$
CREATE PROCEDURE connect_t_add_index_if_missing(
  IN table_name_value VARCHAR(64),
  IN index_name_value VARCHAR(64),
  IN definition_value TEXT
)
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.statistics
    WHERE table_schema = DATABASE()
      AND table_name = table_name_value
      AND index_name = index_name_value
  ) THEN
    SET @index_statement = CONCAT(
      'ALTER TABLE `', REPLACE(table_name_value, '`', ''),
      '` ADD ', definition_value
    );
    PREPARE connect_t_index_statement FROM @index_statement;
    EXECUTE connect_t_index_statement;
    DEALLOCATE PREPARE connect_t_index_statement;
  END IF;
END$$
DELIMITER ;

-- Idempotent complaint submissions prevent repeated taps or network retries from
-- creating duplicate complaint records.
CALL connect_t_add_column_if_missing('complaints', 'client_request_id', 'VARCHAR(80) NULL AFTER `id`');
CALL connect_t_add_index_if_missing('complaints', 'uniq_complaints_client_request', 'UNIQUE KEY `uniq_complaints_client_request` (`client_request_id`)');

-- Existing alerts become published English content by default. Their original
-- title/body/ward/media and timestamps are preserved.
CALL connect_t_add_column_if_missing('alerts', 'language', "VARCHAR(10) NOT NULL DEFAULT 'en' AFTER `priority`");
CALL connect_t_add_column_if_missing('alerts', 'status', "VARCHAR(30) NOT NULL DEFAULT 'published' AFTER `language`");
CALL connect_t_add_column_if_missing('alerts', 'publish_at', 'DATETIME NULL AFTER `status`');
CALL connect_t_add_column_if_missing('alerts', 'archived_at', 'DATETIME NULL AFTER `publish_at`');
CALL connect_t_add_index_if_missing('alerts', 'idx_alerts_active_status', 'KEY `idx_alerts_active_status` (`is_active`, `status`)');
CALL connect_t_add_index_if_missing('alerts', 'idx_alerts_publish', 'KEY `idx_alerts_publish` (`status`, `publish_at`)');

UPDATE alerts
SET status = 'published',
    language = COALESCE(NULLIF(language, ''), 'en'),
    publish_at = COALESCE(publish_at, created_at)
WHERE status IS NULL OR status = '' OR publish_at IS NULL;

CREATE TABLE IF NOT EXISTS alert_receipts (
  alert_id VARCHAR(80) NOT NULL,
  user_id VARCHAR(80) NOT NULL,
  delivered_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  read_at DATETIME NULL,
  PRIMARY KEY (alert_id, user_id),
  KEY idx_alert_receipts_user_read (user_id, read_at),
  KEY idx_alert_receipts_alert (alert_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

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
  KEY idx_broadcast_ward (ward),
  KEY idx_broadcast_created (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS broadcast_receipts (
  broadcast_id VARCHAR(80) NOT NULL,
  user_id VARCHAR(80) NOT NULL,
  delivered_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  read_at DATETIME NULL,
  PRIMARY KEY (broadcast_id, user_id),
  KEY idx_broadcast_receipt_user_read (user_id, read_at),
  KEY idx_broadcast_receipt_broadcast (broadcast_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT IGNORE INTO schema_migrations (migration_key)
VALUES ('20260723_complete_production_audit');

DROP PROCEDURE IF EXISTS connect_t_add_column_if_missing;
DROP PROCEDURE IF EXISTS connect_t_add_index_if_missing;
