/**
 * Génère `templates/lut-template.xlsx` à partir d'une LUT de référence.
 *
 * Étapes :
 *  1. Lit les 3 lignes d'en-tête de la LUT BUTACHIMIE via SheetJS (tolérant aux formules)
 *  2. Récupère les fusions de cellules (`!merges`) sur les lignes 1-2
 *  3. Filtre / décale en supprimant les colonnes E et F (`Responsable secondaire` × 2 — spécifiques BUTACHIMIE)
 *  4. Crée un nouveau workbook ExcelJS avec les 3 lignes d'en-tête + fusions + style minimal
 *  5. Sauvegarde sous `templates/lut-template.xlsx`
 *
 * Pourquoi SheetJS pour lire et ExcelJS pour écrire :
 *  - ExcelJS plante en lisant les shared formulas du fichier BUTACHIMIE (bug du getter `cell.formula`)
 *  - SheetJS lit sans broncher mais ne préserve pas les styles dans sa version open-source
 *  - On écrit donc un template "from scratch" avec un style basique mais propre
 *
 * Lancement (one-shot) : `npx tsx scripts/build-lut-template.ts`
 */

import { mkdir, readFile } from "node:fs/promises";
import path from "node:path";
import * as XLSX from "xlsx";
import ExcelJS from "exceljs";

const SOURCE_LUT = path.resolve("data/BUTACHIMIE - LUT- 20260303.xlsm");
const OUTPUT_PATH = path.resolve("templates/lut-template.xlsx");
const HEADER_ROWS = 3;
const REMOVE_COL_INDICES = new Set([4, 5]); // 0-based : E et F

/** Décale un index de colonne après suppression de E (4) et F (5) */
function shiftCol(originalIndex: number): number | null {
  if (REMOVE_COL_INDICES.has(originalIndex)) return null;
  let shift = 0;
  for (const r of REMOVE_COL_INDICES) if (r < originalIndex) shift++;
  return originalIndex - shift;
}

async function main(): Promise<void> {
  console.log(`→ Lecture de ${SOURCE_LUT}`);
  const buf = await readFile(SOURCE_LUT);
  const wbSrc = XLSX.read(buf, { type: "buffer", cellFormula: false, cellHTML: false });
  const wsSrc = wbSrc.Sheets[wbSrc.SheetNames[0]];
  if (!wsSrc) throw new Error("Aucune feuille dans le fichier source");

  // Extraction des 3 lignes d'en-tête en array-of-arrays
  const allRows = XLSX.utils.sheet_to_json<unknown[]>(wsSrc, {
    header: 1,
    defval: null,
    raw: true,
  });
  const headerRows = allRows.slice(0, HEADER_ROWS);
  const sourceColCount = Math.max(...headerRows.map((r) => r.length));
  console.log(`  Source: ${sourceColCount} colonnes, ${HEADER_ROWS} lignes d'en-tête`);

  // Extraction des fusions sur les 3 premières lignes (s.r ≤ 2 en 0-based)
  const sourceMerges = wsSrc["!merges"] ?? [];
  const headerMerges = sourceMerges.filter((m) => m.s.r < HEADER_ROWS && m.e.r < HEADER_ROWS);
  console.log(`  ${headerMerges.length} fusion(s) dans les en-têtes`);

  // Extraction des largeurs de colonnes
  const sourceCols = wsSrc["!cols"] ?? [];

  // Création du workbook ExcelJS
  const wb = new ExcelJS.Workbook();
  wb.creator = "EMIS — gammes-to-lut";
  wb.created = new Date();
  const ws = wb.addWorksheet("LUT");

  // Remplissage des 3 lignes d'en-tête, en sautant les colonnes E/F
  for (let r = 0; r < HEADER_ROWS; r++) {
    const sourceRow = headerRows[r] ?? [];
    for (let c = 0; c < sourceColCount; c++) {
      const newCol = shiftCol(c);
      if (newCol === null) continue;
      const value = sourceRow[c];
      if (value !== null && value !== undefined && value !== "") {
        const cell = ws.getCell(r + 1, newCol + 1);
        cell.value = value as string | number | boolean;
      }
    }
  }

  // Application des fusions (filtrées + décalées)
  for (const m of headerMerges) {
    const colsRange: number[] = [];
    for (let c = m.s.c; c <= m.e.c; c++) {
      const nc = shiftCol(c);
      if (nc !== null) colsRange.push(nc);
    }
    if (colsRange.length < 2) continue; // fusion réduite à 1 colonne ou 0 → pas de merge
    // Vérifier que les colonnes restantes sont contiguës (toujours vrai car E/F sont contigus)
    const minCol = Math.min(...colsRange);
    const maxCol = Math.max(...colsRange);
    ws.mergeCells(m.s.r + 1, minCol + 1, m.e.r + 1, maxCol + 1);
  }

  // Largeurs de colonnes (filtrées + décalées)
  for (let c = 0; c < sourceColCount; c++) {
    const newCol = shiftCol(c);
    if (newCol === null) continue;
    const w = sourceCols[c]?.wch ?? sourceCols[c]?.wpx;
    if (w) ws.getColumn(newCol + 1).width = typeof w === "number" ? w : 12;
  }

  // Style basique des en-têtes
  for (let r = 1; r <= HEADER_ROWS; r++) {
    const row = ws.getRow(r);
    row.eachCell({ includeEmpty: false }, (cell) => {
      cell.font = { bold: true };
      cell.alignment = { vertical: "middle", horizontal: "center", wrapText: true };
      cell.fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: "FFE5E5E5" },
      };
      cell.border = {
        top: { style: "thin", color: { argb: "FF999999" } },
        bottom: { style: "thin", color: { argb: "FF999999" } },
        left: { style: "thin", color: { argb: "FF999999" } },
        right: { style: "thin", color: { argb: "FF999999" } },
      };
    });
    row.height = r === 3 ? 30 : 20;
  }

  // Freeze panes : 3 lignes d'en-tête figées
  ws.views = [{ state: "frozen", ySplit: HEADER_ROWS }];

  await mkdir(path.dirname(OUTPUT_PATH), { recursive: true });
  await wb.xlsx.writeFile(OUTPUT_PATH);
  console.log(`✓ Template écrit : ${OUTPUT_PATH}`);
  console.log(`  ${HEADER_ROWS} lignes × ${sourceColCount - REMOVE_COL_INDICES.size} colonnes`);
}

main().catch((err: unknown) => {
  console.error("Erreur:", err);
  process.exit(1);
});
