/**
 * Écriture du fichier LUT à partir du template + données agrégées.
 *
 * Indices de colonnes dans le template (1-based ExcelJS) :
 *  - ITEM         = col F (6)
 *  - TITRE GAMME  = col I (9)
 *  - TYPE TRAVAUX = col L (12)
 *
 * Style des items non concernés : remplissage gris moyen + texte gris foncé italique
 * sur la totalité des 34 colonnes du template.
 *
 * Deux variantes :
 *  - `writeLut({ outputPath })` — écrit directement sur disque (CLI)
 *  - `writeLutBuffer({ items })` — retourne un Buffer (route API web)
 */

import path from "node:path";
import ExcelJS from "exceljs";
import type { ItemAggregation } from "./aggregate-items";

const HEADER_ROWS = 3;
const COL_ITEM = 6;
const COL_TITRE_GAMME = 9;
const COL_TYPE_TRAVAUX = 12;
const TEMPLATE_COL_COUNT = 34;

const NC_FILL: ExcelJS.FillPattern = {
  type: "pattern",
  pattern: "solid",
  fgColor: { argb: "FFA6A6A6" },
};
const NC_FONT: Partial<ExcelJS.Font> = {
  italic: true,
  color: { argb: "FF595959" },
};

/** Chemin par défaut du template — relatif au cwd du process. */
export const DEFAULT_TEMPLATE_PATH = path.resolve(process.cwd(), "templates/lut-template.xlsx");

async function loadAndFillWorkbook(
  templatePath: string,
  items: readonly ItemAggregation[],
): Promise<ExcelJS.Workbook> {
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.readFile(templatePath);
  const ws = wb.worksheets[0];
  if (!ws) throw new Error("Template invalide : aucune feuille");

  for (let i = 0; i < items.length; i++) {
    const agg = items[i];
    const rowIdx = HEADER_ROWS + 1 + i;
    const row = ws.getRow(rowIdx);

    row.getCell(COL_ITEM).value = agg.item;
    if (agg.titre) row.getCell(COL_TITRE_GAMME).value = agg.titre;
    row.getCell(COL_TYPE_TRAVAUX).value = agg.isConcerned ? agg.corpsEmis.join(", ") : "NC";

    if (!agg.isConcerned) {
      for (let c = 1; c <= TEMPLATE_COL_COUNT; c++) {
        const cell = row.getCell(c);
        cell.fill = NC_FILL;
        cell.font = NC_FONT;
      }
    }
    row.commit();
  }

  return wb;
}

export interface WriteOptions {
  templatePath: string;
  outputPath: string;
  items: ItemAggregation[];
}

export async function writeLut({ templatePath, outputPath, items }: WriteOptions): Promise<void> {
  const wb = await loadAndFillWorkbook(templatePath, items);
  await wb.xlsx.writeFile(outputPath);
}

export interface WriteBufferOptions {
  templatePath?: string;
  items: readonly ItemAggregation[];
}

/** Variante serveur : retourne le fichier .xlsx en mémoire (Buffer) sans écriture disque. */
export async function writeLutBuffer({
  templatePath = DEFAULT_TEMPLATE_PATH,
  items,
}: WriteBufferOptions): Promise<Buffer> {
  const wb = await loadAndFillWorkbook(templatePath, items);
  const ab = await wb.xlsx.writeBuffer();
  return Buffer.from(ab as ArrayBuffer);
}

export function buildOutputPath(gammesPath: string, outDir = path.dirname(gammesPath)): string {
  const base = path.basename(gammesPath, path.extname(gammesPath));
  const stamp = formatStamp(new Date());
  return path.join(outDir, `LUT-${base}-${stamp}.xlsx`);
}

/** Nom de fichier suggéré pour le download web (sans chemin). */
export function buildDownloadFilename(projectName: string): string {
  const safe = projectName.replace(/[^A-Za-z0-9_-]+/g, "_").slice(0, 40);
  return `LUT-${safe}-${formatStamp(new Date())}.xlsx`;
}

function formatStamp(d: Date): string {
  const pad = (n: number): string => String(n).padStart(2, "0");
  return (
    String(d.getFullYear()) +
    pad(d.getMonth() + 1) +
    pad(d.getDate()) +
    "-" +
    pad(d.getHours()) +
    pad(d.getMinutes())
  );
}
