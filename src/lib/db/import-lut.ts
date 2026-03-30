import { supabase } from "./supabase";
import type { LutRow } from "../excel/parse-lut";

/**
 * Insère les lignes LUT parsées dans la table ot_items.
 * Crée d'abord le projet si nécessaire.
 */
export async function importLutToDb(
  rows: LutRow[],
  projectName: string,
  client: string
): Promise<{ projectId: string; inserted: number; errors: string[] }> {
  const errors: string[] = [];

  const units = [...new Set(rows.map((r) => r.unite).filter(Boolean))] as string[];

  const { data: project, error: projectError } = await supabase
    .from("projects")
    .insert({ name: projectName, client, units })
    .select("id")
    .single();

  if (projectError || !project) {
    throw new Error(`Erreur création projet: ${projectError?.message}`);
  }

  const projectId = project.id;
  let inserted = 0;

  const BATCH_SIZE = 50;
  for (let i = 0; i < rows.length; i += BATCH_SIZE) {
    const batch = rows.slice(i, i + BATCH_SIZE).map((row) => ({
      project_id: projectId,
      numero_ligne: row.chrono_buta ? parseInt(row.chrono_buta) || null : null,
      ot: row.ot,
      lot: row.lot,
      unite: row.unite,
      item: row.item,
      titre_gamme: row.titre_gamme,
      famille_item: row.famille_item,
      type_item: row.type_item,
      type_travaux: row.type_travaux,
      statut: row.statut,
      revision: row.revision,
      commentaires: row.commentaires,
      corps_metier_echaf: row.corps_metier_echaf,
      corps_metier_calo: row.corps_metier_calo,
      corps_metier_montage: row.corps_metier_montage,
      corps_metier_metal: row.corps_metier_metal,
      corps_metier_fourniture: row.corps_metier_fourniture,
      corps_metier_nettoyage: row.corps_metier_nettoyage,
      corps_metier_autres: row.corps_metier_autres,
    }));

    const { error } = await supabase.from("ot_items").insert(batch);
    if (error) {
      errors.push(`Batch ${i}-${i + batch.length}: ${error.message}`);
    } else {
      inserted += batch.length;
    }
  }

  return { projectId, inserted, errors };
}

/**
 * Ré-importe une LUT dans un projet existant.
 * 1. Archive les anciens ot_items + flanges
 * 2. Supprime les anciens (CASCADE supprime flanges)
 * 3. Importe les nouveaux ot_items
 */
export async function reimportLutToDb(
  rows: LutRow[],
  projectId: string
): Promise<{ inserted: number; archived: number; errors: string[] }> {
  const errors: string[] = [];
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
      archived_reason: "reimport_lut",
    }));
    for (let i = 0; i < archiveRecords.length; i += 100) {
      await supabase.from("flanges_archive").insert(archiveRecords.slice(i, i + 100));
    }
    archived += existingFlanges.length;
  }

  // 2. Archiver les ot_items existants
  const { data: existingOts } = await supabase
    .from("ot_items")
    .select("*")
    .eq("project_id", projectId)
    .limit(5000);

  if (existingOts && existingOts.length > 0) {
    const archiveRecords = existingOts.map((ot) => ({
      ...ot,
      archived_reason: "reimport_lut",
    }));
    for (let i = 0; i < archiveRecords.length; i += 100) {
      await supabase.from("ot_items_archive").insert(archiveRecords.slice(i, i + 100));
    }
    archived += existingOts.length;
  }

  // 3. Supprimer les anciens (CASCADE supprime flanges)
  await supabase.from("ot_items").delete().eq("project_id", projectId);

  // 4. Mettre à jour les unités du projet
  const units = [...new Set(rows.map((r) => r.unite).filter(Boolean))] as string[];
  await supabase.from("projects").update({ units }).eq("id", projectId);

  // 5. Importer les nouveaux
  let inserted = 0;
  const BATCH_SIZE = 50;
  for (let i = 0; i < rows.length; i += BATCH_SIZE) {
    const batch = rows.slice(i, i + BATCH_SIZE).map((row) => ({
      project_id: projectId,
      numero_ligne: row.chrono_buta ? parseInt(row.chrono_buta) || null : null,
      ot: row.ot,
      lot: row.lot,
      unite: row.unite,
      item: row.item,
      titre_gamme: row.titre_gamme,
      famille_item: row.famille_item,
      type_item: row.type_item,
      type_travaux: row.type_travaux,
      statut: row.statut,
      revision: row.revision,
      commentaires: row.commentaires,
      corps_metier_echaf: row.corps_metier_echaf,
      corps_metier_calo: row.corps_metier_calo,
      corps_metier_montage: row.corps_metier_montage,
      corps_metier_metal: row.corps_metier_metal,
      corps_metier_fourniture: row.corps_metier_fourniture,
      corps_metier_nettoyage: row.corps_metier_nettoyage,
      corps_metier_autres: row.corps_metier_autres,
    }));

    const { error } = await supabase.from("ot_items").insert(batch);
    if (error) {
      errors.push(`Batch ${i}-${i + batch.length}: ${error.message}`);
    } else {
      inserted += batch.length;
    }
  }

  return { inserted, archived, errors };
}
