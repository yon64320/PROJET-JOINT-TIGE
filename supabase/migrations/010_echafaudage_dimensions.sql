-- Migration 010: Dimensions échafaudage (L × l × H)
ALTER TABLE flanges
  ADD COLUMN IF NOT EXISTS echaf_longueur TEXT,
  ADD COLUMN IF NOT EXISTS echaf_largeur TEXT,
  ADD COLUMN IF NOT EXISTS echaf_hauteur TEXT;

ALTER TABLE flanges_archive
  ADD COLUMN IF NOT EXISTS echaf_longueur TEXT,
  ADD COLUMN IF NOT EXISTS echaf_largeur TEXT,
  ADD COLUMN IF NOT EXISTS echaf_hauteur TEXT;
