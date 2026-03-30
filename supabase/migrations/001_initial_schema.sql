-- ============================================
-- Schéma initial — EMIS Préparation d'arrêts
-- ============================================

-- Projets (arrêts de maintenance)
CREATE TABLE projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  client TEXT NOT NULL,
  units TEXT[] NOT NULL DEFAULT '{}',
  revision TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- LUT — Ordres de travail
CREATE TABLE ot_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,

  -- Identification
  numero_ligne INTEGER,
  ot TEXT,
  lot TEXT,
  unite TEXT,
  item TEXT NOT NULL,                        -- Clé métier (col I)
  titre_gamme TEXT,
  famille_item TEXT,                          -- Equipement, Intervention, NC, OTG, Robinetterie, Tuyauterie
  type_item TEXT,                             -- Colonne, Filtre, Ballon, Echangeur, Aéro, Capacité, Réacteur...
  type_travaux TEXT,                          -- H0, K0, L0, N0, T0
  statut TEXT CHECK (statut IN ('TB', 'TC', 'TA')),  -- Base, Complémentaire, Annulé

  -- Corps de métier (7 colonnes cochées X)
  corps_metier_echaf BOOLEAN NOT NULL DEFAULT FALSE,
  corps_metier_calo BOOLEAN NOT NULL DEFAULT FALSE,
  corps_metier_montage BOOLEAN NOT NULL DEFAULT FALSE,
  corps_metier_metal BOOLEAN NOT NULL DEFAULT FALSE,
  corps_metier_fourniture BOOLEAN NOT NULL DEFAULT FALSE,
  corps_metier_nettoyage BOOLEAN NOT NULL DEFAULT FALSE,
  corps_metier_autres BOOLEAN NOT NULL DEFAULT FALSE,

  revision TEXT,
  commentaires TEXT,

  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  -- Un ITEM est unique par projet
  UNIQUE (project_id, item)
);

-- J&T — Brides (joints cassés)
CREATE TABLE flanges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  ot_item_id UUID NOT NULL REFERENCES ot_items(id) ON DELETE CASCADE,

  -- Identification (cols A-E)
  id_ubleam TEXT,
  nom TEXT,
  zone TEXT,
  famille_travaux TEXT,
  type TEXT,

  -- Repères bride (cols F-I)
  repere_buta TEXT,
  repere_emis TEXT,
  repere_ubleam TEXT,
  commentaire_repere TEXT,

  -- DN (cols Q-S) — triplet
  dn_emis NUMERIC,
  dn_buta NUMERIC,
  delta_dn BOOLEAN GENERATED ALWAYS AS (
    dn_emis IS NOT NULL AND dn_buta IS NOT NULL AND dn_emis != dn_buta
  ) STORED,

  -- PN (cols T-V) — triplet
  pn_emis NUMERIC,
  pn_buta NUMERIC,
  delta_pn BOOLEAN GENERATED ALWAYS AS (
    pn_emis IS NOT NULL AND pn_buta IS NOT NULL AND pn_emis != pn_buta
  ) STORED,

  -- Opération (cols X-Y)
  operation TEXT,                             -- Colonne moteur
  barrette TEXT,

  -- Matériel (cols Z-AG)
  nb_jp_emis INTEGER,
  nb_jp_buta INTEGER,
  nb_bp_emis INTEGER,
  nb_bp_buta INTEGER,
  materiel_emis TEXT,
  materiel_buta TEXT,
  materiel_adf TEXT,
  cle TEXT,

  -- Tiges quantité (cols AI-AK) — triplet
  nb_tiges_emis INTEGER,
  nb_tiges_buta INTEGER,
  nb_tiges_retenu INTEGER GENERATED ALWAYS AS (
    COALESCE(nb_tiges_emis, nb_tiges_buta)
  ) STORED,

  -- Tiges matière (cols AL-AN) — triplet
  matiere_tiges_emis TEXT,
  matiere_tiges_buta TEXT,
  matiere_tiges_retenu TEXT GENERATED ALWAYS AS (
    COALESCE(matiere_tiges_emis, matiere_tiges_buta)
  ) STORED,

  -- Tiges dimensions (cols AR-AV)
  diametre_tige NUMERIC,
  longueur_tige NUMERIC,

  -- Joints quantité — piloté par la colonne opération
  nb_joints_prov INTEGER,
  nb_joints_def INTEGER,

  -- Joints matière (cols BA-BC) — triplet
  matiere_joint_emis TEXT,
  matiere_joint_buta TEXT,
  matiere_joint_retenu TEXT GENERATED ALWAYS AS (
    COALESCE(matiere_joint_emis, matiere_joint_buta)
  ) STORED,

  -- Compléments (cols BD-BG)
  rondelle TEXT,
  face_bride TEXT,
  commentaires TEXT,

  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Table de correspondance Opérations (feuille "Operations")
CREATE TABLE operations_ref (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  operation_type TEXT NOT NULL UNIQUE,
  nb_jp INTEGER NOT NULL DEFAULT 0,
  nb_bp INTEGER NOT NULL DEFAULT 0,
  nb_joints_prov INTEGER NOT NULL DEFAULT 0,
  nb_joints_def INTEGER NOT NULL DEFAULT 0
);

-- Listes déroulantes (feuille "LISTES DEROULANTES")
CREATE TABLE dropdown_lists (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category TEXT NOT NULL,
  value TEXT NOT NULL,
  sort_order INTEGER NOT NULL DEFAULT 0,
  UNIQUE (category, value)
);

-- Index pour les requêtes fréquentes
CREATE INDEX idx_ot_items_project ON ot_items(project_id);
CREATE INDEX idx_ot_items_item ON ot_items(item);
CREATE INDEX idx_flanges_project ON flanges(project_id);
CREATE INDEX idx_flanges_ot_item ON flanges(ot_item_id);

-- Trigger updated_at
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER tr_projects_updated_at
  BEFORE UPDATE ON projects FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER tr_ot_items_updated_at
  BEFORE UPDATE ON ot_items FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER tr_flanges_updated_at
  BEFORE UPDATE ON flanges FOR EACH ROW EXECUTE FUNCTION update_updated_at();
