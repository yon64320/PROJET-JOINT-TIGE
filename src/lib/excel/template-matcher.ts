/**
 * Template matching et synonymes appris en DB.
 */

import { supabase } from "@/lib/db/supabase";
import type { FileType } from "./synonyms";

interface ImportTemplate {
  id: string;
  name: string;
  file_type: FileType;
  header_row: number;
  column_mapping: Record<string, string>; // db_field → Excel header
  extra_columns_order: string[];
  header_fingerprint: string;
}

/** Similarité Jaccard entre deux ensembles de tokens */
function jaccardSimilarity(a: string, b: string): number {
  const setA = new Set(a.split("|"));
  const setB = new Set(b.split("|"));
  const intersection = new Set([...setA].filter((x) => setB.has(x)));
  const union = new Set([...setA, ...setB]);
  return union.size > 0 ? intersection.size / union.size : 0;
}

/**
 * Cherche un template existant correspondant au fingerprint.
 * Match exact d'abord, puis similarité Jaccard > 0.8.
 */
export async function findMatchingTemplate(
  fingerprint: string,
  fileType: FileType,
): Promise<(ImportTemplate & { similarity: number }) | null> {
  const { data: templates } = await supabase
    .from("import_templates")
    .select("*")
    .eq("file_type", fileType);

  if (!templates || templates.length === 0) return null;

  // Match exact
  const exact = templates.find((t) => t.header_fingerprint === fingerprint);
  if (exact) return { ...exact, similarity: 1.0 };

  // Similarité Jaccard
  let best: ImportTemplate | null = null;
  let bestSim = 0;

  for (const t of templates) {
    const sim = jaccardSimilarity(fingerprint, t.header_fingerprint);
    if (sim > bestSim) {
      bestSim = sim;
      best = t;
    }
  }

  if (best && bestSim > 0.8) {
    return { ...best, similarity: bestSim };
  }

  return null;
}

/**
 * Sauvegarde un template de mapping.
 */
export async function saveTemplate(
  name: string,
  fileType: FileType,
  headerRow: number,
  columnMapping: Record<string, string>,
  extraColumnsOrder: string[],
  fingerprint: string,
): Promise<string> {
  const { data, error } = await supabase
    .from("import_templates")
    .insert({
      name,
      file_type: fileType,
      header_row: headerRow,
      column_mapping: columnMapping,
      extra_columns_order: extraColumnsOrder,
      header_fingerprint: fingerprint,
    })
    .select("id")
    .single();

  if (error || !data) {
    throw new Error(`Erreur sauvegarde template: ${error?.message}`);
  }

  return data.id;
}

/**
 * Charge les synonymes appris depuis la DB, fusionnés par champ.
 */
export async function loadLearnedSynonyms(fileType: FileType): Promise<Map<string, string[]>> {
  const { data } = await supabase
    .from("column_synonyms")
    .select("db_field, synonym")
    .eq("file_type", fileType);

  const map = new Map<string, string[]>();
  if (!data) return map;

  for (const row of data) {
    const existing = map.get(row.db_field) ?? [];
    existing.push(row.synonym);
    map.set(row.db_field, existing);
  }

  return map;
}

/**
 * Apprend un nouveau synonyme (header Excel → champ DB).
 * Ignoré silencieusement si le synonyme existe déjà (UNIQUE constraint).
 */
export async function learnSynonym(
  fileType: FileType,
  dbField: string,
  excelHeader: string,
): Promise<void> {
  await supabase
    .from("column_synonyms")
    .upsert(
      { file_type: fileType, db_field: dbField, synonym: excelHeader, source: "user" },
      { onConflict: "file_type,db_field,synonym" },
    );
}
