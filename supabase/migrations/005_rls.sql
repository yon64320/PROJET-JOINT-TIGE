-- ============================================================
-- Migration 005 : Row Level Security
-- Sécurise les tables pour un usage multi-utilisateur.
-- ============================================================

-- 1. Ajouter owner_id aux projets
ALTER TABLE projects ADD COLUMN IF NOT EXISTS owner_id UUID REFERENCES auth.users(id);

-- 2. Activer RLS
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE ot_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE flanges ENABLE ROW LEVEL SECURITY;

-- 3. Policies projects
CREATE POLICY "Users can view own projects"
  ON projects FOR SELECT
  USING (owner_id = auth.uid());

CREATE POLICY "Users can insert own projects"
  ON projects FOR INSERT
  WITH CHECK (owner_id = auth.uid());

CREATE POLICY "Users can update own projects"
  ON projects FOR UPDATE
  USING (owner_id = auth.uid());

CREATE POLICY "Users can delete own projects"
  ON projects FOR DELETE
  USING (owner_id = auth.uid());

-- 4. Policies ot_items (via project ownership)
CREATE POLICY "Users can view own ot_items"
  ON ot_items FOR SELECT
  USING (project_id IN (SELECT id FROM projects WHERE owner_id = auth.uid()));

CREATE POLICY "Users can insert own ot_items"
  ON ot_items FOR INSERT
  WITH CHECK (project_id IN (SELECT id FROM projects WHERE owner_id = auth.uid()));

CREATE POLICY "Users can update own ot_items"
  ON ot_items FOR UPDATE
  USING (project_id IN (SELECT id FROM projects WHERE owner_id = auth.uid()));

CREATE POLICY "Users can delete own ot_items"
  ON ot_items FOR DELETE
  USING (project_id IN (SELECT id FROM projects WHERE owner_id = auth.uid()));

-- 5. Policies flanges (via project ownership)
CREATE POLICY "Users can view own flanges"
  ON flanges FOR SELECT
  USING (project_id IN (SELECT id FROM projects WHERE owner_id = auth.uid()));

CREATE POLICY "Users can insert own flanges"
  ON flanges FOR INSERT
  WITH CHECK (project_id IN (SELECT id FROM projects WHERE owner_id = auth.uid()));

CREATE POLICY "Users can update own flanges"
  ON flanges FOR UPDATE
  USING (project_id IN (SELECT id FROM projects WHERE owner_id = auth.uid()));

CREATE POLICY "Users can delete own flanges"
  ON flanges FOR DELETE
  USING (project_id IN (SELECT id FROM projects WHERE owner_id = auth.uid()));

-- 6. Service role bypass (pour les API routes avec supabaseAdmin)
-- Le service role key contourne automatiquement RLS — pas de policy nécessaire.

-- 7. Grant pour les fonctions RPC existantes
-- merge_extra_column utilise SECURITY DEFINER → pas affecté par RLS.
