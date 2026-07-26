-- Connect-T additive migration: Feed comments and supporting indexes
-- Date: 2026-07-26
-- Safety: additive only; no existing rows are deleted or rewritten.
-- Apply after taking a full MySQL backup.

CREATE TABLE IF NOT EXISTS schema_migrations (
  migration_key VARCHAR(120) PRIMARY KEY,
  applied_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS feed_post_comments (
  id VARCHAR(80) NOT NULL PRIMARY KEY,
  post_id VARCHAR(80) NOT NULL,
  author_id VARCHAR(80) NOT NULL,
  author_name VARCHAR(190) NOT NULL,
  author_role VARCHAR(40) NOT NULL,
  avatar_color VARCHAR(40) NULL,
  content VARCHAR(1000) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  KEY idx_feed_comment_post (post_id, created_at),
  KEY idx_feed_comment_author (author_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- These tables are created by older production migrations/runtime schema
-- checks. Re-declaring them makes this migration independently rerunnable.
CREATE TABLE IF NOT EXISTS feed_subscriptions (
  id BIGINT NOT NULL AUTO_INCREMENT,
  subscriber_id VARCHAR(80) NOT NULL,
  target_user_id VARCHAR(80) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uniq_feed_subscription (subscriber_id, target_user_id),
  KEY idx_feed_subscriber (subscriber_id),
  KEY idx_feed_target (target_user_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS feed_user_blocks (
  id BIGINT NOT NULL AUTO_INCREMENT,
  user_id VARCHAR(80) NOT NULL,
  blocked_user_id VARCHAR(80) NOT NULL,
  blocked_until BIGINT NOT NULL,
  reason VARCHAR(190) NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uniq_feed_block (user_id, blocked_user_id),
  KEY idx_feed_block_user (user_id),
  KEY idx_feed_block_until (blocked_until)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT IGNORE INTO schema_migrations (migration_key)
VALUES ('20260726_feed_comments_and_audit_hardening');
