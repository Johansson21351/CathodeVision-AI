-- Idempotent demo data for lot_tools.get_spec() and get_lot_history().
-- Run after schema_additions.sql against cathodevision-ai.
USE `cathodevision-ai`;

INSERT IGNORE INTO lot_specs
  (model_name, expected_chemistry, expected_voltage, expected_capacity_mah)
VALUES
  ('Samsung INR18650-35E', 'NMC', 3.6, 3500),
  ('Molicel INR-18650-P26A', 'NMC', 3.6, 2600),
  ('Samsung INR21700-50E', 'NMC', 3.6, 5000),
  ('Molicel INR21700-P42A', 'NMC', 3.6, 4200),
  ('EVE LF280K', 'LFP', 3.2, 280000);

INSERT IGNORE INTO lots (lot_id, supplier, model_name)
VALUES
  ('DEMO-NMC-21700-001', 'Demo Refurbishment Supplier', 'Samsung INR21700-50E'),
  ('DEMO-LFP-PRISMATIC-001', 'Demo Storage Supplier', 'EVE LF280K');
