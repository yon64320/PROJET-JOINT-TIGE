import { NextRequest, NextResponse } from "next/server";
import { parseLut } from "@/lib/excel/parse-lut";
import { parseJt } from "@/lib/excel/parse-jt";
import { importLutToDb, reimportLutToDb } from "@/lib/db/import-lut";
import { importJtToDb, reimportJtToDb } from "@/lib/db/import-jt";

/**
 * POST /api/import
 * Body: multipart/form-data avec :
 *   - file: le fichier Excel (.xlsm/.xlsx)
 *   - type: "lut" | "jt"
 *   - projectName: nom du projet (requis pour LUT nouveau projet)
 *   - client: nom du client (requis pour LUT nouveau projet)
 *   - projectId: UUID du projet existant (pour ré-import LUT ou import J&T)
 */
export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get("file") as File | null;
    const type = formData.get("type") as string | null;
    const projectId = formData.get("projectId") as string | null;

    if (!file) {
      return NextResponse.json({ error: "Fichier manquant" }, { status: 400 });
    }
    if (!type || !["lut", "jt"].includes(type)) {
      return NextResponse.json(
        { error: 'Type invalide. Attendu: "lut" ou "jt"' },
        { status: 400 }
      );
    }

    const buffer = await file.arrayBuffer();

    if (type === "lut") {
      const rows = parseLut(buffer);

      // Ré-import dans un projet existant
      if (projectId) {
        const result = await reimportLutToDb(rows, projectId);
        return NextResponse.json({
          type: "lut",
          projectId,
          parsed: rows.length,
          inserted: result.inserted,
          archived: result.archived,
          errors: result.errors,
        });
      }

      // Nouveau projet
      const projectName = formData.get("projectName") as string | null;
      const client = formData.get("client") as string | null;

      if (!projectName || !client) {
        return NextResponse.json(
          { error: "projectName et client requis pour un nouveau projet" },
          { status: 400 }
        );
      }

      const result = await importLutToDb(rows, projectName, client);
      return NextResponse.json({
        type: "lut",
        projectId: result.projectId,
        parsed: rows.length,
        inserted: result.inserted,
        errors: result.errors,
      });
    }

    if (type === "jt") {
      if (!projectId) {
        return NextResponse.json(
          { error: "projectId requis pour l'import J&T" },
          { status: 400 }
        );
      }

      const rows = parseJt(buffer);

      // Vérifier s'il y a déjà des flanges → ré-import
      const { reimportJtToDb: reimportJt, importJtToDb: importJt } = { reimportJtToDb, importJtToDb };
      const hasExisting = formData.get("reimport") === "true";

      if (hasExisting) {
        const result = await reimportJt(rows, projectId);
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

      const result = await importJt(rows, projectId);
      return NextResponse.json({
        type: "jt",
        projectId,
        parsed: rows.length,
        inserted: result.inserted,
        skipped: result.skipped,
        errors: result.errors,
      });
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : "Erreur inconnue";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
