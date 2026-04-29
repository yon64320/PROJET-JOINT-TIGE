import { NextRequest, NextResponse } from "next/server";
import { parseWithMapping } from "@/lib/excel/generic-parser";
import { computeFingerprint } from "@/lib/excel/detect-columns";
import { saveTemplate, learnSynonym } from "@/lib/excel/template-matcher";
import { importLutToDb, reimportLutToDb } from "@/lib/db/import-lut";
import { importJtToDb, reimportJtToDb } from "@/lib/db/import-jt";
import { createServerSupabase } from "@/lib/db/supabase-ssr";
import { BUILTIN_SYNONYMS } from "@/lib/excel/synonyms";
import {
  ConfirmedMappingSchema,
  isAllowedExcelMime,
  isExcelExtension,
} from "@/lib/validation/schemas";
import { z } from "zod";
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
    const supabase = await createServerSupabase();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
    }

    const formData = await request.formData();
    const file = formData.get("file") as File | null;
    const mappingJson = formData.get("confirmedMapping") as string | null;
    const projectId = formData.get("projectId") as string | null;
    const projectName = formData.get("projectName") as string | null;
    const client = formData.get("client") as string | null;
    const templateName = formData.get("templateName") as string | null;

    if (!file || !mappingJson) {
      return NextResponse.json({ error: "Fichier et confirmedMapping requis" }, { status: 400 });
    }

    // HIGH-05 : verifier l'ownership du projet AVANT tout appel a reimport_archive_*
    // (les RPC SECURITY DEFINER ont leur propre check auth.uid() en defense en
    // profondeur depuis 002_security_fixes.sql, mais le check route donne un 404
    // explicite et empeche le calcul/parsing inutile sur un projet hors perimetre).
    if (projectId) {
      const { data: existingProject } = await supabase
        .from("projects")
        .select("id")
        .eq("id", projectId)
        .eq("owner_id", user.id)
        .single();
      if (!existingProject) {
        return NextResponse.json({ error: "Projet introuvable" }, { status: 404 });
      }
    }

    const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50 MB
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json({ error: "Fichier trop volumineux (max 50 MB)" }, { status: 413 });
    }

    if (
      file.type &&
      !isAllowedExcelMime(file.type) &&
      file.type !== "application/octet-stream" &&
      !isExcelExtension(file.name)
    ) {
      return NextResponse.json(
        { error: `Type de fichier non supporté: ${file.type}` },
        { status: 400 },
      );
    }

    const parsedMapping = ConfirmedMappingSchema.safeParse(JSON.parse(mappingJson));
    if (!parsedMapping.success) {
      return NextResponse.json(
        { error: "Mapping invalide", details: z.flattenError(parsedMapping.error) },
        { status: 400 },
      );
    }
    const mapping = parsedMapping.data;
    const buffer = await file.arrayBuffer();

    // Parser avec le mapping confirmé
    const { rows, extraColumnHeaders } = parseWithMapping(buffer, mapping);

    // Extraire formules + couleurs de fond (seconde passe exceljs)
    const { rows: metadata, headerColors } = await extractCellMetadata(buffer, mapping);
    if (rows.length !== metadata.length) {
      console.warn(
        `[import/confirm] Metadata row count mismatch: ${rows.length} rows vs ${metadata.length} metadata entries`,
      );
    }
    rows.forEach((row, i) => {
      row.cell_metadata = metadata[i] ?? {};
    });

    // Apprendre les nouveaux synonymes (headers non-builtin qui ont été mappés)
    // Parallélise les learnSynonym — chaque appel est indépendant
    const builtinSyns = BUILTIN_SYNONYMS[mapping.fileType];
    const synonymLearnings: Promise<unknown>[] = [];
    for (const [dbField, colIndex] of Object.entries(mapping.columnMap)) {
      const excelHeader = mapping.headers?.[colIndex];
      if (!excelHeader) continue;
      const builtinList = builtinSyns[dbField] ?? [];
      const isBuiltin = builtinList.some(
        (s) => normalizeHeader(s) === normalizeHeader(excelHeader),
      );
      if (!isBuiltin) {
        synonymLearnings.push(learnSynonym(supabase, mapping.fileType, dbField, excelHeader));
      }
    }
    await Promise.all(synonymLearnings);

    // Sauvegarder le template si demandé
    let savedTemplateId: string | undefined;
    if (templateName) {
      // Construire le column_mapping : db_field → Excel header string
      const columnMappingHeaders = Object.entries(mapping.columnMap).reduce(
        (acc, [dbField, colIndex]) => {
          acc[dbField] = mapping.headers?.[colIndex] ?? dbField;
          return acc;
        },
        {} as Record<string, string>,
      );

      const fingerprint = computeFingerprint(
        Object.values(mapping.columnMap).map((idx) => mapping.headers?.[idx] ?? String(idx)),
      );

      savedTemplateId = await saveTemplate(
        supabase,
        templateName,
        mapping.fileType,
        mapping.headerRow,
        columnMappingHeaders,
        extraColumnHeaders,
        (formData.get("fingerprint") as string) ?? fingerprint,
        user.id,
      );
    }

    // Importer en DB
    if (mapping.fileType === "lut") {
      if (projectId) {
        // Ré-import
        const result = await reimportLutToDb(supabase, rows, projectId);
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
            { status: 400 },
          );
        }
        const result = await importLutToDb(supabase, rows, projectName, client, user.id);
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
        return NextResponse.json({ error: "projectId requis pour l'import J&T" }, { status: 400 });
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
        const result = await reimportJtToDb(supabase, rows, projectId);
        return NextResponse.json({
          type: "jt",
          projectId,
          parsed: rows.length,
          inserted: result.inserted,
          skipped: result.skipped,
          archived: result.archived,
          errors: result.errors,
          unknownOperations: result.unknownOperations,
          photosReattached: result.photosReattached,
          photosOrphaned: result.photosOrphaned,
        });
      }

      const result = await importJtToDb(supabase, rows, projectId);
      return NextResponse.json({
        type: "jt",
        projectId,
        parsed: rows.length,
        inserted: result.inserted,
        skipped: result.skipped,
        errors: result.errors,
        unknownOperations: result.unknownOperations,
      });
    }

    return NextResponse.json({ error: "fileType invalide" }, { status: 400 });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Erreur import";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
