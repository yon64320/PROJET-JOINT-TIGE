import type { SupabaseClient } from "@supabase/supabase-js";
import { getStr } from "./utils";

/**
 * Type intentionnellement lâche à la frontière Excel → DB.
 * Les colonnes Excel varient entre préparateurs (ajout, renommage, réordonnancement).
 * Le generic-parser produit des ParsedRow avec champs dynamiques — on ne peut pas
 * contraindre plus sans casser l'import adaptatif.
 */
type LutLikeRow = Record<string, unknown>;

/**
 * Insère les lignes LUT parsées dans la table ot_items.
 * Crée d'abord le projet si nécessaire.
 * Le client supabase doit être authentifié (auth.uid() != NULL) pour passer la RLS sur projects.
 */
export async function importLutToDb(
  supabase: SupabaseClient,
  rows: LutLikeRow[],
  projectName: string,
  client: string,
  ownerId?: string,
): Promise<{ projectId: string; inserted: number; errors: string[] }> {
  const errors: string[] = [];

  const units = [...new Set(rows.map((r) => getStr(r, "unite")).filter(Boolean))] as string[];

  const insertData: Record<string, unknown> = { name: projectName, client, units };
  if (ownerId) insertData.owner_id = ownerId;

  const { data: project, error: projectError } = await supabase
    .from("projects")
    .insert(insertData)
    .select("id")
    .single();

  if (projectError || !project) {
    throw new Error(`Erreur création projet: ${projectError?.message}`);
  }

  const projectId = project.id;
  let inserted = 0;

  const BATCH_SIZE = 50;
  for (let i = 0; i < rows.length; i += BATCH_SIZE) {
    const batch = rows.slice(i, i + BATCH_SIZE).map((row) => {
      return {
        project_id: projectId,
        numero_ligne: getStr(row, "chrono_buta"),
        ot: getStr(row, "ot"),
        lot: getStr(row, "lot"),
        unite: getStr(row, "unite"),
        item: getStr(row, "item"),
        titre_gamme: getStr(row, "titre_gamme"),
        famille_item: getStr(row, "famille_item"),
        type_item: getStr(row, "type_item"),
        type_travaux: getStr(row, "type_travaux"),
        statut: getStr(row, "statut"),
        revision: getStr(row, "revision"),
        commentaires: getStr(row, "commentaires"),
        extra_columns: row.extra_columns ?? {},
        cell_metadata: row.cell_metadata ?? {},
      };
    });

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
  supabase: SupabaseClient,
  rows: LutLikeRow[],
  projectId: string,
): Promise<{ inserted: number; archived: number; errors: string[] }> {
  const errors: string[] = [];

  // 1. Archive + delete atomique via RPC SECURITY DEFINER
  const { data: archivedCount, error: archiveError } = await supabase.rpc("reimport_archive_lut", {
    p_project_id: projectId,
  });
  const archived = (archivedCount as number | null) ?? 0;
  if (archiveError) {
    errors.push(`Archive LUT: ${archiveError.message}`);
  }

  // 2. Mettre à jour les unités du projet
  const units = [...new Set(rows.map((r) => getStr(r, "unite")).filter(Boolean))] as string[];
  await supabase.from("projects").update({ units }).eq("id", projectId);

  // 3. Importer les nouveaux
  let inserted = 0;
  const BATCH_SIZE = 50;
  for (let i = 0; i < rows.length; i += BATCH_SIZE) {
    const batch = rows.slice(i, i + BATCH_SIZE).map((row) => {
      return {
        project_id: projectId,
        numero_ligne: getStr(row, "chrono_buta"),
        ot: getStr(row, "ot"),
        lot: getStr(row, "lot"),
        unite: getStr(row, "unite"),
        item: getStr(row, "item"),
        titre_gamme: getStr(row, "titre_gamme"),
        famille_item: getStr(row, "famille_item"),
        type_item: getStr(row, "type_item"),
        type_travaux: getStr(row, "type_travaux"),
        statut: getStr(row, "statut"),
        revision: getStr(row, "revision"),
        commentaires: getStr(row, "commentaires"),
        extra_columns: row.extra_columns ?? {},
        cell_metadata: row.cell_metadata ?? {},
      };
    });

    const { error } = await supabase.from("ot_items").insert(batch);
    if (error) {
      errors.push(`Batch ${i}-${i + batch.length}: ${error.message}`);
    } else {
      inserted += batch.length;
    }
  }

  return { inserted, archived, errors };
}
