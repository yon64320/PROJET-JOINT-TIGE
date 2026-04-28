import { NextRequest, NextResponse } from "next/server";
import { readExcelData, readPreviewRows } from "@/lib/excel/generic-parser";
import {
  detectHeaderRow,
  matchColumns,
  computeFingerprint,
  mergeSynonyms,
} from "@/lib/excel/detect-columns";
import {
  findMatchingTemplate,
  loadAllTemplates,
  loadLearnedSynonyms,
} from "@/lib/excel/template-matcher";
import { createServerSupabase } from "@/lib/db/supabase-ssr";
import type { FileType } from "@/lib/excel/synonyms";

/**
 * POST /api/import/detect
 * Body: multipart/form-data avec file + fileType
 * Retourne la détection auto des en-têtes + mapping suggéré
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createServerSupabase();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });

    const formData = await request.formData();
    const file = formData.get("file") as File | null;
    const fileType = formData.get("fileType") as FileType | null;

    if (!file) {
      return NextResponse.json({ error: "Fichier manquant" }, { status: 400 });
    }
    if (file.size > 50 * 1024 * 1024) {
      return NextResponse.json({ error: "Fichier trop volumineux (max 50 Mo)" }, { status: 413 });
    }
    if (!fileType || !["lut", "jt"].includes(fileType)) {
      return NextResponse.json(
        { error: 'fileType invalide. Attendu: "lut" ou "jt"' },
        { status: 400 },
      );
    }

    const buffer = await file.arrayBuffer();
    const data = readExcelData(buffer);

    // Charger les synonymes appris
    const learnedSynonyms = await loadLearnedSynonyms(supabase, fileType);
    const synonyms = mergeSynonyms(fileType, learnedSynonyms);

    // Détecter la ligne d'en-tête
    const detection = detectHeaderRow(data, fileType, synonyms);

    // Matcher les colonnes
    const { matched, unmatched } = matchColumns(detection.headers, fileType, synonyms);

    // Chercher un template existant
    const fingerprint = computeFingerprint(detection.headers);
    const suggestedTemplate = await findMatchingTemplate(supabase, fingerprint, fileType);
    const allTemplates = await loadAllTemplates(supabase, fileType);

    // Preview des premières lignes de données
    const previewRows = readPreviewRows(buffer, detection.rowIndex, 5);

    return NextResponse.json({
      headerRow: detection.rowIndex,
      headerConfidence: detection.confidence,
      headers: detection.headers,
      matched,
      unmatched,
      fingerprint,
      suggestedTemplate: suggestedTemplate
        ? {
            id: suggestedTemplate.id,
            name: suggestedTemplate.name,
            similarity: suggestedTemplate.similarity,
            columnMapping: suggestedTemplate.column_mapping,
            headerRow: suggestedTemplate.header_row,
          }
        : null,
      savedTemplates: allTemplates.map((t) => ({
        id: t.id,
        name: t.name,
        columnMapping: t.column_mapping,
        headerRow: t.header_row,
      })),
      previewRows,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Erreur détection";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
