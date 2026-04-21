import { supabase } from "./supabase";
import { getStr } from "./utils";

/**
 * Type intentionnellement lâche à la frontière Excel → DB.
 * Les colonnes Excel varient entre préparateurs (ajout, renommage, réordonnancement).
 * Le generic-parser produit des ParsedRow avec champs dynamiques — on ne peut pas
 * contraindre plus sans casser l'import adaptatif.
 */
type JtLikeRow = Record<string, unknown>;

function buildFlangeRecord(row: JtLikeRow, projectId: string, otItemId: string) {
  return {
    project_id: projectId,
    ot_item_id: otItemId,
    id_ubleam: getStr(row, "id_ubleam"),
    nom: getStr(row, "nom"),
    zone: getStr(row, "zone"),
    famille_travaux: getStr(row, "famille_travaux"),
    type: getStr(row, "type"),
    repere_buta: getStr(row, "repere_buta"),
    repere_emis: getStr(row, "repere_emis"),
    repere_ubleam: getStr(row, "repere_ubleam"),
    commentaire_repere: getStr(row, "commentaire_repere"),
    rob: getStr(row, "rob"),
    dn_emis: getStr(row, "dn_emis"),
    dn_buta: getStr(row, "dn_buta"),
    pn_emis: getStr(row, "pn_emis"),
    pn_buta: getStr(row, "pn_buta"),
    operation: getStr(row, "operation"),
    barrette: getStr(row, "barrette"),
    nb_jp_emis: getStr(row, "nb_jp_emis"),
    nb_jp_buta: getStr(row, "nb_jp_buta"),
    nb_bp_emis: getStr(row, "nb_bp_emis"),
    nb_bp_buta: getStr(row, "nb_bp_buta"),
    materiel_emis: getStr(row, "materiel_emis"),
    materiel_buta: getStr(row, "materiel_buta"),
    materiel_adf: getStr(row, "materiel_adf"),
    cle: getStr(row, "cle"),
    nb_tiges_emis: getStr(row, "nb_tiges_emis"),
    nb_tiges_buta: getStr(row, "nb_tiges_buta"),
    matiere_tiges_emis: getStr(row, "matiere_tiges_emis"),
    matiere_tiges_buta: getStr(row, "matiere_tiges_buta"),
    diametre_tige: getStr(row, "diametre_tige"),
    longueur_tige: getStr(row, "longueur_tige"),
    designation_tige: getStr(row, "designation_tige"),
    nb_joints_prov: getStr(row, "nb_joints_prov"),
    nb_joints_def: getStr(row, "nb_joints_def"),
    matiere_joint_emis: getStr(row, "matiere_joint_emis"),
    matiere_joint_buta: getStr(row, "matiere_joint_buta"),
    rondelle: getStr(row, "rondelle"),
    face_bride: getStr(row, "face_bride"),
    commentaires: getStr(row, "commentaires"),
    calorifuge: getStr(row, "calorifuge"),
    echafaudage: getStr(row, "echafaudage"),
    field_status: "pending",
    extra_columns: row.extra_columns ?? {},
    cell_metadata: row.cell_metadata ?? {},
  };
}

async function loadItemMap(projectId: string): Promise<Map<string, string>> {
  const { data: otItems, error } = await supabase
    .from("ot_items")
    .select("id, item")
    .eq("project_id", projectId)
    .limit(10000);

  if (error || !otItems) {
    throw new Error(`Erreur chargement OTs: ${error?.message}`);
  }

  const map = new Map<string, string>();
  for (const ot of otItems) {
    // Stocke en original et en trimmed/lowercase pour matching flexible
    map.set(ot.item, ot.id);
    map.set(ot.item.trim().toLowerCase(), ot.id);
  }
  return map;
}

async function insertFlanges(
  records: Record<string, unknown>[],
): Promise<{ inserted: number; errors: string[] }> {
  const errors: string[] = [];
  let inserted = 0;
  const BATCH_SIZE = 50;

  for (let i = 0; i < records.length; i += BATCH_SIZE) {
    const batch = records.slice(i, i + BATCH_SIZE);
    const { error } = await supabase.from("flanges").insert(batch);
    if (error) {
      errors.push(`Batch ${i}-${i + batch.length}: ${error.message}`);
    } else {
      inserted += batch.length;
    }
  }

  return { inserted, errors };
}

/**
 * Insère les lignes J&T parsées dans la table flanges.
 * Nécessite que les ot_items soient déjà importés (pour la FK).
 */
export async function importJtToDb(
  rows: JtLikeRow[],
  projectId: string,
): Promise<{ inserted: number; skipped: number; errors: string[] }> {
  const itemMap = await loadItemMap(projectId);
  let skipped = 0;

  const records: Record<string, unknown>[] = [];
  for (const row of rows) {
    const nom = getStr(row, "nom");
    const otItemId = nom ? (itemMap.get(nom) ?? itemMap.get(nom.trim().toLowerCase())) : undefined;
    if (!otItemId) {
      skipped++;
      continue;
    }
    records.push(buildFlangeRecord(row, projectId, otItemId));
  }

  const result = await insertFlanges(records);
  return { ...result, skipped };
}

/**
 * Ré-importe le J&T : archive les anciennes flanges puis insère les nouvelles.
 */
export async function reimportJtToDb(
  rows: JtLikeRow[],
  projectId: string,
): Promise<{ inserted: number; skipped: number; archived: number; errors: string[] }> {
  // 1. Archive + delete atomique via RPC
  const { data: archivedCount, error: archiveError } = await supabase.rpc("reimport_archive_jt", {
    p_project_id: projectId,
  });
  const archived = archivedCount ?? 0;
  const errors: string[] = [];
  if (archiveError) {
    errors.push(`Archive error: ${archiveError.message}`);
  }

  // 2. Importer les nouvelles
  const itemMap = await loadItemMap(projectId);
  let skipped = 0;

  const records: Record<string, unknown>[] = [];
  for (const row of rows) {
    const nom = getStr(row, "nom");
    const otItemId = nom ? (itemMap.get(nom) ?? itemMap.get(nom.trim().toLowerCase())) : undefined;
    if (!otItemId) {
      skipped++;
      continue;
    }
    records.push(buildFlangeRecord(row, projectId, otItemId));
  }

  const result = await insertFlanges(records);
  return {
    ...result,
    skipped,
    archived,
    errors: [...errors, ...result.errors],
  };
}
