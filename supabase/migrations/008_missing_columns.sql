-- ============================================================
-- Migration 008 : Colonnes manquantes détectées par audit
-- Ajoute les colonnes JSONB et booléennes utilisées par le code
-- mais jamais créées en base.
-- ============================================================

-- 1. ot_items : extra_columns + cell_metadata (utilisés par import-lut.ts)
ALTER TABLE ot_items
  ADD COLUMN IF NOT EXISTS extra_columns JSONB DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS cell_metadata JSONB DEFAULT '{}';

-- 2. flanges : extra_columns + cell_metadata + rob (utilisés par import-jt.ts + /api/robinetterie)
ALTER TABLE flanges
  ADD COLUMN IF NOT EXISTS extra_columns JSONB DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS cell_metadata JSONB DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS rob BOOLEAN DEFAULT FALSE;

-- 3. projects : header_colors + last_import_template_id (utilisés par import/confirm)
ALTER TABLE projects
  ADD COLUMN IF NOT EXISTS header_colors JSONB DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS last_import_template_id UUID;

-- 4. Index partiels pour les requêtes fréquentes
CREATE INDEX IF NOT EXISTS idx_flanges_rob ON flanges(project_id) WHERE rob = true;
CREATE INDEX IF NOT EXISTS idx_ot_items_statut ON ot_items(project_id, statut);

-- 5. RLS read-only sur tables de référence (oubliées dans migration 005)
ALTER TABLE operations_ref ENABLE ROW LEVEL SECURITY;
ALTER TABLE dropdown_lists ENABLE ROW LEVEL SECURITY;

CREATE POLICY "operations_ref_select" ON operations_ref
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "dropdown_lists_select" ON dropdown_lists
  FOR SELECT TO authenticated USING (true);
