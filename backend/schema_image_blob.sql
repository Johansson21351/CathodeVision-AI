-- Run LAST (after schema.sql, schema_additions.sql, schema_three_shot.sql).
-- Stores inspection photos in the database instead of on local disk, so they
-- survive restarts on hosts with ephemeral storage (e.g. Render free tier).
USE `cathodevision-ai`;

ALTER TABLE inspection_images
  ADD COLUMN image_data MEDIUMBLOB NULL AFTER image_path,
  ADD COLUMN image_mime VARCHAR(50) NULL AFTER image_data;
