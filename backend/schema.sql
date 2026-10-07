-- Run once: mysql -u root -p < schema.sql
CREATE DATABASE IF NOT EXISTS `cathodevision-ai`
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE `cathodevision-ai`;

CREATE TABLE IF NOT EXISTS users (
  id         INT PRIMARY KEY AUTO_INCREMENT,
  username   VARCHAR(80)  NOT NULL UNIQUE,
  email      VARCHAR(120) NOT NULL,
  password   VARCHAR(255) NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS user_password_keys (
  user_id          INT PRIMARY KEY,
  key_hash         VARCHAR(255) NOT NULL,
  failed_attempts  TINYINT UNSIGNED NOT NULL DEFAULT 0,
  locked_until     DATETIME NULL,
  created_at       DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS tasks (
  id             INT PRIMARY KEY AUTO_INCREMENT,
  title          VARCHAR(200) NOT NULL,
  done           BOOLEAN NOT NULL DEFAULT FALSE,
  owner_id       INT NOT NULL,

  -- เติมโดย AI ในบทที่ 7 (ตอนแรกเป็น NULL ทั้งหมด)
  category       VARCHAR(50),
  priority       VARCHAR(10),
  est_minutes    INT,
  ai_confidence  FLOAT,
  categorized_at DATETIME,

  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  INDEX idx_owner (owner_id),
  FOREIGN KEY (owner_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ผลตรวจภาพจากบทที่ 7 (Vision)
CREATE TABLE IF NOT EXISTS inspections (
  id          INT PRIMARY KEY AUTO_INCREMENT,
  filename    VARCHAR(255),
  has_defect  BOOLEAN NOT NULL DEFAULT FALSE,
  defect_type VARCHAR(50),
  severity    ENUM('critical', 'major', 'minor', 'none') NOT NULL DEFAULT 'none',
  description TEXT,
  confidence  FLOAT,
  user_id     INT NOT NULL,
  is_battery  BOOLEAN NOT NULL DEFAULT TRUE,
  analysis_status ENUM('PENDING', 'COMPLETED', 'REJECTED', 'FAILED') NOT NULL DEFAULT 'COMPLETED',
  error_message TEXT,
  label_text  VARCHAR(500),
  detected_chemistry VARCHAR(20),
  is_high_value BOOLEAN NOT NULL DEFAULT FALSE,
  image_path  VARCHAR(255),
  created_at  DATETIME DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_user (user_id),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS inspection_images (
  id             INT PRIMARY KEY AUTO_INCREMENT,
  inspection_id  INT NOT NULL,
  role           ENUM('top', 'terminal_side', 'label_closeup') NOT NULL,
  image_path     VARCHAR(255) NOT NULL,
  created_at     DATETIME DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uq_inspection_image_role (inspection_id, role),
  INDEX idx_inspection_images_inspection (inspection_id),
  CONSTRAINT fk_inspection_images_inspection
    FOREIGN KEY (inspection_id) REFERENCES inspections(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS password_reset_tokens (
  id          INT PRIMARY KEY AUTO_INCREMENT,
  user_id     INT NOT NULL,
  token_hash  CHAR(64) NOT NULL UNIQUE,
  expires_at  DATETIME NOT NULL,
  used_at     DATETIME NULL,
  created_at  DATETIME DEFAULT CURRENT_TIMESTAMP,

  INDEX idx_reset_user (user_id),
  INDEX idx_reset_expiry (expires_at),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS inspection_reviews (
  id                 INT PRIMARY KEY AUTO_INCREMENT,
  inspection_id      INT NOT NULL,
  reviewer_id        INT NOT NULL,
  reviewed_defect    BOOLEAN NOT NULL,
  corrected_type     VARCHAR(50),
  correction_note    TEXT,
  status             ENUM('PENDING', 'APPROVED', 'REJECTED') NOT NULL DEFAULT 'PENDING',
  created_at         DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at         DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  UNIQUE KEY uq_review_inspection_reviewer (inspection_id, reviewer_id),
  INDEX idx_review_reviewer (reviewer_id),
  FOREIGN KEY (inspection_id) REFERENCES inspections(id) ON DELETE CASCADE,
  FOREIGN KEY (reviewer_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;