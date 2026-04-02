-- Migration 003: Template configurable pour fiches intervention robinetterie
-- Stocke la config du tableau principal (zones CARACTERISTIQUES / TRAVAUX)
-- NULL = utiliser le template par défaut côté TypeScript

ALTER TABLE projects
  ADD COLUMN fiche_rob_template JSONB DEFAULT NULL;
