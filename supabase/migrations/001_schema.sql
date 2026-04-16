-- =============================================================
-- 001_schema.sql — Schema canonique unique
-- Squash des migrations 001-012 — 2026-04-14
-- =============================================================

-- ===================== FUNCTIONS =====================

-- Trigger updated_at
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Mise a jour atomique JSONB (pas de read-modify-write)
CREATE OR REPLACE FUNCTION merge_extra_column(
  p_table TEXT,
  p_id UUID,
  p_key TEXT,
  p_value TEXT
) RETURNS VOID AS $$
BEGIN
  EXECUTE format(
    'UPDATE %I SET extra_columns = extra_columns || jsonb_build_object($1, $2) WHERE id = $3',
    p_table
  ) USING p_key, p_value, p_id;
END;
$$ LANGUAGE plpgsql;

-- Appariement atomique de brides rob (SECURITY DEFINER)
CREATE OR REPLACE FUNCTION pair_flanges(
  p_flange_a UUID,
  p_flange_b UUID,
  p_pair_id UUID,
  p_side_a TEXT,
  p_side_b TEXT
) RETURNS VOID AS $$
BEGIN
  UPDATE flanges SET rob_pair_id = p_pair_id, rob_side = p_side_a WHERE id = p_flange_a;
  UPDATE flanges SET rob_pair_id = p_pair_id, rob_side = p_side_b WHERE id = p_flange_b;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ===================== TABLES =====================

-- import_templates (avant projects pour la FK)
CREATE TABLE IF NOT EXISTS import_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  file_type TEXT NOT NULL CHECK (file_type IN ('lut', 'jt')),
  header_row INTEGER NOT NULL,
  column_mapping JSONB NOT NULL,
  extra_columns_order TEXT[] DEFAULT '{}',
  header_fingerprint TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- projects
CREATE TABLE IF NOT EXISTS projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  client TEXT NOT NULL,
  units TEXT[] DEFAULT '{}',
  revision TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  owner_id UUID REFERENCES auth.users(id),
  fiche_rob_template JSONB,
  header_colors JSONB DEFAULT '{}',
  last_import_template_id UUID REFERENCES import_templates(id) ON DELETE SET NULL
);

-- ot_items (LUT)
CREATE TABLE IF NOT EXISTS ot_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id),
  numero_ligne TEXT,
  ot TEXT,
  lot TEXT,
  unite TEXT,
  item TEXT NOT NULL,
  titre_gamme TEXT,
  famille_item TEXT,
  type_item TEXT,
  type_travaux TEXT,
  statut TEXT CHECK (statut IN ('TB', 'TC', 'TA')),
  revision TEXT,
  commentaires TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  extra_columns JSONB DEFAULT '{}',
  cell_metadata JSONB DEFAULT '{}',
  UNIQUE(project_id, item)
);

-- flanges (J&T) — toutes colonnes TEXT, 5 GENERATED
CREATE TABLE IF NOT EXISTS flanges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id),
  ot_item_id UUID NOT NULL REFERENCES ot_items(id),
  -- Identifiants
  id_ubleam TEXT,
  nom TEXT,
  zone TEXT,
  famille_travaux TEXT,
  type TEXT,
  -- Reperes
  repere_buta TEXT,
  repere_emis TEXT,
  repere_ubleam TEXT,
  commentaire_repere TEXT,
  -- DN / PN (TEXT brut)
  dn_emis TEXT,
  dn_buta TEXT,
  pn_emis TEXT,
  pn_buta TEXT,
  -- Operation
  operation TEXT,
  barrette TEXT,
  -- Joints pleins / brides pleines (TEXT brut)
  nb_jp_emis TEXT,
  nb_jp_buta TEXT,
  nb_bp_emis TEXT,
  nb_bp_buta TEXT,
  -- Materiel
  materiel_emis TEXT,
  materiel_buta TEXT,
  materiel_adf TEXT,
  -- Boulonnerie
  cle TEXT,
  nb_tiges_emis TEXT,
  nb_tiges_buta TEXT,
  matiere_tiges_emis TEXT,
  matiere_tiges_buta TEXT,
  diametre_tige TEXT,
  longueur_tige TEXT,
  -- Joints
  nb_joints_prov TEXT,
  nb_joints_def TEXT,
  matiere_joint_emis TEXT,
  matiere_joint_buta TEXT,
  rondelle TEXT,
  face_bride TEXT,
  -- Divers
  commentaires TEXT,
  responsable TEXT,
  -- Rob pairing
  rob TEXT,
  rob_pair_id UUID,
  rob_side TEXT CHECK (rob_side IN ('ADM', 'REF')),
  -- Terrain
  calorifuge TEXT,
  echafaudage TEXT,
  echaf_longueur TEXT,
  echaf_largeur TEXT,
  echaf_hauteur TEXT,
  field_status TEXT DEFAULT 'pending' CHECK (field_status IN ('pending', 'in_progress', 'completed')),
  -- Timestamps & flex
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  extra_columns JSONB DEFAULT '{}',
  cell_metadata JSONB DEFAULT '{}',
  -- 5 GENERATED ALWAYS AS ... STORED
  delta_dn BOOLEAN GENERATED ALWAYS AS (
    dn_emis IS NOT NULL AND dn_buta IS NOT NULL AND dn_emis IS DISTINCT FROM dn_buta
  ) STORED,
  delta_pn BOOLEAN GENERATED ALWAYS AS (
    pn_emis IS NOT NULL AND pn_buta IS NOT NULL AND pn_emis IS DISTINCT FROM pn_buta
  ) STORED,
  nb_tiges_retenu TEXT GENERATED ALWAYS AS (COALESCE(nb_tiges_emis, nb_tiges_buta)) STORED,
  matiere_tiges_retenu TEXT GENERATED ALWAYS AS (COALESCE(matiere_tiges_emis, matiere_tiges_buta)) STORED,
  matiere_joint_retenu TEXT GENERATED ALWAYS AS (COALESCE(matiere_joint_emis, matiere_joint_buta)) STORED
);

-- Tables de reference
CREATE TABLE IF NOT EXISTS operations_ref (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  operation_type TEXT NOT NULL UNIQUE,
  nb_jp INTEGER NOT NULL DEFAULT 0,
  nb_bp INTEGER NOT NULL DEFAULT 0,
  nb_joints_prov INTEGER NOT NULL DEFAULT 0,
  nb_joints_def INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS dropdown_lists (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category TEXT NOT NULL,
  value TEXT NOT NULL,
  sort_order INTEGER NOT NULL DEFAULT 0,
  UNIQUE(category, value)
);

CREATE TABLE IF NOT EXISTS column_synonyms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  file_type TEXT NOT NULL CHECK (file_type IN ('lut', 'jt')),
  db_field TEXT NOT NULL,
  synonym TEXT NOT NULL,
  source TEXT DEFAULT 'user',
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(file_type, db_field, synonym)
);

CREATE TABLE IF NOT EXISTS bolt_specs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  face_type TEXT NOT NULL CHECK (face_type IN ('RF', 'RTJ')),
  dn NUMERIC NOT NULL,
  pn TEXT NOT NULL,
  dn_pn_key TEXT,
  nb_tiges INTEGER NOT NULL,
  designation_tige TEXT,
  diametre_tige NUMERIC NOT NULL,
  longueur_tige NUMERIC,
  cle NUMERIC,
  UNIQUE(face_type, dn, pn)
);

-- Sessions terrain (offline)
CREATE TABLE IF NOT EXISTS field_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id),
  owner_id UUID NOT NULL REFERENCES auth.users(id),
  name TEXT NOT NULL,
  status TEXT DEFAULT 'preparing' CHECK (status IN ('preparing', 'active', 'syncing', 'synced')),
  selected_fields TEXT[] DEFAULT NULL,
  downloaded_at TIMESTAMPTZ,
  synced_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS field_session_items (
  session_id UUID NOT NULL REFERENCES field_sessions(id) ON DELETE CASCADE,
  ot_item_id UUID NOT NULL REFERENCES ot_items(id),
  PRIMARY KEY (session_id, ot_item_id)
);

CREATE TABLE IF NOT EXISTS equipment_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES projects(id),
  ot_item_id UUID REFERENCES ot_items(id),
  filename TEXT NOT NULL,
  storage_path TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Archives (pas de GENERATED — valeurs figees)
CREATE TABLE IF NOT EXISTS ot_items_archive (
  archive_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  archived_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  archived_reason TEXT DEFAULT 'reimport',
  -- Miroir de ot_items
  id UUID NOT NULL,
  project_id UUID NOT NULL,
  numero_ligne TEXT,
  ot TEXT,
  lot TEXT,
  unite TEXT,
  item TEXT NOT NULL,
  titre_gamme TEXT,
  famille_item TEXT,
  type_item TEXT,
  type_travaux TEXT,
  statut TEXT,
  revision TEXT,
  commentaires TEXT,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ,
  extra_columns JSONB DEFAULT '{}',
  cell_metadata JSONB DEFAULT '{}'
);

CREATE TABLE IF NOT EXISTS flanges_archive (
  archive_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  archived_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  archived_reason TEXT DEFAULT 'reimport',
  -- Miroir complet de flanges (GENERATED deviennent colonnes normales)
  id UUID NOT NULL,
  project_id UUID NOT NULL,
  ot_item_id UUID NOT NULL,
  id_ubleam TEXT,
  nom TEXT,
  zone TEXT,
  famille_travaux TEXT,
  type TEXT,
  repere_buta TEXT,
  repere_emis TEXT,
  repere_ubleam TEXT,
  commentaire_repere TEXT,
  dn_emis TEXT,
  dn_buta TEXT,
  delta_dn TEXT,
  pn_emis TEXT,
  pn_buta TEXT,
  delta_pn TEXT,
  operation TEXT,
  barrette TEXT,
  nb_jp_emis TEXT,
  nb_jp_buta TEXT,
  nb_bp_emis TEXT,
  nb_bp_buta TEXT,
  materiel_emis TEXT,
  materiel_buta TEXT,
  materiel_adf TEXT,
  cle TEXT,
  nb_tiges_emis TEXT,
  nb_tiges_buta TEXT,
  nb_tiges_retenu TEXT,
  matiere_tiges_emis TEXT,
  matiere_tiges_buta TEXT,
  matiere_tiges_retenu TEXT,
  diametre_tige TEXT,
  longueur_tige TEXT,
  nb_joints_prov TEXT,
  nb_joints_def TEXT,
  matiere_joint_emis TEXT,
  matiere_joint_buta TEXT,
  matiere_joint_retenu TEXT,
  rondelle TEXT,
  face_bride TEXT,
  commentaires TEXT,
  responsable TEXT,
  rob TEXT,
  rob_pair_id UUID,
  rob_side TEXT,
  calorifuge TEXT,
  echafaudage TEXT,
  echaf_longueur TEXT,
  echaf_largeur TEXT,
  echaf_hauteur TEXT,
  field_status TEXT,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ,
  extra_columns JSONB DEFAULT '{}',
  cell_metadata JSONB DEFAULT '{}'
);

-- ===================== INDEXES =====================

-- ot_items
CREATE INDEX IF NOT EXISTS idx_ot_items_project ON ot_items(project_id);
CREATE INDEX IF NOT EXISTS idx_ot_items_item ON ot_items(item);

-- flanges
CREATE INDEX IF NOT EXISTS idx_flanges_project ON flanges(project_id);
CREATE INDEX IF NOT EXISTS idx_flanges_ot_item ON flanges(ot_item_id);
CREATE INDEX IF NOT EXISTS idx_flanges_rob ON flanges(project_id) WHERE (rob IS NOT NULL);
CREATE INDEX IF NOT EXISTS idx_flanges_rob_pair ON flanges(rob_pair_id) WHERE (rob_pair_id IS NOT NULL);
CREATE UNIQUE INDEX IF NOT EXISTS uq_flanges_pair_side ON flanges(rob_pair_id, rob_side) WHERE (rob_pair_id IS NOT NULL);
CREATE INDEX IF NOT EXISTS idx_flanges_ot_item_field_status ON flanges(ot_item_id, field_status);

-- archives
CREATE INDEX IF NOT EXISTS idx_ot_archive_project ON ot_items_archive(project_id);
CREATE INDEX IF NOT EXISTS idx_flanges_archive_project ON flanges_archive(project_id);

-- field_sessions
CREATE INDEX IF NOT EXISTS idx_field_sessions_project ON field_sessions(project_id);
CREATE INDEX IF NOT EXISTS idx_field_sessions_owner ON field_sessions(owner_id);

-- equipment_plans
CREATE INDEX IF NOT EXISTS idx_equipment_plans_project ON equipment_plans(project_id);
CREATE INDEX IF NOT EXISTS idx_equipment_plans_ot_item ON equipment_plans(ot_item_id);

-- bolt_specs (lookup)
CREATE INDEX IF NOT EXISTS idx_bolt_specs_lookup ON bolt_specs(face_type, dn, pn);

-- ===================== TRIGGERS =====================

CREATE TRIGGER set_updated_at BEFORE UPDATE ON projects
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER set_updated_at BEFORE UPDATE ON ot_items
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER set_updated_at BEFORE UPDATE ON flanges
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER set_updated_at BEFORE UPDATE ON import_templates
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ===================== RLS =====================

-- projects
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
CREATE POLICY projects_select ON projects FOR SELECT USING (owner_id = auth.uid());
CREATE POLICY projects_insert ON projects FOR INSERT WITH CHECK (owner_id = auth.uid());
CREATE POLICY projects_update ON projects FOR UPDATE USING (owner_id = auth.uid());
CREATE POLICY projects_delete ON projects FOR DELETE USING (owner_id = auth.uid());

-- ot_items (via project owner)
ALTER TABLE ot_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY ot_items_select ON ot_items FOR SELECT
  USING (project_id IN (SELECT id FROM projects WHERE owner_id = auth.uid()));
CREATE POLICY ot_items_insert ON ot_items FOR INSERT
  WITH CHECK (project_id IN (SELECT id FROM projects WHERE owner_id = auth.uid()));
CREATE POLICY ot_items_update ON ot_items FOR UPDATE
  USING (project_id IN (SELECT id FROM projects WHERE owner_id = auth.uid()));
CREATE POLICY ot_items_delete ON ot_items FOR DELETE
  USING (project_id IN (SELECT id FROM projects WHERE owner_id = auth.uid()));

-- flanges (via project owner)
ALTER TABLE flanges ENABLE ROW LEVEL SECURITY;
CREATE POLICY flanges_select ON flanges FOR SELECT
  USING (project_id IN (SELECT id FROM projects WHERE owner_id = auth.uid()));
CREATE POLICY flanges_insert ON flanges FOR INSERT
  WITH CHECK (project_id IN (SELECT id FROM projects WHERE owner_id = auth.uid()));
CREATE POLICY flanges_update ON flanges FOR UPDATE
  USING (project_id IN (SELECT id FROM projects WHERE owner_id = auth.uid()));
CREATE POLICY flanges_delete ON flanges FOR DELETE
  USING (project_id IN (SELECT id FROM projects WHERE owner_id = auth.uid()));

-- import_templates (lecture ouverte, ecriture par owner)
ALTER TABLE import_templates ENABLE ROW LEVEL SECURITY;
CREATE POLICY import_templates_select ON import_templates FOR SELECT USING (true);
CREATE POLICY import_templates_insert ON import_templates FOR INSERT WITH CHECK (true);
CREATE POLICY import_templates_update ON import_templates FOR UPDATE USING (true);

-- Reference tables (read-only pour tous)
ALTER TABLE operations_ref ENABLE ROW LEVEL SECURITY;
CREATE POLICY operations_ref_select ON operations_ref FOR SELECT USING (true);

ALTER TABLE dropdown_lists ENABLE ROW LEVEL SECURITY;
CREATE POLICY dropdown_lists_select ON dropdown_lists FOR SELECT USING (true);

ALTER TABLE column_synonyms ENABLE ROW LEVEL SECURITY;
CREATE POLICY column_synonyms_select ON column_synonyms FOR SELECT USING (true);
CREATE POLICY column_synonyms_insert ON column_synonyms FOR INSERT WITH CHECK (true);

ALTER TABLE bolt_specs ENABLE ROW LEVEL SECURITY;
CREATE POLICY bolt_specs_select ON bolt_specs FOR SELECT USING (true);

-- field_sessions (owner-only)
ALTER TABLE field_sessions ENABLE ROW LEVEL SECURITY;
CREATE POLICY field_sessions_select ON field_sessions FOR SELECT USING (owner_id = auth.uid());
CREATE POLICY field_sessions_insert ON field_sessions FOR INSERT WITH CHECK (owner_id = auth.uid());
CREATE POLICY field_sessions_update ON field_sessions FOR UPDATE USING (owner_id = auth.uid());
CREATE POLICY field_sessions_delete ON field_sessions FOR DELETE USING (owner_id = auth.uid());

-- field_session_items (via session owner)
ALTER TABLE field_session_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY field_session_items_select ON field_session_items FOR SELECT
  USING (session_id IN (SELECT id FROM field_sessions WHERE owner_id = auth.uid()));
CREATE POLICY field_session_items_insert ON field_session_items FOR INSERT
  WITH CHECK (session_id IN (SELECT id FROM field_sessions WHERE owner_id = auth.uid()));
CREATE POLICY field_session_items_delete ON field_session_items FOR DELETE
  USING (session_id IN (SELECT id FROM field_sessions WHERE owner_id = auth.uid()));

-- equipment_plans (via project owner)
ALTER TABLE equipment_plans ENABLE ROW LEVEL SECURITY;
CREATE POLICY equipment_plans_select ON equipment_plans FOR SELECT
  USING (project_id IN (SELECT id FROM projects WHERE owner_id = auth.uid()));
CREATE POLICY equipment_plans_insert ON equipment_plans FOR INSERT
  WITH CHECK (project_id IN (SELECT id FROM projects WHERE owner_id = auth.uid()));
CREATE POLICY equipment_plans_delete ON equipment_plans FOR DELETE
  USING (project_id IN (SELECT id FROM projects WHERE owner_id = auth.uid()));

-- Archives (via project owner)
ALTER TABLE ot_items_archive ENABLE ROW LEVEL SECURITY;
CREATE POLICY ot_items_archive_select ON ot_items_archive FOR SELECT
  USING (project_id IN (SELECT id FROM projects WHERE owner_id = auth.uid()));
CREATE POLICY ot_items_archive_insert ON ot_items_archive FOR INSERT
  WITH CHECK (project_id IN (SELECT id FROM projects WHERE owner_id = auth.uid()));

ALTER TABLE flanges_archive ENABLE ROW LEVEL SECURITY;
CREATE POLICY flanges_archive_select ON flanges_archive FOR SELECT
  USING (project_id IN (SELECT id FROM projects WHERE owner_id = auth.uid()));
CREATE POLICY flanges_archive_insert ON flanges_archive FOR INSERT
  WITH CHECK (project_id IN (SELECT id FROM projects WHERE owner_id = auth.uid()));
