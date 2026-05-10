-- =============================================================
-- 008_echafaudage_feb.sql — FEB Échafaudage (Fiche d'Expression du Besoin)
-- 2026-05-10
--
-- Ajoute :
--   - Colonne echaf_feb JSONB sur flanges + flanges_archive
--     (regroupe ~25 champs FEB : type, options, planchers, travaux,
--     contraintes, dates, descriptif, prescriptions, entreprises…)
--   - RPC merge_echaf_feb : merge atomique d'une sous-clé du JSONB,
--     pour l'édition cellule par cellule du tableur Échafaudage.
--
-- Idempotent : ADD COLUMN IF NOT EXISTS / CREATE OR REPLACE
-- =============================================================

ALTER TABLE flanges          ADD COLUMN IF NOT EXISTS echaf_feb JSONB;
ALTER TABLE flanges_archive  ADD COLUMN IF NOT EXISTS echaf_feb JSONB;

-- merge_echaf_feb : merge JSONB cible + check ownership.
-- Utilisée par /api/flanges PATCH quand l'édition cible une sous-clé
-- (ex. echaf_feb.types, echaf_feb.descriptif). Évite le read-modify-write.
CREATE OR REPLACE FUNCTION merge_echaf_feb(p_flange_id UUID, p_key TEXT, p_value JSONB)
RETURNS VOID AS $$
DECLARE
  v_owner UUID;
BEGIN
  SELECT p.owner_id
    INTO v_owner
    FROM flanges f
    JOIN ot_items oi ON oi.id = f.ot_item_id
    JOIN projects p  ON p.id  = oi.project_id
   WHERE f.id = p_flange_id;

  IF v_owner IS NULL THEN
    RAISE EXCEPTION 'Bride introuvable';
  END IF;

  IF v_owner <> auth.uid() AND NOT is_admin() THEN
    RAISE EXCEPTION 'Acces refuse';
  END IF;

  UPDATE flanges
     SET echaf_feb = COALESCE(echaf_feb, '{}'::jsonb) || jsonb_build_object(p_key, p_value)
   WHERE id = p_flange_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

GRANT EXECUTE ON FUNCTION merge_echaf_feb(UUID, TEXT, JSONB) TO authenticated;
