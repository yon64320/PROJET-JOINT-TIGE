-- 007_user_scoped_templates.sql — Templates d'import scopés par utilisateur
--
-- Avant : SELECT ouvert sur import_templates (USING true) → tout user voit
-- les templates des autres. Avec INSERT/UPDATE déjà filtrés par owner_id
-- (migration 002), le seul trou restant était la lecture.
--
-- Après : SELECT scopé `owner_id = auth.uid() OR is_admin()` — cohérent avec
-- le pattern admin du reste du schéma (projects, ot_items, flanges, etc.).
--
-- Note backfill : les templates `owner_id IS NULL` créés avant la migration 002
-- deviennent invisibles. Pour les réassigner à un user (à exécuter en
-- service-role depuis le SQL Editor) :
--   UPDATE import_templates SET owner_id = '<uuid-du-user>' WHERE owner_id IS NULL;

DROP POLICY IF EXISTS import_templates_select ON import_templates;

CREATE POLICY import_templates_select ON import_templates FOR SELECT
  USING (owner_id = auth.uid() OR is_admin());
