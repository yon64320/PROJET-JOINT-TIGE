-- =============================================================
-- 004_admin.sql — Mode super-user (admin global)
-- Date : 2026-04-30
-- =============================================================
-- Ajoute la notion d'admin global :
--   * Table public.profiles(id, is_admin)
--   * Helper is_admin() SECURITY DEFINER
--   * Trigger handle_new_user (auto-création du profil)
--   * Backfill des profils manquants
--   * Toutes les policies RLS owner-only enrichies de "OR is_admin()"
--   * RPCs SECURITY DEFINER renforcées avec check d'autorisation explicite
--
-- Sécurité : aucune policy INSERT/UPDATE/DELETE n'est créée sur profiles
-- pour authenticated/anon. La promotion ne se fait QUE via service_role
-- (SQL Editor du dashboard ou Management API).
-- =============================================================

-- ===================== TABLE profiles =====================

CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  is_admin BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ===================== FUNCTION is_admin() =====================
-- Définie AVANT toute policy qui l'utilise.

CREATE OR REPLACE FUNCTION is_admin()
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE((SELECT p.is_admin FROM profiles p WHERE p.id = auth.uid()), false);
$$;

GRANT EXECUTE ON FUNCTION is_admin() TO anon, authenticated, service_role;

-- ===================== RLS profiles =====================

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS profiles_select ON profiles;
CREATE POLICY profiles_select ON profiles FOR SELECT
  USING (auth.uid() = id OR is_admin());

-- Aucune policy INSERT / UPDATE / DELETE : seul service_role peut écrire.

-- ===================== TRIGGER auto-creation profil =====================

CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, is_admin)
  VALUES (NEW.id, false)
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- ===================== BACKFILL =====================
-- Crée un profil pour chaque user existant (is_admin = false par défaut).
INSERT INTO profiles (id, is_admin)
SELECT id, false FROM auth.users
ON CONFLICT (id) DO NOTHING;

-- ===================== POLICIES ENRICHIES =====================

-- projects
DROP POLICY IF EXISTS projects_select ON projects;
CREATE POLICY projects_select ON projects FOR SELECT
  USING (owner_id = auth.uid() OR is_admin());
DROP POLICY IF EXISTS projects_insert ON projects;
CREATE POLICY projects_insert ON projects FOR INSERT
  WITH CHECK (owner_id = auth.uid() OR is_admin());
DROP POLICY IF EXISTS projects_update ON projects;
CREATE POLICY projects_update ON projects FOR UPDATE
  USING (owner_id = auth.uid() OR is_admin());
DROP POLICY IF EXISTS projects_delete ON projects;
CREATE POLICY projects_delete ON projects FOR DELETE
  USING (owner_id = auth.uid() OR is_admin());

-- ot_items
DROP POLICY IF EXISTS ot_items_select ON ot_items;
CREATE POLICY ot_items_select ON ot_items FOR SELECT
  USING (project_id IN (SELECT id FROM projects WHERE owner_id = auth.uid()) OR is_admin());
DROP POLICY IF EXISTS ot_items_insert ON ot_items;
CREATE POLICY ot_items_insert ON ot_items FOR INSERT
  WITH CHECK (project_id IN (SELECT id FROM projects WHERE owner_id = auth.uid()) OR is_admin());
DROP POLICY IF EXISTS ot_items_update ON ot_items;
CREATE POLICY ot_items_update ON ot_items FOR UPDATE
  USING (project_id IN (SELECT id FROM projects WHERE owner_id = auth.uid()) OR is_admin());
DROP POLICY IF EXISTS ot_items_delete ON ot_items;
CREATE POLICY ot_items_delete ON ot_items FOR DELETE
  USING (project_id IN (SELECT id FROM projects WHERE owner_id = auth.uid()) OR is_admin());

-- flanges
DROP POLICY IF EXISTS flanges_select ON flanges;
CREATE POLICY flanges_select ON flanges FOR SELECT
  USING (project_id IN (SELECT id FROM projects WHERE owner_id = auth.uid()) OR is_admin());
DROP POLICY IF EXISTS flanges_insert ON flanges;
CREATE POLICY flanges_insert ON flanges FOR INSERT
  WITH CHECK (project_id IN (SELECT id FROM projects WHERE owner_id = auth.uid()) OR is_admin());
DROP POLICY IF EXISTS flanges_update ON flanges;
CREATE POLICY flanges_update ON flanges FOR UPDATE
  USING (project_id IN (SELECT id FROM projects WHERE owner_id = auth.uid()) OR is_admin());
DROP POLICY IF EXISTS flanges_delete ON flanges;
CREATE POLICY flanges_delete ON flanges FOR DELETE
  USING (project_id IN (SELECT id FROM projects WHERE owner_id = auth.uid()) OR is_admin());

-- field_sessions
-- INSERT préserve le check transitif sur project_id apporté par 002_security_fixes.sql (MED-01)
DROP POLICY IF EXISTS field_sessions_select ON field_sessions;
CREATE POLICY field_sessions_select ON field_sessions FOR SELECT
  USING (owner_id = auth.uid() OR is_admin());
DROP POLICY IF EXISTS field_sessions_insert ON field_sessions;
CREATE POLICY field_sessions_insert ON field_sessions FOR INSERT
  WITH CHECK (
    (owner_id = auth.uid()
     AND project_id IN (SELECT id FROM projects WHERE owner_id = auth.uid()))
    OR is_admin()
  );
DROP POLICY IF EXISTS field_sessions_update ON field_sessions;
CREATE POLICY field_sessions_update ON field_sessions FOR UPDATE
  USING (owner_id = auth.uid() OR is_admin());
DROP POLICY IF EXISTS field_sessions_delete ON field_sessions;
CREATE POLICY field_sessions_delete ON field_sessions FOR DELETE
  USING (owner_id = auth.uid() OR is_admin());

-- field_session_items
DROP POLICY IF EXISTS field_session_items_select ON field_session_items;
CREATE POLICY field_session_items_select ON field_session_items FOR SELECT
  USING (session_id IN (SELECT id FROM field_sessions WHERE owner_id = auth.uid()) OR is_admin());
DROP POLICY IF EXISTS field_session_items_insert ON field_session_items;
CREATE POLICY field_session_items_insert ON field_session_items FOR INSERT
  WITH CHECK (session_id IN (SELECT id FROM field_sessions WHERE owner_id = auth.uid()) OR is_admin());
DROP POLICY IF EXISTS field_session_items_delete ON field_session_items;
CREATE POLICY field_session_items_delete ON field_session_items FOR DELETE
  USING (session_id IN (SELECT id FROM field_sessions WHERE owner_id = auth.uid()) OR is_admin());

-- equipment_plans
DROP POLICY IF EXISTS equipment_plans_select ON equipment_plans;
CREATE POLICY equipment_plans_select ON equipment_plans FOR SELECT
  USING (project_id IN (SELECT id FROM projects WHERE owner_id = auth.uid()) OR is_admin());
DROP POLICY IF EXISTS equipment_plans_insert ON equipment_plans;
CREATE POLICY equipment_plans_insert ON equipment_plans FOR INSERT
  WITH CHECK (project_id IN (SELECT id FROM projects WHERE owner_id = auth.uid()) OR is_admin());
DROP POLICY IF EXISTS equipment_plans_delete ON equipment_plans;
CREATE POLICY equipment_plans_delete ON equipment_plans FOR DELETE
  USING (project_id IN (SELECT id FROM projects WHERE owner_id = auth.uid()) OR is_admin());

-- ot_items_archive
DROP POLICY IF EXISTS ot_items_archive_select ON ot_items_archive;
CREATE POLICY ot_items_archive_select ON ot_items_archive FOR SELECT
  USING (project_id IN (SELECT id FROM projects WHERE owner_id = auth.uid()) OR is_admin());
DROP POLICY IF EXISTS ot_items_archive_insert ON ot_items_archive;
CREATE POLICY ot_items_archive_insert ON ot_items_archive FOR INSERT
  WITH CHECK (project_id IN (SELECT id FROM projects WHERE owner_id = auth.uid()) OR is_admin());

-- flanges_archive
DROP POLICY IF EXISTS flanges_archive_select ON flanges_archive;
CREATE POLICY flanges_archive_select ON flanges_archive FOR SELECT
  USING (project_id IN (SELECT id FROM projects WHERE owner_id = auth.uid()) OR is_admin());
DROP POLICY IF EXISTS flanges_archive_insert ON flanges_archive;
CREATE POLICY flanges_archive_insert ON flanges_archive FOR INSERT
  WITH CHECK (project_id IN (SELECT id FROM projects WHERE owner_id = auth.uid()) OR is_admin());

-- flange_photos
DROP POLICY IF EXISTS flange_photos_select ON flange_photos;
CREATE POLICY flange_photos_select ON flange_photos FOR SELECT
  USING (project_id IN (SELECT id FROM projects WHERE owner_id = auth.uid()) OR is_admin());
DROP POLICY IF EXISTS flange_photos_insert ON flange_photos;
CREATE POLICY flange_photos_insert ON flange_photos FOR INSERT
  WITH CHECK (project_id IN (SELECT id FROM projects WHERE owner_id = auth.uid()) OR is_admin());
DROP POLICY IF EXISTS flange_photos_update ON flange_photos;
CREATE POLICY flange_photos_update ON flange_photos FOR UPDATE
  USING (project_id IN (SELECT id FROM projects WHERE owner_id = auth.uid()) OR is_admin());
DROP POLICY IF EXISTS flange_photos_delete ON flange_photos;
CREATE POLICY flange_photos_delete ON flange_photos FOR DELETE
  USING (project_id IN (SELECT id FROM projects WHERE owner_id = auth.uid()) OR is_admin());

-- ===================== RPCs SECURITY DEFINER : check d'autorisation =====================
-- Défense en profondeur : la RPC refuse l'opération si le caller n'est ni
-- owner du projet ni admin, même si le caller TS oublie de filtrer.

CREATE OR REPLACE FUNCTION delete_project_cascade(p_project_id UUID)
RETURNS VOID AS $$
BEGIN
  IF NOT (
    EXISTS (SELECT 1 FROM projects WHERE id = p_project_id AND owner_id = auth.uid())
    OR is_admin()
  ) THEN
    RAISE EXCEPTION 'Forbidden: not project owner or admin';
  END IF;

  -- DELETE flange_photos avant flanges (cf. 003_phase_b_photos.sql) :
  -- la FK flange_photos.flange_id est ON DELETE SET NULL, donc supprimer
  -- explicitement ici garde l'ordre traçable et évite les orphelins.
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

CREATE OR REPLACE FUNCTION reimport_archive_lut(p_project_id UUID)
RETURNS INTEGER AS $$
DECLARE
  archived_flanges INTEGER := 0;
  archived_ots INTEGER := 0;
BEGIN
  IF NOT (
    EXISTS (SELECT 1 FROM projects WHERE id = p_project_id AND owner_id = auth.uid())
    OR is_admin()
  ) THEN
    RAISE EXCEPTION 'Forbidden: not project owner or admin';
  END IF;

  archived_flanges := _archive_flanges(p_project_id, 'reimport_lut');
  archived_ots := _archive_ot_items(p_project_id, 'reimport_lut');

  DELETE FROM flanges WHERE project_id = p_project_id;
  DELETE FROM ot_items WHERE project_id = p_project_id;

  RETURN archived_flanges + archived_ots;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE OR REPLACE FUNCTION reimport_archive_jt(p_project_id UUID)
RETURNS INTEGER AS $$
DECLARE
  archived INTEGER := 0;
BEGIN
  IF NOT (
    EXISTS (SELECT 1 FROM projects WHERE id = p_project_id AND owner_id = auth.uid())
    OR is_admin()
  ) THEN
    RAISE EXCEPTION 'Forbidden: not project owner or admin';
  END IF;

  archived := _archive_flanges(p_project_id, 'reimport_jt');
  DELETE FROM flanges WHERE project_id = p_project_id;
  RETURN archived;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- ===================== GRANTS profiles =====================

GRANT SELECT ON profiles TO anon, authenticated, service_role;
GRANT INSERT, UPDATE, DELETE ON profiles TO service_role;
