-- Migration 013: RPCs transactionnelles pour delete cascade et reimport atomique

-- 1. Suppression projet en cascade (transaction unique)
CREATE OR REPLACE FUNCTION delete_project_cascade(p_project_id UUID)
RETURNS VOID AS $$
BEGIN
  DELETE FROM field_sessions WHERE project_id = p_project_id;
  DELETE FROM equipment_plans WHERE project_id = p_project_id;
  DELETE FROM flanges_archive WHERE project_id = p_project_id;
  DELETE FROM flanges WHERE project_id = p_project_id;
  DELETE FROM ot_items_archive WHERE project_id = p_project_id;
  DELETE FROM ot_items WHERE project_id = p_project_id;
  DELETE FROM import_templates WHERE project_id = p_project_id;
  DELETE FROM projects WHERE id = p_project_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. Archive + delete LUT atomiquement (avant reimport)
CREATE OR REPLACE FUNCTION reimport_archive_lut(p_project_id UUID)
RETURNS INTEGER AS $$
DECLARE
  archived_flanges INTEGER := 0;
  archived_ots INTEGER := 0;
BEGIN
  INSERT INTO flanges_archive
    SELECT f.*, now() AS archived_at, 'reimport_lut' AS archived_reason
    FROM flanges f WHERE f.project_id = p_project_id;
  GET DIAGNOSTICS archived_flanges = ROW_COUNT;

  INSERT INTO ot_items_archive
    SELECT o.*, now() AS archived_at, 'reimport_lut' AS archived_reason
    FROM ot_items o WHERE o.project_id = p_project_id;
  GET DIAGNOSTICS archived_ots = ROW_COUNT;

  DELETE FROM flanges WHERE project_id = p_project_id;
  DELETE FROM ot_items WHERE project_id = p_project_id;

  RETURN archived_flanges + archived_ots;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Archive + delete J&T atomiquement (avant reimport)
CREATE OR REPLACE FUNCTION reimport_archive_jt(p_project_id UUID)
RETURNS INTEGER AS $$
DECLARE
  archived INTEGER := 0;
BEGIN
  INSERT INTO flanges_archive
    SELECT f.*, now() AS archived_at, 'reimport_jt' AS archived_reason
    FROM flanges f WHERE f.project_id = p_project_id;
  GET DIAGNOSTICS archived = ROW_COUNT;

  DELETE FROM flanges WHERE project_id = p_project_id;

  RETURN archived;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
