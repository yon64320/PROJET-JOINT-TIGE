-- Migration 004 : ajout colonne responsable sur flanges
-- Permet d'assigner un responsable par vanne (robinetterie)
ALTER TABLE flanges ADD COLUMN responsable TEXT;
