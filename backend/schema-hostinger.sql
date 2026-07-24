-- Connect-T complete Hostinger MySQL schema
-- Safe for a fresh database. Also adds missing columns to existing tables.
-- Run in phpMyAdmin inside the selected Hostinger database.

SET NAMES utf8mb4;
SET time_zone = '+00:00';

CREATE TABLE IF NOT EXISTS schema_migrations (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  migration_key VARCHAR(120) NOT NULL UNIQUE,
  applied_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS users (
  id VARCHAR(80) PRIMARY KEY,
  name VARCHAR(160) NOT NULL,
  mobile VARCHAR(20) NOT NULL,
  role VARCHAR(30) NOT NULL DEFAULT 'citizen',
  ward VARCHAR(80) NULL,
  ward_code VARCHAR(20) NULL,
  ward_number VARCHAR(20) NULL,
  official_designation VARCHAR(100) NULL,
  ward_changed TINYINT(1) NOT NULL DEFAULT 0,
  is_super_admin TINYINT(1) NOT NULL DEFAULT 0,
  approval_status VARCHAR(30) NOT NULL DEFAULT 'approved',
  age INT NULL,
  dob VARCHAR(40) NULL,
  email VARCHAR(190) NULL,
  address TEXT NULL,
  nagarsevak_id VARCHAR(80) NULL,
  avatar_color VARCHAR(40) NULL,
  profile_photo LONGTEXT NULL,
  notify_email TINYINT(1) NOT NULL DEFAULT 0,
  notify_whatsapp TINYINT(1) NOT NULL DEFAULT 0,
  office_address TEXT NULL,
  residence_address TEXT NULL,
  office_timings VARCHAR(160) NULL,
  contact_name VARCHAR(160) NULL,
  contact_number VARCHAR(30) NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  last_login_at DATETIME NULL,
  UNIQUE KEY uniq_users_mobile_role (mobile, role),
  KEY idx_users_role (role),
  KEY idx_users_mobile (mobile),
  KEY idx_users_ward_code (ward_code),
  KEY idx_users_approval_status (approval_status),
  KEY idx_users_nagarsevak_id (nagarsevak_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS complaints (
  id VARCHAR(100) PRIMARY KEY,
  client_request_id VARCHAR(80) NULL,
  title VARCHAR(255) NOT NULL,
  description TEXT NOT NULL,
  category VARCHAR(80) NOT NULL DEFAULT 'other',
  photo_url LONGTEXT NULL,
  location TEXT NOT NULL,
  ward VARCHAR(80) NOT NULL,
  ward_code VARCHAR(20) NULL,
  assigned_officer_id VARCHAR(80) NULL,
  user_id VARCHAR(80) NULL,
  user_name VARCHAR(160) NULL,
  user_mobile VARCHAR(20) NULL,
  user_address TEXT NULL,
  user_age INT NULL,
  user_email VARCHAR(190) NULL,
  user_dob VARCHAR(40) NULL,
  user_profile_photo LONGTEXT NULL,
  latitude DECIMAL(10,7) NULL,
  longitude DECIMAL(10,7) NULL,
  location_accuracy DECIMAL(10,2) NULL,
  status VARCHAR(40) NOT NULL DEFAULT 'submitted',
  assigned_to VARCHAR(160) NULL,
  resolved_note TEXT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uniq_complaints_client_request (client_request_id),
  KEY idx_complaints_user_mobile (user_mobile),
  KEY idx_complaints_user_id (user_id),
  KEY idx_complaints_ward_code (ward_code),
  KEY idx_complaints_officer (assigned_officer_id),
  KEY idx_complaints_status (status),
  KEY idx_complaints_category (category),
  KEY idx_complaints_created_at (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS complaint_status_updates (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  complaint_id VARCHAR(100) NOT NULL,
  status VARCHAR(40) NOT NULL,
  note TEXT NULL,
  updated_by VARCHAR(160) NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  KEY idx_status_updates_complaint (complaint_id),
  KEY idx_status_updates_status (status),
  KEY idx_status_updates_created_at (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS otp_codes (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  mobile VARCHAR(20) NOT NULL,
  otp_code VARCHAR(12) NOT NULL,
  purpose VARCHAR(40) NOT NULL DEFAULT 'login',
  expires_at DATETIME NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  KEY idx_otp_codes_mobile (mobile),
  KEY idx_otp_codes_purpose (purpose),
  KEY idx_otp_codes_expires_at (expires_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Legacy rollback/history table. Active authentication no longer reads access codes.
CREATE TABLE IF NOT EXISTS super_admin_access_codes (
  id VARCHAR(100) PRIMARY KEY,
  access_code VARCHAR(40) NOT NULL,
  name VARCHAR(160) NOT NULL,
  mobile VARCHAR(20) NOT NULL,
  status VARCHAR(30) NOT NULL DEFAULT 'active',
  created_by VARCHAR(100) NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uniq_super_admin_access_code (access_code),
  KEY idx_super_admin_mobile (mobile),
  KEY idx_super_admin_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS role_assignments (
  id BIGINT NOT NULL AUTO_INCREMENT PRIMARY KEY,
  user_id VARCHAR(80) NULL,
  normalized_phone CHAR(10) NOT NULL,
  role VARCHAR(30) NOT NULL,
  display_name VARCHAR(160) NOT NULL,
  ward_or_designation VARCHAR(100) NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'active',
  source VARCHAR(80) NOT NULL DEFAULT 'admin',
  source_serial INT NULL,
  is_primary TINYINT(1) NOT NULL DEFAULT 0,
  added_by VARCHAR(80) NULL,
  last_login_at DATETIME NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uniq_role_phone (normalized_phone, role),
  KEY idx_role_active_lookup (normalized_phone, status, role),
  KEY idx_role_status (role, status),
  KEY idx_role_user (user_id),
  KEY idx_role_source_serial (source, source_serial)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS role_audit_logs (
  id BIGINT NOT NULL AUTO_INCREMENT PRIMARY KEY,
  actor_user_id VARCHAR(80) NULL,
  actor_phone CHAR(10) NULL,
  actor_role VARCHAR(30) NULL,
  action VARCHAR(80) NOT NULL,
  target_assignment_id BIGINT NULL,
  target_phone CHAR(10) NULL,
  previous_status VARCHAR(20) NULL,
  new_status VARCHAR(20) NULL,
  details_json LONGTEXT NULL,
  request_id VARCHAR(80) NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  KEY idx_role_audit_created (created_at),
  KEY idx_role_audit_actor (actor_user_id),
  KEY idx_role_audit_target (target_assignment_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS role_migration_runs (
  migration_key VARCHAR(120) PRIMARY KEY,
  summary_json LONGTEXT NULL,
  applied_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS alerts (
  id VARCHAR(80) PRIMARY KEY,
  title VARCHAR(255) NOT NULL,
  body TEXT NOT NULL,
  type VARCHAR(30) NOT NULL DEFAULT 'alert',
  category VARCHAR(80) NULL,
  priority VARCHAR(30) NULL DEFAULT 'normal',
  location VARCHAR(255) NULL,
  valid_until VARCHAR(80) NULL,
  expires_at VARCHAR(80) NULL,
  target_audience VARCHAR(80) NULL,
  media_uri TEXT NULL,
  media_type VARCHAR(30) NULL,
  media_file_name VARCHAR(255) NULL,
  media_mime_type VARCHAR(120) NULL,
  media_duration INT NULL,
  posted_by VARCHAR(120) NOT NULL DEFAULT 'Connect-T',
  posted_by_id VARCHAR(80) NULL,
  ward VARCHAR(80) NULL,
  is_active TINYINT(1) NOT NULL DEFAULT 1,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  KEY idx_alerts_active (is_active),
  KEY idx_alerts_type (type),
  KEY idx_alerts_ward (ward),
  KEY idx_alerts_created_at (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Legacy job tables kept for older routes/components still present in the repo.
CREATE TABLE IF NOT EXISTS job_users (
  id VARCHAR(80) PRIMARY KEY,
  role VARCHAR(30) NOT NULL,
  name VARCHAR(160) NOT NULL,
  phone VARCHAR(20) NOT NULL,
  dob DATE NULL,
  email VARCHAR(190) NULL,
  avatar_color VARCHAR(40) NULL,
  qualification VARCHAR(160) NULL,
  skills TEXT NULL,
  location VARCHAR(190) NULL,
  company VARCHAR(190) NULL,
  contact_person VARCHAR(160) NULL,
  whatsapp VARCHAR(20) NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uniq_job_users_phone_role (phone, role),
  KEY idx_job_users_role (role),
  KEY idx_job_users_phone (phone)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS jobs (
  id VARCHAR(80) PRIMARY KEY,
  employer_id VARCHAR(80) NOT NULL,
  employer_name VARCHAR(160) NOT NULL,
  employer_phone VARCHAR(20) NULL,
  employer_whatsapp VARCHAR(20) NULL,
  company VARCHAR(190) NOT NULL,
  title VARCHAR(190) NOT NULL,
  category VARCHAR(80) NOT NULL DEFAULT 'other',
  type VARCHAR(40) NOT NULL DEFAULT 'full-time',
  salary VARCHAR(120) NULL,
  location VARCHAR(190) NULL,
  description TEXT NULL,
  requirements TEXT NULL,
  openings INT NOT NULL DEFAULT 1,
  active TINYINT(1) NOT NULL DEFAULT 1,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  KEY idx_jobs_employer_id (employer_id),
  KEY idx_jobs_category (category),
  KEY idx_jobs_active (active),
  KEY idx_jobs_created_at (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS job_applications (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  job_id VARCHAR(80) NOT NULL,
  seeker_id VARCHAR(80) NOT NULL,
  status VARCHAR(40) NOT NULL DEFAULT 'applied',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uniq_job_applications_job_seeker (job_id, seeker_id),
  KEY idx_job_applications_job_id (job_id),
  KEY idx_job_applications_seeker_id (seeker_id),
  KEY idx_job_applications_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Main Job Portal production tables.
CREATE TABLE IF NOT EXISTS job_portal_users (
  id VARCHAR(64) PRIMARY KEY,
  role VARCHAR(20) NOT NULL,
  name VARCHAR(160) NOT NULL,
  dob DATE NULL,
  phone VARCHAR(20) NOT NULL,
  email VARCHAR(190) NULL,
  avatar_color VARCHAR(32) NULL,
  profile_photo LONGTEXT NULL,
  qualification VARCHAR(160) NULL,
  skills TEXT NULL,
  about TEXT NULL,
  current_status VARCHAR(40) NULL,
  experience VARCHAR(80) NULL,
  location VARCHAR(190) NULL,
  languages VARCHAR(190) NULL,
  current_company VARCHAR(190) NULL,
  current_role VARCHAR(160) NULL,
  previous_company VARCHAR(190) NULL,
  previous_role VARCHAR(160) NULL,
  college_name VARCHAR(190) NULL,
  field_of_study VARCHAR(190) NULL,
  company VARCHAR(190) NULL,
  contact_person VARCHAR(160) NULL,
  gst_no VARCHAR(64) NULL,
  industry VARCHAR(120) NULL,
  website VARCHAR(190) NULL,
  company_description TEXT NULL,
  company_type VARCHAR(80) NULL,
  company_size VARCHAR(80) NULL,
  year_established VARCHAR(20) NULL,
  address TEXT NULL,
  pincode VARCHAR(20) NULL,
  whatsapp VARCHAR(20) NULL,
  latitude DECIMAL(10,7) NULL,
  longitude DECIMAL(10,7) NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uniq_job_portal_phone_role (phone, role),
  KEY idx_job_portal_role (role),
  KEY idx_job_portal_phone (phone),
  KEY idx_job_portal_location (location)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS job_portal_jobs (
  id VARCHAR(64) PRIMARY KEY,
  employer_id VARCHAR(64) NOT NULL,
  title VARCHAR(190) NOT NULL,
  category VARCHAR(80) NOT NULL DEFAULT 'other',
  type VARCHAR(40) NOT NULL DEFAULT 'full-time',
  shift VARCHAR(60) NULL,
  job_mode VARCHAR(40) NULL,
  work_start_time VARCHAR(20) NULL,
  work_end_time VARCHAR(20) NULL,
  working_days VARCHAR(120) NULL,
  weekly_off VARCHAR(80) NULL,
  salary_min INT NULL,
  salary_max INT NULL,
  salary_text VARCHAR(120) NULL,
  location VARCHAR(190) NULL,
  address TEXT NULL,
  latitude DECIMAL(10,7) NULL,
  longitude DECIMAL(10,7) NULL,
  description TEXT NULL,
  requirements TEXT NULL,
  experience_required VARCHAR(120) NULL,
  education_required VARCHAR(160) NULL,
  skills_required TEXT NULL,
  benefits TEXT NULL,
  joining_preference VARCHAR(120) NULL,
  last_date_to_apply DATE NULL,
  openings INT NOT NULL DEFAULT 1,
  active TINYINT(1) NOT NULL DEFAULT 1,
  allow_messaging TINYINT(1) NOT NULL DEFAULT 1,
  urgent_hiring TINYINT(1) NOT NULL DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  KEY idx_jp_jobs_employer (employer_id),
  KEY idx_jp_jobs_category (category),
  KEY idx_jp_jobs_type (type),
  KEY idx_jp_jobs_active (active),
  KEY idx_jp_jobs_location (location),
  KEY idx_jp_jobs_created_at (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS job_portal_applications (
  id VARCHAR(64) PRIMARY KEY,
  job_id VARCHAR(64) NOT NULL,
  seeker_id VARCHAR(64) NOT NULL,
  status VARCHAR(40) NOT NULL DEFAULT 'applied',
  status_note TEXT NULL,
  resume_url LONGTEXT NULL,
  applied_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uniq_jp_application (job_id, seeker_id),
  KEY idx_jp_app_job (job_id),
  KEY idx_jp_app_seeker (seeker_id),
  KEY idx_jp_app_status (status),
  KEY idx_jp_app_updated_at (updated_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS job_portal_messages (
  id VARCHAR(64) PRIMARY KEY,
  job_id VARCHAR(64) NULL,
  application_id VARCHAR(64) NULL,
  sender_id VARCHAR(64) NOT NULL,
  receiver_id VARCHAR(64) NOT NULL,
  message TEXT NOT NULL,
  message_type VARCHAR(20) NOT NULL DEFAULT 'text',
  media_url LONGTEXT NULL,
  read_at DATETIME NULL,
  unsent_at DATETIME NULL,
  deleted_for_sender_at DATETIME NULL,
  deleted_for_receiver_at DATETIME NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  KEY idx_jp_msg_pair (sender_id, receiver_id),
  KEY idx_jp_msg_job (job_id),
  KEY idx_jp_msg_app (application_id),
  KEY idx_jp_msg_read (read_at),
  KEY idx_jp_msg_created_at (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS job_portal_notifications (
  id VARCHAR(64) PRIMARY KEY,
  user_id VARCHAR(64) NOT NULL,
  title VARCHAR(190) NOT NULL,
  body TEXT NULL,
  type VARCHAR(60) NULL,
  ref_id VARCHAR(64) NULL,
  read_at DATETIME NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  KEY idx_jp_notif_user (user_id),
  KEY idx_jp_notif_read (read_at),
  KEY idx_jp_notif_created_at (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS job_portal_resumes (
  user_id VARCHAR(64) PRIMARY KEY,
  summary TEXT NULL,
  skills_json LONGTEXT NULL,
  education_json LONGTEXT NULL,
  experience_json LONGTEXT NULL,
  certifications_json LONGTEXT NULL,
  generated_pdf_url LONGTEXT NULL,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

DELIMITER $$
CREATE PROCEDURE ensure_ct_column(IN p_table VARCHAR(64), IN p_column VARCHAR(64), IN p_definition TEXT)
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = p_table
      AND COLUMN_NAME = p_column
  ) THEN
    SET @sql = CONCAT('ALTER TABLE `', p_table, '` ADD COLUMN `', p_column, '` ', p_definition);
    PREPARE stmt FROM @sql;
    EXECUTE stmt;
    DEALLOCATE PREPARE stmt;
  END IF;
END$$
DELIMITER ;

CALL ensure_ct_column('users', 'approval_status', "VARCHAR(30) NOT NULL DEFAULT 'approved'");
CALL ensure_ct_column('users', 'dob', 'VARCHAR(40) NULL');
CALL ensure_ct_column('users', 'office_address', 'TEXT NULL');
CALL ensure_ct_column('users', 'residence_address', 'TEXT NULL');
CALL ensure_ct_column('users', 'office_timings', 'VARCHAR(160) NULL');
CALL ensure_ct_column('users', 'contact_name', 'VARCHAR(160) NULL');
CALL ensure_ct_column('users', 'contact_number', 'VARCHAR(30) NULL');
CALL ensure_ct_column('users', 'profile_photo', 'LONGTEXT NULL');
CALL ensure_ct_column('users', 'notify_email', 'TINYINT(1) NOT NULL DEFAULT 0');
CALL ensure_ct_column('users', 'notify_whatsapp', 'TINYINT(1) NOT NULL DEFAULT 0');
CALL ensure_ct_column('users', 'ward_changed', 'TINYINT(1) NOT NULL DEFAULT 0');

CALL ensure_ct_column('complaints', 'ward_code', 'VARCHAR(20) NULL');
CALL ensure_ct_column('complaints', 'assigned_officer_id', 'VARCHAR(80) NULL');
CALL ensure_ct_column('complaints', 'user_id', 'VARCHAR(80) NULL');
CALL ensure_ct_column('complaints', 'user_mobile', 'VARCHAR(20) NULL');
CALL ensure_ct_column('complaints', 'assigned_to', 'VARCHAR(160) NULL');
CALL ensure_ct_column('complaints', 'resolved_note', 'TEXT NULL');
CALL ensure_ct_column('complaints', 'status', "VARCHAR(40) NOT NULL DEFAULT 'submitted'");
CALL ensure_ct_column('complaints', 'user_dob', 'VARCHAR(40) NULL');
CALL ensure_ct_column('complaints', 'user_profile_photo', 'LONGTEXT NULL');
CALL ensure_ct_column('complaints', 'latitude', 'DECIMAL(10,7) NULL');
CALL ensure_ct_column('complaints', 'longitude', 'DECIMAL(10,7) NULL');
CALL ensure_ct_column('complaints', 'location_accuracy', 'DECIMAL(10,2) NULL');

CALL ensure_ct_column('job_portal_users', 'current_company', 'VARCHAR(190) NULL');
CALL ensure_ct_column('job_portal_users', 'current_role', 'VARCHAR(160) NULL');
CALL ensure_ct_column('job_portal_users', 'previous_company', 'VARCHAR(190) NULL');
CALL ensure_ct_column('job_portal_users', 'previous_role', 'VARCHAR(160) NULL');
CALL ensure_ct_column('job_portal_users', 'college_name', 'VARCHAR(190) NULL');
CALL ensure_ct_column('job_portal_users', 'field_of_study', 'VARCHAR(190) NULL');
CALL ensure_ct_column('job_portal_users', 'company_type', 'VARCHAR(80) NULL');
CALL ensure_ct_column('job_portal_users', 'company_size', 'VARCHAR(80) NULL');
CALL ensure_ct_column('job_portal_users', 'year_established', 'VARCHAR(20) NULL');

CALL ensure_ct_column('job_portal_jobs', 'shift', 'VARCHAR(60) NULL');
CALL ensure_ct_column('job_portal_jobs', 'job_mode', 'VARCHAR(40) NULL');
CALL ensure_ct_column('job_portal_jobs', 'work_start_time', 'VARCHAR(20) NULL');
CALL ensure_ct_column('job_portal_jobs', 'work_end_time', 'VARCHAR(20) NULL');
CALL ensure_ct_column('job_portal_jobs', 'working_days', 'VARCHAR(120) NULL');
CALL ensure_ct_column('job_portal_jobs', 'weekly_off', 'VARCHAR(80) NULL');
CALL ensure_ct_column('job_portal_jobs', 'experience_required', 'VARCHAR(120) NULL');
CALL ensure_ct_column('job_portal_jobs', 'education_required', 'VARCHAR(160) NULL');
CALL ensure_ct_column('job_portal_jobs', 'skills_required', 'TEXT NULL');
CALL ensure_ct_column('job_portal_jobs', 'benefits', 'TEXT NULL');
CALL ensure_ct_column('job_portal_jobs', 'joining_preference', 'VARCHAR(120) NULL');
CALL ensure_ct_column('job_portal_jobs', 'last_date_to_apply', 'DATE NULL');
CALL ensure_ct_column('job_portal_jobs', 'urgent_hiring', 'TINYINT(1) NOT NULL DEFAULT 0');

CALL ensure_ct_column('job_portal_applications', 'resume_url', 'LONGTEXT NULL');
CALL ensure_ct_column('job_portal_messages', 'message_type', "VARCHAR(20) NOT NULL DEFAULT 'text'");
CALL ensure_ct_column('job_portal_messages', 'media_url', 'LONGTEXT NULL');
CALL ensure_ct_column('job_portal_messages', 'read_at', 'DATETIME NULL');
CALL ensure_ct_column('job_portal_messages', 'unsent_at', 'DATETIME NULL');
CALL ensure_ct_column('job_portal_messages', 'deleted_for_sender_at', 'DATETIME NULL');
CALL ensure_ct_column('job_portal_messages', 'deleted_for_receiver_at', 'DATETIME NULL');
CALL ensure_ct_column('job_portal_resumes', 'generated_pdf_url', 'LONGTEXT NULL');

DROP PROCEDURE ensure_ct_column;

INSERT IGNORE INTO schema_migrations (migration_key) VALUES ('connect_t_hostinger_schema_v1');

-- Quick verification queries:
-- SHOW TABLES;
-- SELECT COUNT(*) AS users_count FROM users;
-- SELECT COUNT(*) AS complaints_count FROM complaints;
-- SELECT COUNT(*) AS job_portal_users_count FROM job_portal_users;
