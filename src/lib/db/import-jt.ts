import { supabase } from "./supabase";
import type { JtRow } from "../excel/parse-jt";

function buildFlangeRecord(row: JtRow, projectId: string, otItemId: string) {
  return {
    project_id: projectId,
    ot_item_id: otItemId,
    id_ubleam: row.id_ubleam,
    nom: row.nom,
    zone: row.zone,
    famille_travaux: row.famille_travaux,
    type: row.type,
    repere_buta: row.repere_buta,
    repere_emis: row.repere_emis,
    repere_ubleam: row.repere_ubleam,
    commentaire_repere: row.commentaire_repere,
    dn_emis: row.dn_emis,
    dn_buta: row.dn_buta,
    pn_emis: row.pn_emis,
    pn_buta: row.pn_buta,
    operation: row.operation,
    barrette: row.barrette,
    nb_jp_emis: row.nb_jp_emis,
    nb_jp_buta: row.nb_jp_buta,
    nb_bp_emis: row.nb_bp_emis,
    nb_bp_buta: row.nb_bp_buta,
    materiel_emis: row.materiel_emis,
    materiel_buta: row.materiel_buta,
    materiel_adf: row.materiel_adf,
    cle: row.cle,
    nb_tiges_emis: row.nb_tiges_emis,
    nb_tiges_buta: row.nb_tiges_buta,
    matiere_tiges_emis: row.matiere_tiges_emis,
    matiere_tiges_buta: row.matiere_tiges_buta,
    diametre_tige: row.diametre_tige,
    longueur_tige: row.longueur_tige,
    nb_joints_prov: row.nb_joints_prov,
    nb_joints_def: row.nb_joints_def,
    matiere_joint_emis: row.matiere_joint_emis,
    matiere_joint_buta: row.matiere_joint_buta,
    rondelle: row.rondelle,
    face_bride: row.face_bride,
    commentaires: row.commentaires,
  };
}

async function loadItemMap(projectId: string): Promise<Map<string, string>> {
  const { data: otItems, error } = await supabase
    .from("ot_items")
    .select("id, item")
    .eq("project_id", projectId)
    .limit(5000);

  if (error || !otItems) {
    throw new Error(`Erreur chargement OTs: ${error?.message}`);
  }

  const map = new Map<string, string>();
  for (const ot of otItems) {
    map.set(ot.item, ot.id);
  }
  return map;
}

async function insertFlanges(
  records: Record<string, unknown>[]
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
  rows: JtRow[],
  projectId: string
): Promise<{ inserted: number; skipped: number; errors: string[] }> {
  const itemMap = await loadItemMap(projectId);
  let skipped = 0;

  const records: Record<string, unknown>[] = [];
  for (const row of rows) {
    const otItemId = row.nom ? itemMap.get(row.nom) : undefined;
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
  rows: JtRow[],
  projectId: string
): Promise<{ inserted: number; skipped: number; archived: number; errors: string[] }> {
  let archived = 0;

  // 1. Archiver les flanges existantes
  const { data: existingFlanges } = await supabase
    .from("flanges")
    .select("*")
    .eq("project_id", projectId)
    .limit(5000);

  if (existingFlanges && existingFlanges.length > 0) {
    const archiveRecords = existingFlanges.map((f) => ({
      ...f,
      archived_reason: "reimport_jt",
    }));
    for (let i = 0; i < archiveRecords.length; i += 100) {
      await supabase.from("flanges_archive").insert(archiveRecords.slice(i, i + 100));
    }
    archived = existingFlanges.length;
  }

  // 2. Supprimer les anciennes
  await supabase.from("flanges").delete().eq("project_id", projectId);

  // 3. Importer les nouvelles
  const itemMap = await loadItemMap(projectId);
  let skipped = 0;

  const records: Record<string, unknown>[] = [];
  for (const row of rows) {
    const otItemId = row.nom ? itemMap.get(row.nom) : undefined;
    if (!otItemId) {
      skipped++;
      continue;
    }
    records.push(buildFlangeRecord(row, projectId, otItemId));
  }

  const result = await insertFlanges(records);
  return { ...result, skipped, archived };
}
