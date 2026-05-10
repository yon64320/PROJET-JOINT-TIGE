import { NextRequest, NextResponse } from "next/server";
import { createServerSupabase } from "@/lib/db/supabase-ssr";
import { isAllowedExcelMime, isExcelExtension } from "@/lib/validation/schemas";
import {
  loadWorkbookFromBuffer,
  loadSheetRows,
  detectHeaderRow,
  preselectColumns,
  preselectSheet,
  distinctValuesByColumn,
} from "@/lib/import/gammes/parse-gammes";

const MAX_FILE_SIZE = 50 * 1024 * 1024;

/**
 * POST /api/import/gammes-detect
 * Multipart : file (.xlsx/.xlsm) + projectId
 *
 * Retourne la structure du fichier (feuilles, ligne d'en-tête détectée, colonnes
 * pré-sélectionnées, codes corps de métier distincts) pour alimenter le wizard
 * d'import. Indique aussi si le projet a déjà une LUT importée (pour avertir
 * l'utilisateur du remplacement).
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

  if (!file) {
    return NextResponse.json({ error: "Fichier requis" }, { status: 400 });
  }

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

  // Si projectId fourni : ownership check + détection LUT existante.
  // Sinon (flux création depuis /projets/import) : on se contente d'analyser
  // le fichier — la création du projet a lieu dans gammes-confirm.
  let hasExistingLut = false;
  if (projectId) {
    const { data: project } = await supabase
      .from("projects")
      .select("id")
      .eq("id", projectId)
      .single();
    if (!project) return NextResponse.json({ error: "Projet introuvable" }, { status: 404 });

    const { data: existingSample } = await supabase
      .from("ot_items")
      .select("id")
      .eq("project_id", projectId)
      .limit(1);
    hasExistingLut = (existingSample?.length ?? 0) > 0;
  }

  // Parse du fichier
  const arrayBuffer = await file.arrayBuffer();
  const buf = Buffer.from(arrayBuffer);
  let parsed: ReturnType<typeof loadWorkbookFromBuffer>;
  try {
    parsed = loadWorkbookFromBuffer(buf);
  } catch (err) {
    return NextResponse.json(
      { error: `Fichier illisible : ${err instanceof Error ? err.message : "erreur inconnue"}` },
      { status: 400 },
    );
  }

  if (parsed.sheets.length === 0) {
    return NextResponse.json({ error: "Aucune feuille trouvée" }, { status: 400 });
  }

  const sheetName = preselectSheet(parsed.sheets);
  const rows = loadSheetRows(parsed.wb, sheetName);
  const detection = detectHeaderRow(rows);

  let preselect = {
    itemColIdx: null as number | null,
    corpsColIdx: null as number | null,
    titreColIdx: null as number | null,
  };
  let distinctValues: Record<number, string[]> = {};
  if (detection) {
    preselect = preselectColumns(detection.headers);
    distinctValues = distinctValuesByColumn(rows, detection.rowIdx, detection.headers.length);
  }

  return NextResponse.json({
    sheets: parsed.sheets,
    selectedSheet: sheetName,
    detection,
    preselect,
    distinctValues,
    hasExistingLut,
  });
}
