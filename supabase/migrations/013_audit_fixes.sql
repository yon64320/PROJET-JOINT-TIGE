-- =============================================================
-- 013_audit_fixes.sql — Correctifs post-audit securite 2026-04-22
-- RLS, search_path, validation fonctions, index
-- =============================================================

-- ===================== 1. RLS — reactiver sur toutes les tables =====================
-- Les policies existent deja dans 001_schema.sql mais RLS etait desactive en prod

ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE ot_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE flanges ENABLE ROW LEVEL SECURITY;
ALTER TABLE import_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE column_synonyms ENABLE ROW LEVEL SECURITY;
ALTER TABLE field_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE field_session_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE equipment_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE ot_items_archive ENABLE ROW LEVEL SECURITY;
ALTER TABLE flanges_archive ENABLE ROW LEVEL SECURITY;

-- ===================== 2. search_path sur les fonctions =====================

ALTER FUNCTION update_updated_at() SET search_path = public;
ALTER FUNCTION merge_extra_column(TEXT, UUID, TEXT, TEXT) SET search_path = public;
ALTER FUNCTION pair_flanges(UUID, UUID, UUID, TEXT, TEXT) SET search_path = public;

-- ===================== 3. Securiser merge_extra_column (whitelist) =====================

CREATE OR REPLACE FUNCTION merge_extra_column(
  p_table TEXT, p_id UUID, p_key TEXT, p_value TEXT
) RETURNS VOID AS $$
BEGIN
  IF p_table NOT IN ('ot_items', 'flanges') THEN
    RAISE EXCEPTION 'Table non autorisee: %', p_table;
  END IF;
  EXECUTE format(
    'UPDATE %I SET extra_columns = extra_columns || jsonb_build_object($1, $2) WHERE id = $3',
    p_table
  ) USING p_key, p_value, p_id;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- ===================== 4. Securiser pair_flanges (validation) =====================

CREATE OR REPLACE FUNCTION pair_flanges(
  p_flange_a UUID, p_flange_b UUID, p_pair_id UUID, p_side_a TEXT, p_side_b TEXT
) RETURNS VOID AS $$
DECLARE
  v_count INTEGER;
BEGIN
  SELECT count(*) INTO v_count FROM flanges WHERE id IN (p_flange_a, p_flange_b);
  IF v_count != 2 THEN
    RAISE EXCEPTION 'Une ou les deux brides introuvables (a=%, b=%)', p_flange_a, p_flange_b;
  END IF;
  UPDATE flanges SET rob_pair_id = p_pair_id, rob_side = p_side_a WHERE id = p_flange_a;
  UPDATE flanges SET rob_pair_id = p_pair_id, rob_side = p_side_b WHERE id = p_flange_b;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- ===================== 5. Index manquants sur FK =====================

CREATE INDEX IF NOT EXISTS idx_fsi_ot_item ON field_session_items(ot_item_id);
CREATE INDEX IF NOT EXISTS idx_projects_owner ON projects(owner_id);

-- ===================== 6. Supprimer index doublon =====================
-- bolt_specs_face_type_dn_pn_key (UNIQUE constraint) couvre deja ces colonnes

DROP INDEX IF EXISTS idx_bolt_specs_lookup;
