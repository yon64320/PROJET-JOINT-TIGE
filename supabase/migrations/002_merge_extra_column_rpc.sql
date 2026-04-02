-- Atomic JSONB merge for extra_columns (avoids read-modify-write race condition)
CREATE OR REPLACE FUNCTION merge_extra_column(
  p_table text,
  p_id uuid,
  p_key text,
  p_value jsonb
) RETURNS void AS $$
BEGIN
  IF p_table NOT IN ('flanges', 'ot_items') THEN
    RAISE EXCEPTION 'Table non autorisée: %', p_table;
  END IF;
  EXECUTE format(
    'UPDATE %I SET extra_columns = COALESCE(extra_columns, ''{}''::jsonb) || jsonb_build_object($1, $2) WHERE id = $3',
    p_table
  ) USING p_key, p_value, p_id;
END;
$$ LANGUAGE plpgsql;
