import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createServerSupabase } from "@/lib/db/supabase-ssr";
import {
  GammesConfirmBodySchema,
  isAllowedExcelMime,
  isExcelExtension,
} from "@/lib/validation/schemas";
import {
  loadWorkbookFromBuffer,
  loadSheetRows,
  extractPhases,
} from "@/lib/import/gammes/parse-gammes";
import { aggregateItems } from "@/lib/import/gammes/aggregate-items";
import { writeLutBuffer, buildDownloadFilename } from "@/lib/import/gammes/write-lut";

const MAX_FILE_SIZE = 50 * 1024 * 1024;
const BATCH_SIZE = 50;

/**
 * POST /api/import/gammes-confirm
 * Multipart : file + projectId + mapping (JSON) + corpsEmis (JSON array)
 *
 * 1. Validation Zod + ownership
 * 2. Si LUT existante → archive + suppression (RPC reimport_archive_lut)
 * 3. Parse Gammes + agrégation par item
 * 4. Insert batch en ot_items (type_travaux = "NC" ou liste corps EMIS)
 * 5. Génère le .xlsx (template + style NC)
 * 6. Retourne JSON { success, stats, file: base64, filename }
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
  const supabase = await createServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });

  const formData = await request.formData();
  const file = formData.get("file") as File | null;
  const projectId = formData.get("projectId") as string | null;
  const mappingJson = formData.get("mapping") as string | null;
  const corpsEmisJson = formData.get("corpsEmis") as string | null;

  if (!file || !projectId || !mappingJson || !corpsEmisJson) {
    return NextResponse.json(
      { error: "file, projectId, mapping et corpsEmis requis" },
      { status: 400 },
    );
  }

  let parsedBody: unknown;
  try {
    parsedBody = {
      projectId,
      mapping: JSON.parse(mappingJson),
      corpsEmis: JSON.parse(corpsEmisJson),
    };
  } catch {
    return NextResponse.json({ error: "JSON invalide dans mapping ou corpsEmis" }, { status: 400 });
  }

  const validated = GammesConfirmBodySchema.safeParse(parsedBody);
  if (!validated.success) {
    return NextResponse.json(
      { error: "Payload invalide", details: z.flattenError(validated.error) },
      { status: 400 },
    );
  }
  const { mapping, corpsEmis } = validated.data;

  if (file.size > MAX_FILE_SIZE) {
    return NextResponse.json({ error: "Fichier trop volumineux (max 50 Mo)" }, { status: 413 });
  }
  if (
    file.type &&
    !isAllowedExcelMime(file.type) &&
    file.type !== "application/octet-stream" &&
    !isExcelExtension(file.name)
  ) {
    return NextResponse.json(
      { error: `Type de fichier non supporté : ${file.type}` },
      { status: 400 },
    );
  }

  // Ownership + récupération nom projet
  const { data: project } = await supabase
    .from("projects")
    .select("id, name")
    .eq("id", projectId)
    .single();
  if (!project) return NextResponse.json({ error: "Projet introuvable" }, { status: 404 });

  // Check booléen "LUT existante ?" via .limit(1) — évite seq scan complet
  const { data: existingSample } = await supabase
    .from("ot_items")
    .select("id")
    .eq("project_id", projectId)
    .limit(1);
  const hasExistingLut = (existingSample?.length ?? 0) > 0;

  // Parse + agrégation
  const arrayBuffer = await file.arrayBuffer();
  const buf = Buffer.from(arrayBuffer);
  let parsed;
  try {
    parsed = loadWorkbookFromBuffer(buf);
  } catch (err) {
    return NextResponse.json(
      { error: `Fichier illisible : ${err instanceof Error ? err.message : "erreur inconnue"}` },
      { status: 400 },
    );
  }

  if (!parsed.sheets.find((s) => s.name === mapping.sheetName)) {
    return NextResponse.json(
      { error: `Feuille "${mapping.sheetName}" introuvable dans le fichier` },
      { status: 400 },
    );
  }

  const rows = loadSheetRows(parsed.wb, mapping.sheetName);
  const phases = extractPhases(rows, mapping.headerRowIdx, {
    itemColIdx: mapping.itemColIdx,
    corpsColIdx: mapping.corpsColIdx,
    titreColIdx: mapping.titreColIdx,
  });
  if (phases.length === 0) {
    return NextResponse.json(
      { error: "Aucune phase extraite — vérifie le mapping des colonnes" },
      { status: 400 },
    );
  }

  const emisSet = new Set(corpsEmis.map((c) => c.toUpperCase()));
  const { items, stats } = aggregateItems(phases, emisSet);

  // Mode :
  //  - "build"  : projet vide → on insère directement en DB
  //  - "export" : LUT existante → on NE TOUCHE PAS la DB, on retourne juste le .xlsx
  // La LUT existante peut contenir des champs (FAMILLE, TYPE, REV, statut, commentaires…)
  // qu'on ne sait pas reconstituer depuis les gammes. La préserver est l'invariant.
  const mode: "build" | "export" = hasExistingLut ? "export" : "build";

  let inserted = 0;
  const errors: string[] = [];
  if (mode === "build") {
    for (let i = 0; i < items.length; i += BATCH_SIZE) {
      const batch = items.slice(i, i + BATCH_SIZE).map((agg) => ({
        project_id: projectId,
        item: agg.item,
        titre_gamme: agg.titre || null,
        type_travaux: agg.isConcerned ? agg.corpsEmis.join(", ") : "NC",
        extra_columns: { gammes_corps_all: agg.corpsAll },
      }));
      const { error } = await supabase.from("ot_items").insert(batch);
      if (error) {
        errors.push(`Batch ${i}-${i + batch.length}: ${error.message}`);
      } else {
        inserted += batch.length;
      }
    }

    if (errors.length > 0 && inserted === 0) {
      return NextResponse.json({ error: "Insertion impossible", details: errors }, { status: 500 });
    }
  }

  // Génération .xlsx (toujours, dans les deux modes)
  let xlsxBuffer: Buffer;
  try {
    xlsxBuffer = await writeLutBuffer({ items });
  } catch (err) {
    return NextResponse.json(
      {
        error: `Génération .xlsx échouée : ${err instanceof Error ? err.message : "erreur inconnue"}`,
        mode,
        stats,
        inserted,
      },
      { status: 500 },
    );
  }

  return NextResponse.json({
    success: true,
    mode,
    stats,
    inserted,
    errors: errors.length > 0 ? errors : undefined,
    file: xlsxBuffer.toString("base64"),
    filename: buildDownloadFilename(project.name as string),
  });
}
