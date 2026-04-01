import { NextRequest, NextResponse } from "next/server";
import { parseWithMapping } from "@/lib/excel/generic-parser";
import { computeFingerprint } from "@/lib/excel/detect-columns";
import { saveTemplate, learnSynonym } from "@/lib/excel/template-matcher";
import { importLutToDb, reimportLutToDb } from "@/lib/db/import-lut";
import { importJtToDb, reimportJtToDb } from "@/lib/db/import-jt";
import { supabase } from "@/lib/db/supabase";
import type { ConfirmedMapping } from "@/lib/excel/generic-parser";
import { BUILTIN_SYNONYMS } from "@/lib/excel/synonyms";
import { normalizeHeader } from "@/lib/excel/detect-columns";
import { extractCellMetadata } from "@/lib/excel/extract-cell-metadata";

/**
 * POST /api/import/confirm
 * Body: multipart/form-data avec :
 *   - file: fichier Excel
 *   - confirmedMapping: JSON du mapping confirmé
 *   - projectId (optionnel, pour ré-import)
 *   - projectName (pour nouveau projet LUT)
 *   - client (pour nouveau projet LUT)
 *   - templateName (optionnel, pour sauvegarder le mapping)
 */
export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get("file") as File | null;
    const mappingJson = formData.get("confirmedMapping") as string | null;
    const projectId = formData.get("projectId") as string | null;
    const projectName = formData.get("projectName") as string | null;
    const client = formData.get("client") as string | null;
    const templateName = formData.get("templateName") as string | null;

    if (!file || !mappingJson) {
      return NextResponse.json(
        { error: "Fichier et confirmedMapping requis" },
        { status: 400 }
      );
    }

    const mapping: ConfirmedMapping = JSON.parse(mappingJson);
    const buffer = await file.arrayBuffer();

    // Parser avec le mapping confirmé
    const { rows, extraColumnHeaders } = parseWithMapping(buffer, mapping);

    // Extraire formules + couleurs de fond (seconde passe exceljs)
    const { rows: metadata, headerColors } = await extractCellMetadata(buffer, mapping);
    rows.forEach((row, i) => {
      row.cell_metadata = metadata[i] ?? {};
    });

    // Apprendre les nouveaux synonymes (headers non-builtin qui ont été mappés)
    const builtinSyns = BUILTIN_SYNONYMS[mapping.fileType];
    for (const [dbField, colIndex] of Object.entries(mapping.columnMap)) {
      // Retrouver l'en-tête Excel pour cette colonne
      const excelHeader = mapping.extraColumns.find((ec) => ec.index === colIndex)?.header;
      if (!excelHeader) continue;
      // Vérifier si ce n'est pas déjà un synonyme builtin
      const builtinList = builtinSyns[dbField] ?? [];
      const isBuiltin = builtinList.some(
        (s) => normalizeHeader(s) === normalizeHeader(excelHeader)
      );
      if (!isBuiltin) {
        await learnSynonym(mapping.fileType, dbField, excelHeader);
      }
    }

    // Sauvegarder le template si demandé
    let savedTemplateId: string | undefined;
    if (templateName) {
      // Construire le column_mapping inverse : db_field → Excel header string
      // On a besoin des en-têtes originaux pour ça
      const headers = Object.entries(mapping.columnMap).reduce(
        (acc, [dbField]) => {
          acc[dbField] = dbField; // simplifié, l'UI enverra les bons headers
          return acc;
        },
        {} as Record<string, string>
      );

      const fingerprint = computeFingerprint(
        Object.values(mapping.columnMap).map(String) // placeholder, l'UI enverra les headers
      );

      savedTemplateId = await saveTemplate(
        templateName,
        mapping.fileType,
        mapping.headerRow,
        headers,
        extraColumnHeaders,
        formData.get("fingerprint") as string ?? fingerprint
      );
    }

    // Importer en DB
    if (mapping.fileType === "lut") {
      if (projectId) {
        // Ré-import
        const result = await reimportLutToDb(rows, projectId);
        const lutUpdateFields: Record<string, unknown> = { header_colors: headerColors };
        if (savedTemplateId) lutUpdateFields.last_import_template_id = savedTemplateId;
        await supabase.from("projects").update(lutUpdateFields).eq("id", projectId);
        return NextResponse.json({
          type: "lut",
          projectId,
          parsed: rows.length,
          inserted: result.inserted,
          archived: result.archived,
          errors: result.errors,
        });
      } else {
        // Nouveau projet
        if (!projectName || !client) {
          return NextResponse.json(
            { error: "projectName et client requis pour un nouveau projet" },
            { status: 400 }
          );
        }
        const result = await importLutToDb(rows, projectName, client);
        const newLutUpdateFields: Record<string, unknown> = { header_colors: headerColors };
        if (savedTemplateId) newLutUpdateFields.last_import_template_id = savedTemplateId;
        await supabase.from("projects").update(newLutUpdateFields).eq("id", result.projectId);
        return NextResponse.json({
          type: "lut",
          projectId: result.projectId,
          parsed: rows.length,
          inserted: result.inserted,
          errors: result.errors,
        });
      }
    }

    if (mapping.fileType === "jt") {
      if (!projectId) {
        return NextResponse.json(
          { error: "projectId requis pour l'import J&T" },
          { status: 400 }
        );
      }

      // Save J&T header colors to the project (merge with existing LUT colors)
      const { data: existingProject } = await supabase
        .from("projects")
        .select("header_colors")
        .eq("id", projectId)
        .single();
      const mergedColors = {
        ...((existingProject?.header_colors as Record<string, string>) ?? {}),
        ...headerColors,
      };
      await supabase.from("projects").update({ header_colors: mergedColors }).eq("id", projectId);

      const hasExisting = formData.get("reimport") === "true";
      if (hasExisting) {
        const result = await reimportJtToDb(rows, projectId);
        return NextResponse.json({
          type: "jt",
          projectId,
          parsed: rows.length,
          inserted: result.inserted,
          skipped: result.skipped,
          archived: result.archived,
          errors: result.errors,
        });
      }

      const result = await importJtToDb(rows, projectId);
      return NextResponse.json({
        type: "jt",
        projectId,
        parsed: rows.length,
        inserted: result.inserted,
        skipped: result.skipped,
        errors: result.errors,
      });
    }

    return NextResponse.json({ error: "fileType invalide" }, { status: 400 });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Erreur import";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
