-- Guided three-photo capture storage. Keep inspections.image_path as the legacy
-- primary/top image pointer; this child table stores every capture by role.
USE `cathodevision-ai`;

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
