import { NextRequest, NextResponse } from "next/server";
import { readExcelData, readPreviewRows } from "@/lib/excel/generic-parser";
import { detectHeaderRow, matchColumns, computeFingerprint, mergeSynonyms } from "@/lib/excel/detect-columns";
import { findMatchingTemplate, loadLearnedSynonyms } from "@/lib/excel/template-matcher";
import type { FileType } from "@/lib/excel/synonyms";

/**
 * POST /api/import/detect
 * Body: multipart/form-data avec file + fileType
 * Retourne la détection auto des en-têtes + mapping suggéré
 */
export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get("file") as File | null;
    const fileType = formData.get("fileType") as FileType | null;

    if (!file) {
      return NextResponse.json({ error: "Fichier manquant" }, { status: 400 });
    }
    if (!fileType || !["lut", "jt"].includes(fileType)) {
      return NextResponse.json({ error: 'fileType invalide. Attendu: "lut" ou "jt"' }, { status: 400 });
    }

    const buffer = await file.arrayBuffer();
    const data = readExcelData(buffer);

    // Charger les synonymes appris
    const learnedSynonyms = await loadLearnedSynonyms(fileType);
    const synonyms = mergeSynonyms(fileType, learnedSynonyms);

    // Détecter la ligne d'en-tête
    const detection = detectHeaderRow(data, fileType, synonyms);

    // Matcher les colonnes
    const { matched, unmatched } = matchColumns(detection.headers, fileType, synonyms);

    // Chercher un template existant
    const fingerprint = computeFingerprint(detection.headers);
    const suggestedTemplate = await findMatchingTemplate(fingerprint, fileType);

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
      previewRows,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Erreur détection";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
