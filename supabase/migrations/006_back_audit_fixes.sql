-- =============================================================
-- 006_back_audit_fixes.sql — Durcissements post-audit (2026-05-04)
--
-- Patch 1 : ON DELETE CASCADE explicite sur 9 FK (defense en profondeur)
-- Patch 2 : allowed_mime_types sur bucket photos
--
-- Idempotent : DROP CONSTRAINT IF EXISTS / ADD CONSTRAINT.
-- =============================================================

-- ===================== Patch 1 : FK ON DELETE =====================
-- Logique : tout ce qui est scopé par project_id ou ot_item_id doit CASCADE
-- (cohérent avec ce que delete_project_cascade fait déjà explicitement).
-- equipment_plans.ot_item_id reste SET NULL (pattern "projet général").
-- projects.owner_id : SET NULL (préserve les projets si user supprimé,
-- admin peut récupérer ; à différencier d'un opt-out GDPR explicite).

-- ot_items.project_id
ALTER TABLE ot_items DROP CONSTRAINT IF EXISTS ot_items_project_id_fkey;
ALTER TABLE ot_items ADD CONSTRAINT ot_items_project_id_fkey
  FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE;

-- flanges.project_id, flanges.ot_item_id
ALTER TABLE flanges DROP CONSTRAINT IF EXISTS flanges_project_id_fkey;
ALTER TABLE flanges ADD CONSTRAINT flanges_project_id_fkey
  FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE;
ALTER TABLE flanges DROP CONSTRAINT IF EXISTS flanges_ot_item_id_fkey;
ALTER TABLE flanges ADD CONSTRAINT flanges_ot_item_id_fkey
  FOREIGN KEY (ot_item_id) REFERENCES ot_items(id) ON DELETE CASCADE;

-- field_sessions.project_id, field_sessions.owner_id
ALTER TABLE field_sessions DROP CONSTRAINT IF EXISTS field_sessions_project_id_fkey;
ALTER TABLE field_sessions ADD CONSTRAINT field_sessions_project_id_fkey
  FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE;
ALTER TABLE field_sessions DROP CONSTRAINT IF EXISTS field_sessions_owner_id_fkey;
ALTER TABLE field_sessions ADD CONSTRAINT field_sessions_owner_id_fkey
  FOREIGN KEY (owner_id) REFERENCES auth.users(id) ON DELETE CASCADE;

-- field_session_items.ot_item_id (session_id déjà ON DELETE CASCADE)
ALTER TABLE field_session_items DROP CONSTRAINT IF EXISTS field_session_items_ot_item_id_fkey;
ALTER TABLE field_session_items ADD CONSTRAINT field_session_items_ot_item_id_fkey
  FOREIGN KEY (ot_item_id) REFERENCES ot_items(id) ON DELETE CASCADE;

-- equipment_plans : project_id CASCADE, ot_item_id SET NULL (projet général)
ALTER TABLE equipment_plans DROP CONSTRAINT IF EXISTS equipment_plans_project_id_fkey;
ALTER TABLE equipment_plans ADD CONSTRAINT equipment_plans_project_id_fkey
  FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE;
ALTER TABLE equipment_plans DROP CONSTRAINT IF EXISTS equipment_plans_ot_item_id_fkey;
ALTER TABLE equipment_plans ADD CONSTRAINT equipment_plans_ot_item_id_fkey
  FOREIGN KEY (ot_item_id) REFERENCES ot_items(id) ON DELETE SET NULL;

-- flange_photos.project_id (flange_id déjà SET NULL pour re-rattachement)
ALTER TABLE flange_photos DROP CONSTRAINT IF EXISTS flange_photos_project_id_fkey;
ALTER TABLE flange_photos ADD CONSTRAINT flange_photos_project_id_fkey
  FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE;

-- projects.owner_id : SET NULL (préservation des projets si user supprimé)
ALTER TABLE projects DROP CONSTRAINT IF EXISTS projects_owner_id_fkey;
ALTER TABLE projects ADD CONSTRAINT projects_owner_id_fkey
  FOREIGN KEY (owner_id) REFERENCES auth.users(id) ON DELETE SET NULL;

-- ===================== Patch 2 : MIME bucket photos =====================
-- Defense en profondeur : le bucket n'accepte plus que image/webp.
-- Le check côté API (terrain/photos:46) reste en place (early reject côté serveur).
UPDATE storage.buckets
  SET allowed_mime_types = ARRAY['image/webp']
  WHERE id = 'photos';
