-- =============================================================
-- 005_plans_storage_bucket.sql — Bucket Storage privé pour plans PDF
-- 2026-05-01
--
-- Comble une lacune : la table equipment_plans + la route /api/terrain/plans
-- existaient déjà mais le bucket storage 'plans' n'avait jamais été créé en
-- migration. L'app fonctionnait uniquement parce que le bucket avait été
-- créé manuellement côté Studio sur l'environnement courant.
--
-- Ajoute aussi un index naturel pour l'écrasement déterministe lors d'un
-- re-import (même projet + même OT + même filename → on écrase l'ancien).
--
-- Idempotent : INSERT ... ON CONFLICT, IF NOT EXISTS.
-- =============================================================

-- ===================== STORAGE BUCKET =====================

-- 50 Mo par fichier (plans isométriques peuvent être lourds)
-- MIME application/pdf strict (validé aussi côté API mais defense en profondeur)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('plans', 'plans', false, 52428800, ARRAY['application/pdf'])
ON CONFLICT (id) DO UPDATE
  SET public = EXCLUDED.public,
      file_size_limit = EXCLUDED.file_size_limit,
      allowed_mime_types = EXCLUDED.allowed_mime_types;

-- Pas de policy SELECT/INSERT/UPDATE/DELETE pour anon ni authenticated.
-- Tout passe par l'API serveur (supabaseAdmin = service_role qui bypass RLS)
-- avec génération de signed URLs côté download/route.ts (TTL 1h).
DROP POLICY IF EXISTS plans_owner_select ON storage.objects;
DROP POLICY IF EXISTS plans_authenticated_select ON storage.objects;

-- ===================== INDEX NATUREL =====================

-- Accélère le lookup d'écrasement : "existe-t-il déjà un plan avec ce filename
-- pour ce (projet, OT) ?". Le predicat exclut les plans projet général
-- (ot_item_id IS NULL) qui restent indexables par idx_equipment_plans_project.
CREATE INDEX IF NOT EXISTS idx_equipment_plans_natural
  ON equipment_plans(project_id, ot_item_id, filename)
  WHERE ot_item_id IS NOT NULL;

-- Index complémentaire pour les plans projet général
CREATE INDEX IF NOT EXISTS idx_equipment_plans_general
  ON equipment_plans(project_id, filename)
  WHERE ot_item_id IS NULL;
