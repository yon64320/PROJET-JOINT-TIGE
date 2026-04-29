-- =============================================================
-- 002_security_fixes.sql — Patches sécurité (audit RLS 2026-04-29)
--
-- HIGH-01 : Checks `auth.uid()` dans les 5 RPC SECURITY DEFINER
-- HIGH-06 : import_templates.owner_id + policies INSERT/UPDATE durcies
-- MED-01 : field_sessions_insert avec check transitive project_id
-- MED-02 : merge_extra_column IF NOT FOUND signal explicite
--
-- Idempotent : CREATE OR REPLACE / DROP POLICY IF EXISTS / ADD COLUMN IF NOT EXISTS
-- =============================================================

-- ============================================================
-- MED-02 : merge_extra_column signale les no-op silencieux
-- ============================================================
CREATE OR REPLACE FUNCTION merge_extra_column(
  p_table TEXT,
  p_id UUID,
  p_key TEXT,
  p_value TEXT
) RETURNS VOID AS $$
BEGIN
  IF p_table NOT IN ('ot_items', 'flanges') THEN
    RAISE EXCEPTION 'Table non autorisee: %', p_table;
  END IF;
  EXECUTE format(
    'UPDATE %I SET extra_columns = extra_columns || jsonb_build_object($1, $2) WHERE id = $3',
    p_table
  ) USING p_key, p_value, p_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Ligne non trouvee ou acces refuse: %', p_id;
  END IF;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- ============================================================
-- HIGH-01 : Check ownership dans les RPC destructrices SECURITY DEFINER
-- ============================================================

-- delete_project_cascade : seul l'owner peut supprimer son projet
CREATE OR REPLACE FUNCTION delete_project_cascade(p_project_id UUID)
RETURNS VOID AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM projects WHERE id = p_project_id AND owner_id = auth.uid()
  ) THEN
    RAISE EXCEPTION 'Projet introuvable ou acces refuse';
  END IF;

  DELETE FROM field_sessions WHERE project_id = p_project_id;
  DELETE FROM equipment_plans WHERE project_id = p_project_id;
  DELETE FROM flanges_archive WHERE project_id = p_project_id;
  DELETE FROM flanges WHERE project_id = p_project_id;
  DELETE FROM ot_items_archive WHERE project_id = p_project_id;
  DELETE FROM ot_items WHERE project_id = p_project_id;
  DELETE FROM projects WHERE id = p_project_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- reimport_archive_lut : seul l'owner peut archiver/purger son projet
CREATE OR REPLACE FUNCTION reimport_archive_lut(p_project_id UUID)
RETURNS INTEGER AS $$
DECLARE
  archived_flanges INTEGER := 0;
  archived_ots INTEGER := 0;
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM projects WHERE id = p_project_id AND owner_id = auth.uid()
  ) THEN
    RAISE EXCEPTION 'Projet introuvable ou acces refuse';
  END IF;

  archived_flanges := _archive_flanges(p_project_id, 'reimport_lut');
  archived_ots := _archive_ot_items(p_project_id, 'reimport_lut');

  DELETE FROM flanges WHERE project_id = p_project_id;
  DELETE FROM ot_items WHERE project_id = p_project_id;

  RETURN archived_flanges + archived_ots;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- reimport_archive_jt : seul l'owner peut archiver/purger ses brides
CREATE OR REPLACE FUNCTION reimport_archive_jt(p_project_id UUID)
RETURNS INTEGER AS $$
DECLARE
  archived INTEGER := 0;
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM projects WHERE id = p_project_id AND owner_id = auth.uid()
  ) THEN
    RAISE EXCEPTION 'Projet introuvable ou acces refuse';
  END IF;

  archived := _archive_flanges(p_project_id, 'reimport_jt');
  DELETE FROM flanges WHERE project_id = p_project_id;
  RETURN archived;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Helpers internes — restreindre EXECUTE aux callers internes/admin
-- Les RPC parent (reimport_archive_*) restent en SECURITY DEFINER avec droits
-- du créateur (postgres) → peuvent toujours les invoquer
REVOKE EXECUTE ON FUNCTION _archive_flanges(UUID, TEXT) FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION _archive_ot_items(UUID, TEXT) FROM anon, authenticated;

-- ============================================================
-- HIGH-06 : import_templates.owner_id + policies durcies
-- ============================================================

ALTER TABLE import_templates ADD COLUMN IF NOT EXISTS owner_id UUID REFERENCES auth.users(id);
CREATE INDEX IF NOT EXISTS idx_import_templates_owner ON import_templates(owner_id);

-- SELECT reste ouvert (templates partagés en lecture)
DROP POLICY IF EXISTS import_templates_insert ON import_templates;
DROP POLICY IF EXISTS import_templates_update ON import_templates;

CREATE POLICY import_templates_insert ON import_templates FOR INSERT
  WITH CHECK (owner_id = auth.uid());

CREATE POLICY import_templates_update ON import_templates FOR UPDATE
  USING (owner_id = auth.uid());

-- ============================================================
-- MED-01 : field_sessions_insert avec check transitive project_id
-- ============================================================

DROP POLICY IF EXISTS field_sessions_insert ON field_sessions;
CREATE POLICY field_sessions_insert ON field_sessions FOR INSERT
  WITH CHECK (
    owner_id = auth.uid()
    AND project_id IN (SELECT id FROM projects WHERE owner_id = auth.uid())
  );

-- =============================================================
-- Note : Les routes terrain utilisent supabaseAdmin (service-role,
-- bypass RLS). Les policies de defense en profondeur ci-dessus
-- ne sont activees que si une route bascule sur createServerSupabase.
-- Les checks ownership cote code (routes API) restent obligatoires.
-- =============================================================
