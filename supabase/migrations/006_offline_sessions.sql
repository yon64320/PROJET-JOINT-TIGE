-- Migration 006: Offline field sessions + bolt specs
-- Adds terrain/offline support for J&T field data collection

-- 1. New columns on flanges for field work
ALTER TABLE flanges
  ADD COLUMN IF NOT EXISTS calorifuge BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS echafaudage BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS field_status TEXT DEFAULT 'pending'
    CHECK (field_status IN ('pending', 'in_progress', 'completed'));

-- 2. Bolt specifications reference table (from Tiges sheet)
CREATE TABLE IF NOT EXISTS bolt_specs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  face_type TEXT NOT NULL CHECK (face_type IN ('RF', 'RTJ')),
  dn NUMERIC NOT NULL,
  pn TEXT NOT NULL,                    -- TEXT because ASME classes like 'R11', '#75 Série B'
  dn_pn_key TEXT,                      -- concat key for VLOOKUP compatibility
  nb_tiges INTEGER NOT NULL,
  designation_tige TEXT,               -- "M 14 x 70"
  diametre_tige NUMERIC NOT NULL,
  longueur_tige NUMERIC,
  cle NUMERIC,                         -- wrench size in mm
  UNIQUE(face_type, dn, pn)
);

CREATE INDEX IF NOT EXISTS idx_bolt_specs_lookup ON bolt_specs(face_type, dn, pn);

-- 3. Field sessions
CREATE TABLE IF NOT EXISTS field_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  owner_id UUID NOT NULL REFERENCES auth.users(id),
  name TEXT NOT NULL,
  status TEXT DEFAULT 'preparing'
    CHECK (status IN ('preparing', 'active', 'syncing', 'synced')),
  downloaded_at TIMESTAMPTZ,
  synced_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_field_sessions_project ON field_sessions(project_id);
CREATE INDEX IF NOT EXISTS idx_field_sessions_owner ON field_sessions(owner_id);

-- 4. Session scope (which OT items are included)
CREATE TABLE IF NOT EXISTS field_session_items (
  session_id UUID REFERENCES field_sessions(id) ON DELETE CASCADE,
  ot_item_id UUID REFERENCES ot_items(id) ON DELETE CASCADE,
  PRIMARY KEY (session_id, ot_item_id)
);

-- 5. Equipment plans (PDF attachments)
CREATE TABLE IF NOT EXISTS equipment_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  ot_item_id UUID REFERENCES ot_items(id) ON DELETE SET NULL,
  filename TEXT NOT NULL,
  storage_path TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_equipment_plans_project ON equipment_plans(project_id);
CREATE INDEX IF NOT EXISTS idx_equipment_plans_ot_item ON equipment_plans(ot_item_id);

-- 6. RLS policies for new tables
ALTER TABLE bolt_specs ENABLE ROW LEVEL SECURITY;
ALTER TABLE field_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE field_session_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE equipment_plans ENABLE ROW LEVEL SECURITY;

-- bolt_specs: read-only for all authenticated users
CREATE POLICY "bolt_specs_select" ON bolt_specs FOR SELECT TO authenticated USING (true);

-- field_sessions: owner only
CREATE POLICY "field_sessions_select" ON field_sessions FOR SELECT TO authenticated
  USING (owner_id = auth.uid());
CREATE POLICY "field_sessions_insert" ON field_sessions FOR INSERT TO authenticated
  WITH CHECK (owner_id = auth.uid());
CREATE POLICY "field_sessions_update" ON field_sessions FOR UPDATE TO authenticated
  USING (owner_id = auth.uid());
CREATE POLICY "field_sessions_delete" ON field_sessions FOR DELETE TO authenticated
  USING (owner_id = auth.uid());

-- field_session_items: via session ownership
CREATE POLICY "field_session_items_select" ON field_session_items FOR SELECT TO authenticated
  USING (session_id IN (SELECT id FROM field_sessions WHERE owner_id = auth.uid()));
CREATE POLICY "field_session_items_insert" ON field_session_items FOR INSERT TO authenticated
  WITH CHECK (session_id IN (SELECT id FROM field_sessions WHERE owner_id = auth.uid()));
CREATE POLICY "field_session_items_delete" ON field_session_items FOR DELETE TO authenticated
  USING (session_id IN (SELECT id FROM field_sessions WHERE owner_id = auth.uid()));

-- equipment_plans: via project ownership
CREATE POLICY "equipment_plans_select" ON equipment_plans FOR SELECT TO authenticated
  USING (project_id IN (SELECT id FROM projects WHERE owner_id = auth.uid()));
CREATE POLICY "equipment_plans_insert" ON equipment_plans FOR INSERT TO authenticated
  WITH CHECK (project_id IN (SELECT id FROM projects WHERE owner_id = auth.uid()));
CREATE POLICY "equipment_plans_delete" ON equipment_plans FOR DELETE TO authenticated
  USING (project_id IN (SELECT id FROM projects WHERE owner_id = auth.uid()));
