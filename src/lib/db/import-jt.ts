import type { SupabaseClient } from "@supabase/supabase-js";
import { getStr } from "./utils";
import { isOperationKnown } from "@/lib/domain/operations";

/**
 * Liste les valeurs distinctes du champ `operation` qui ne sont pas dans la
 * table de référence (HIGH-11, audit 2026-04-29). Soft warning : ces lignes
 * ne déclencheront pas la cascade automatique joints/brides — le préparateur
 * doit les saisir manuellement, ou compléter `OPERATIONS_TABLE`.
 */
function findUnknownOperations(rows: JtLikeRow[]): string[] {
  const seen = new Set<string>();
  for (const row of rows) {
    const op = getStr(row, "operation");
    if (op && !isOperationKnown(op)) seen.add(op);
  }
  return Array.from(seen).sort();
}

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
    num_rob: getStr(row, "num_rob"),
    amiante_plomb: getStr(row, "amiante_plomb"),
    operation_buta: getStr(row, "operation_buta"),
    securite_buta: getStr(row, "securite_buta"),
    sap_buta: getStr(row, "sap_buta"),
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
    dimension_tige_buta: getStr(row, "dimension_tige_buta"),
    dimension_tige_emis: getStr(row, "dimension_tige_emis"),
    nb_joints_prov_buta: getStr(row, "nb_joints_prov_buta"),
    nb_joints_prov_emis: getStr(row, "nb_joints_prov_emis"),
    nb_joints_def_buta: getStr(row, "nb_joints_def_buta"),
    nb_joints_def_emis: getStr(row, "nb_joints_def_emis"),
    matiere_joint_emis: getStr(row, "matiere_joint_emis"),
    matiere_joint_buta: getStr(row, "matiere_joint_buta"),
    rondelle_buta: getStr(row, "rondelle_buta"),
    rondelle_emis: getStr(row, "rondelle_emis"),
    face_bride_buta: getStr(row, "face_bride_buta"),
    face_bride_emis: getStr(row, "face_bride_emis"),
    commentaires: getStr(row, "commentaires"),
    calorifuge: getStr(row, "calorifuge"),
    echafaudage: getStr(row, "echafaudage"),
    field_status: "pending",
    extra_columns: row.extra_columns ?? {},
    cell_metadata: row.cell_metadata ?? {},
  };
}

async function loadItemMap(
  supabase: SupabaseClient,
  projectId: string,
): Promise<Map<string, string>> {
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
  supabase: SupabaseClient,
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
  supabase: SupabaseClient,
  rows: JtLikeRow[],
  projectId: string,
): Promise<{ inserted: number; skipped: number; errors: string[]; unknownOperations: string[] }> {
  const itemMap = await loadItemMap(supabase, projectId);
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

  const result = await insertFlanges(supabase, records);
  const unknownOperations = findUnknownOperations(rows);
  return { ...result, skipped, unknownOperations };
}

/**
 * Ré-importe le J&T : archive les anciennes flanges puis insère les nouvelles.
 *
 * Photos terrain (Phase B) : la FK `flange_photos.flange_id` est `ON DELETE
 * SET NULL`, donc la purge des anciennes brides laisse les photos orphelines
 * temporairement. Après l'INSERT des nouvelles brides, on appelle la RPC
 * `reattach_orphan_photos` qui matche par clé naturelle `(item, repere)` et
 * restaure les `flange_id`. Les photos sans match restent orphelines.
 */
export async function reimportJtToDb(
  supabase: SupabaseClient,
  rows: JtLikeRow[],
  projectId: string,
): Promise<{
  inserted: number;
  skipped: number;
  archived: number;
  errors: string[];
  unknownOperations: string[];
  photosReattached: number;
  photosOrphaned: number;
}> {
  const errors: string[] = [];

  // 1. Archive + delete atomique via RPC SECURITY DEFINER
  const { data: archivedCount, error: archiveError } = await supabase.rpc("reimport_archive_jt", {
    p_project_id: projectId,
  });
  const archived = (archivedCount as number | null) ?? 0;
  if (archiveError) {
    errors.push(`Archive J&T: ${archiveError.message}`);
  }

  // 2. Importer les nouvelles
  const itemMap = await loadItemMap(supabase, projectId);
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

  const result = await insertFlanges(supabase, records);
  const unknownOperations = findUnknownOperations(rows);

  // 3. Re-rattachement des photos orphelines via RPC
  let photosReattached = 0;
  let photosOrphaned = 0;
  const { data: reattachData, error: reattachError } = await supabase.rpc(
    "reattach_orphan_photos",
    { p_project_id: projectId },
  );
  if (reattachError) {
    errors.push(`Re-rattachement photos: ${reattachError.message}`);
  } else if (reattachData && Array.isArray(reattachData) && reattachData.length > 0) {
    const row0 = reattachData[0] as { reattached: number; orphaned: number };
    photosReattached = row0.reattached ?? 0;
    photosOrphaned = row0.orphaned ?? 0;
  }

  return {
    ...result,
    skipped,
    archived,
    errors: [...errors, ...result.errors],
    unknownOperations,
    photosReattached,
    photosOrphaned,
  };
}
