-- Run once against the existing cathodevision-ai database:
--   mysql -u root -p cathodevision-ai < schema_additions.sql
--
-- Adds the two tables the recommendation agent's tools (lot_tools.py) read
-- from, plus a lot_id on inspections so items can be grouped into a batch.

USE `cathodevision-ai`;

CREATE TABLE IF NOT EXISTS lot_specs (
  model_name            VARCHAR(100) PRIMARY KEY,
  expected_chemistry     VARCHAR(20),
  expected_voltage       FLOAT,
  expected_capacity_mah  INT,
  created_at             DATETIME DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS lots (
  lot_id      VARCHAR(50) PRIMARY KEY,
  supplier    VARCHAR(100),
  model_name  VARCHAR(100),
  received_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (model_name) REFERENCES lot_specs(model_name) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

ALTER TABLE inspections
  ADD COLUMN lot_id VARCHAR(50) NULL AFTER user_id,
  ADD COLUMN disposition ENUM('PASS','MONITOR','HOLD','QUARANTINE') NULL AFTER severity,
  ADD INDEX idx_lot (lot_id);
