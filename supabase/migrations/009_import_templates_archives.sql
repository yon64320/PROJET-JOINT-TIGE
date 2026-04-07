-- ============================================================
-- Migration 009 : Tables import_templates, column_synonyms,
--                 archives, RPC pair_flanges
-- ============================================================

-- =====================
-- 1. import_templates
-- =====================
CREATE TABLE IF NOT EXISTS import_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID REFERENCES auth.users(id),
  name TEXT NOT NULL,
  file_type TEXT NOT NULL CHECK (file_type IN ('lut', 'jt')),
  fingerprint TEXT NOT NULL,
  header_row INTEGER NOT NULL DEFAULT 0,
  column_mapping JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_import_templates_fingerprint
  ON import_templates(fingerprint, file_type);

-- 2. column_synonyms (synonymes appris par les utilisateurs)
CREATE TABLE IF NOT EXISTS column_synonyms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID REFERENCES auth.users(id),
  file_type TEXT NOT NULL CHECK (file_type IN ('lut', 'jt')),
  db_field TEXT NOT NULL,
  synonym TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (file_type, db_field, synonym)
);

-- =====================
-- 3. ot_items_archive
-- =====================
CREATE TABLE IF NOT EXISTS ot_items_archive (
  id UUID NOT NULL,
  project_id UUID NOT NULL,
  numero_ligne INTEGER,
  ot TEXT,
  lot TEXT,
  unite TEXT,
  item TEXT NOT NULL,
  titre_gamme TEXT,
  famille_item TEXT,
  type_item TEXT,
  type_travaux TEXT,
  statut TEXT,
  corps_metier_echaf BOOLEAN,
  corps_metier_calo BOOLEAN,
  corps_metier_montage BOOLEAN,
  corps_metier_metal BOOLEAN,
  corps_metier_fourniture BOOLEAN,
  corps_metier_nettoyage BOOLEAN,
  corps_metier_autres BOOLEAN,
  revision TEXT,
  commentaires TEXT,
  extra_columns JSONB,
  cell_metadata JSONB,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ,
  -- Archive metadata
  archived_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  archived_reason TEXT DEFAULT 'reimport'
);

CREATE INDEX IF NOT EXISTS idx_ot_items_archive_project
  ON ot_items_archive(project_id);

-- =====================
-- 4. flanges_archive
-- =====================
CREATE TABLE IF NOT EXISTS flanges_archive (
  id UUID NOT NULL,
  project_id UUID NOT NULL,
  ot_item_id UUID NOT NULL,
  -- Identification
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
  -- DN triplet (GENERATED → snapshot)
  dn_emis NUMERIC,
  dn_buta NUMERIC,
  delta_dn BOOLEAN,
  -- PN triplet (GENERATED → snapshot)
  pn_emis NUMERIC,
  pn_buta NUMERIC,
  delta_pn BOOLEAN,
  -- Operation
  operation TEXT,
  barrette TEXT,
  -- Materiel
  nb_jp_emis INTEGER,
  nb_jp_buta INTEGER,
  nb_bp_emis INTEGER,
  nb_bp_buta INTEGER,
  materiel_emis TEXT,
  materiel_buta TEXT,
  materiel_adf TEXT,
  cle TEXT,
  -- Tiges (GENERATED → snapshot)
  nb_tiges_emis INTEGER,
  nb_tiges_buta INTEGER,
  nb_tiges_retenu INTEGER,
  matiere_tiges_emis TEXT,
  matiere_tiges_buta TEXT,
  matiere_tiges_retenu TEXT,
  diametre_tige NUMERIC,
  longueur_tige NUMERIC,
  -- Joints
  nb_joints_prov INTEGER,
  nb_joints_def INTEGER,
  matiere_joint_emis TEXT,
  matiere_joint_buta TEXT,
  matiere_joint_retenu TEXT,
  -- Complements
  rondelle TEXT,
  face_bride TEXT,
  commentaires TEXT,
  responsable TEXT,
  rob BOOLEAN,
  rob_pair_id UUID,
  rob_side TEXT,
  -- Terrain
  calorifuge BOOLEAN,
  echafaudage BOOLEAN,
  field_status TEXT,
  extra_columns JSONB,
  cell_metadata JSONB,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ,
  -- Archive metadata
  archived_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  archived_reason TEXT DEFAULT 'reimport'
);

CREATE INDEX IF NOT EXISTS idx_flanges_archive_project
  ON flanges_archive(project_id);

-- =====================
-- 5. RLS for new tables
-- =====================

-- import_templates: read all authenticated, write by owner
ALTER TABLE import_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "import_templates_select" ON import_templates
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "import_templates_insert" ON import_templates
  FOR INSERT TO authenticated WITH CHECK (owner_id = auth.uid());
CREATE POLICY "import_templates_update" ON import_templates
  FOR UPDATE TO authenticated USING (owner_id = auth.uid());
CREATE POLICY "import_templates_delete" ON import_templates
  FOR DELETE TO authenticated USING (owner_id = auth.uid());

-- column_synonyms: same pattern
ALTER TABLE column_synonyms ENABLE ROW LEVEL SECURITY;

CREATE POLICY "column_synonyms_select" ON column_synonyms
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "column_synonyms_insert" ON column_synonyms
  FOR INSERT TO authenticated WITH CHECK (owner_id = auth.uid());
CREATE POLICY "column_synonyms_update" ON column_synonyms
  FOR UPDATE TO authenticated USING (owner_id = auth.uid());
CREATE POLICY "column_synonyms_delete" ON column_synonyms
  FOR DELETE TO authenticated USING (owner_id = auth.uid());

-- ot_items_archive: read by project owner
ALTER TABLE ot_items_archive ENABLE ROW LEVEL SECURITY;

CREATE POLICY "ot_items_archive_select" ON ot_items_archive
  FOR SELECT TO authenticated
  USING (project_id IN (SELECT id FROM projects WHERE owner_id = auth.uid()));

-- flanges_archive: read by project owner
ALTER TABLE flanges_archive ENABLE ROW LEVEL SECURITY;

CREATE POLICY "flanges_archive_select" ON flanges_archive
  FOR SELECT TO authenticated
  USING (project_id IN (SELECT id FROM projects WHERE owner_id = auth.uid()));

-- =====================
-- 6. FK projects → import_templates
-- =====================
ALTER TABLE projects
  ADD CONSTRAINT fk_projects_last_import_template
  FOREIGN KEY (last_import_template_id)
  REFERENCES import_templates(id)
  ON DELETE SET NULL;

-- =====================
-- 7. RPC pair_flanges — transaction atomique
-- =====================
CREATE OR REPLACE FUNCTION pair_flanges(
  p_flange_a UUID,
  p_flange_b UUID,
  p_pair_id UUID,
  p_side_a TEXT,
  p_side_b TEXT
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE flanges SET rob_pair_id = p_pair_id, rob_side = p_side_a WHERE id = p_flange_a;
  UPDATE flanges SET rob_pair_id = p_pair_id, rob_side = p_side_b WHERE id = p_flange_b;
END;
$$;

-- =====================
-- 8. Triggers updated_at
-- =====================
CREATE TRIGGER tr_import_templates_updated_at
  BEFORE UPDATE ON import_templates FOR EACH ROW EXECUTE FUNCTION update_updated_at();
