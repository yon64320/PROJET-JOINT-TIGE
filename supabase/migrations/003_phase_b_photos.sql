-- =============================================================
-- 003_phase_b_photos.sql — Photos terrain (bride / échafaudage / calorifuge)
-- Phase B — 2026-04-30
--
-- Ajoute :
--   - Table flange_photos (FK SET NULL pour permettre re-rattachement)
--   - 4 index dédiés
--   - 4 policies RLS via project_id dénormalisé
--   - RPC preview_reattach_photos (compteur popup utilisateur)
--   - RPC reattach_orphan_photos (re-rattachement par clé naturelle item+repere)
--   - delete_project_cascade : DELETE flange_photos avant flanges
--   - Bucket Storage privé "photos" (5 Mo, accès via signed URLs uniquement)
--
-- Idempotent : IF NOT EXISTS / CREATE OR REPLACE / DROP POLICY IF EXISTS
-- =============================================================

-- ===================== TABLE =====================

CREATE TABLE IF NOT EXISTS flange_photos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  -- FK SET NULL : permet le re-rattachement après ré-import J&T
  flange_id UUID REFERENCES flanges(id) ON DELETE SET NULL,
  -- project_id dénormalisé : RLS + scope sans JOIN, valide même si flange_id devient NULL
  project_id UUID NOT NULL REFERENCES projects(id),
  type TEXT NOT NULL CHECK (type IN ('bride', 'echafaudage', 'calorifuge')),
  -- Clé naturelle capturée à la prise pour re-rattachement
  natural_item TEXT NOT NULL,
  natural_repere TEXT,
  natural_cote TEXT,
  storage_path TEXT NOT NULL UNIQUE,
  display_name TEXT,
  size_bytes INTEGER,
  taken_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  uploaded_at TIMESTAMPTZ DEFAULT now()
);

-- ===================== INDEXES =====================

CREATE INDEX IF NOT EXISTS idx_flange_photos_flange ON flange_photos(flange_id) WHERE flange_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_flange_photos_project ON flange_photos(project_id);
CREATE INDEX IF NOT EXISTS idx_flange_photos_orphan ON flange_photos(project_id) WHERE flange_id IS NULL;
CREATE INDEX IF NOT EXISTS idx_flange_photos_natural ON flange_photos(project_id, natural_item, natural_repere, type);

-- ===================== RLS =====================

ALTER TABLE flange_photos ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS flange_photos_select ON flange_photos;
CREATE POLICY flange_photos_select ON flange_photos FOR SELECT
  USING (project_id IN (SELECT id FROM projects WHERE owner_id = auth.uid()));

DROP POLICY IF EXISTS flange_photos_insert ON flange_photos;
CREATE POLICY flange_photos_insert ON flange_photos FOR INSERT
  WITH CHECK (project_id IN (SELECT id FROM projects WHERE owner_id = auth.uid()));

DROP POLICY IF EXISTS flange_photos_update ON flange_photos;
CREATE POLICY flange_photos_update ON flange_photos FOR UPDATE
  USING (project_id IN (SELECT id FROM projects WHERE owner_id = auth.uid()));

DROP POLICY IF EXISTS flange_photos_delete ON flange_photos;
CREATE POLICY flange_photos_delete ON flange_photos FOR DELETE
  USING (project_id IN (SELECT id FROM projects WHERE owner_id = auth.uid()));

-- ===================== GRANTS =====================

GRANT ALL ON flange_photos TO anon, authenticated, service_role;

-- ===================== RPC =====================

-- preview_reattach_photos : compteur préalable au ré-import (popup utilisateur)
CREATE OR REPLACE FUNCTION preview_reattach_photos(p_project_id UUID, p_new_items TEXT[])
RETURNS TABLE (will_reattach INTEGER, will_orphan INTEGER) AS $$
DECLARE
  r INTEGER;
  o INTEGER;
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM projects WHERE id = p_project_id AND owner_id = auth.uid()
  ) THEN
    RAISE EXCEPTION 'Projet introuvable ou acces refuse';
  END IF;

  SELECT
    COUNT(*) FILTER (WHERE natural_item = ANY(p_new_items))::INTEGER,
    COUNT(*) FILTER (WHERE NOT (natural_item = ANY(p_new_items)))::INTEGER
  INTO r, o
  FROM flange_photos
  WHERE project_id = p_project_id;

  RETURN QUERY SELECT r, o;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- reattach_orphan_photos : re-rattachement par clé naturelle après ré-import
-- Match par (project_id, natural_item, natural_repere). repere peut être NULL.
CREATE OR REPLACE FUNCTION reattach_orphan_photos(p_project_id UUID)
RETURNS TABLE (reattached INTEGER, orphaned INTEGER) AS $$
DECLARE
  r INTEGER;
  o INTEGER;
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM projects WHERE id = p_project_id AND owner_id = auth.uid()
  ) THEN
    RAISE EXCEPTION 'Projet introuvable ou acces refuse';
  END IF;

  WITH matched AS (
    UPDATE flange_photos fp
    SET flange_id = f.id
    FROM flanges f
    JOIN ot_items ot ON f.ot_item_id = ot.id
    WHERE fp.project_id = p_project_id
      AND fp.flange_id IS NULL
      AND ot.project_id = p_project_id
      AND ot.item = fp.natural_item
      AND f.repere_emis IS NOT DISTINCT FROM fp.natural_repere
    RETURNING fp.id
  )
  SELECT COUNT(*)::INTEGER INTO r FROM matched;

  SELECT COUNT(*)::INTEGER INTO o FROM flange_photos
  WHERE project_id = p_project_id AND flange_id IS NULL;

  RETURN QUERY SELECT r, o;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- delete_project_cascade : ajouter le DELETE flange_photos avant flanges
-- (CASCADE via project_id FK le ferait, mais explicite = traçable + ordre garanti
-- avant le DELETE flanges qui sinon mettrait flange_id à NULL via SET NULL)
CREATE OR REPLACE FUNCTION delete_project_cascade(p_project_id UUID)
RETURNS VOID AS $$
BEGIN
  DELETE FROM flange_photos WHERE project_id = p_project_id;
  DELETE FROM field_sessions WHERE project_id = p_project_id;
  DELETE FROM equipment_plans WHERE project_id = p_project_id;
  DELETE FROM flanges_archive WHERE project_id = p_project_id;
  DELETE FROM flanges WHERE project_id = p_project_id;
  DELETE FROM ot_items_archive WHERE project_id = p_project_id;
  DELETE FROM ot_items WHERE project_id = p_project_id;
  DELETE FROM projects WHERE id = p_project_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- ===================== STORAGE BUCKET =====================

INSERT INTO storage.buckets (id, name, public, file_size_limit)
VALUES ('photos', 'photos', false, 5242880)
ON CONFLICT (id) DO UPDATE
  SET public = EXCLUDED.public,
      file_size_limit = EXCLUDED.file_size_limit;

-- Pas de policy SELECT/INSERT/UPDATE/DELETE pour anon ni authenticated sur le
-- bucket photos : tout passe par l'API serveur (supabaseAdmin = service_role
-- qui bypass RLS) et génère des signed URLs courtes (15 min) après check
-- d'ownership. Si d'anciennes policies existent, les supprimer.
DROP POLICY IF EXISTS photos_owner_select ON storage.objects;
DROP POLICY IF EXISTS photos_authenticated_select ON storage.objects;
