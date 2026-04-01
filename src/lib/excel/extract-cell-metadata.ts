/**
 * Seconde passe d'extraction sur le fichier Excel avec exceljs.
 * Extrait les couleurs de fond pour chaque cellule mappée.
 */

import ExcelJS from "exceljs";
import type { ConfirmedMapping } from "./generic-parser";

/** Métadonnées d'une cellule : couleur de fond */
export interface CellMeta {
  bg?: string; // couleur "#RRGGBB"
}

/** Métadonnées d'une ligne : db_field → CellMeta */
export type RowMetadata = Record<string, CellMeta>;

/** Valeurs considérées comme nulles — doit correspondre exactement à generic-parser.ts */
const NULL_VALUES = new Set(["#REF!", "#N/A", "#VALUE!", "#DIV/0!", "#NAME?", ""]);

/**
 * Convertit une couleur ARGB exceljs (ex: "FF1E3A5F") en "#RRGGBB".
 * Ignore les couleurs thème (pas de hex direct).
 */
function argbToHex(argb: string | undefined): string | undefined {
  if (!argb || argb.length < 6) return undefined;
  const hex = argb.length === 8 ? argb.slice(2) : argb;
  if (hex === "FFFFFF" || hex === "000000") return undefined;
  return `#${hex}`;
}

/** Extrait la couleur de fond d'une cellule exceljs */
function extractBgColor(cell: ExcelJS.Cell): string | undefined {
  const fill = cell.fill;
  if (fill && fill.type === "pattern" && fill.pattern === "solid") {
    const fgColor = fill.fgColor;
    if (fgColor && "argb" in fgColor && fgColor.argb) {
      return argbToHex(fgColor.argb);
    }
  }
  return undefined;
}

/** Résultat de l'extraction : metadata par ligne + couleurs des en-têtes */
export interface ExtractionResult {
  rows: RowMetadata[];
  headerColors: Record<string, string>; // db_field → "#RRGGBB"
}

/**
 * Extrait les couleurs de fond de chaque cellule mappée,
 * ainsi que les couleurs de fond de la ligne d'en-tête.
 *
 * @param buffer Le fichier Excel en ArrayBuffer
 * @param mapping Le mapping confirmé (mêmes paramètres que parseWithMapping)
 * @returns Metadata par ligne (aligné 1:1 avec ParsedRow[]) + couleurs header
 */
export async function extractCellMetadata(
  buffer: ArrayBuffer,
  mapping: ConfirmedMapping
): Promise<ExtractionResult> {
  const workbook = new ExcelJS.Workbook();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await workbook.xlsx.load(buffer as any);

  const worksheet = workbook.worksheets[0];
  if (!worksheet) return { rows: [], headerColors: {} };

  // Construire l'inverse du mapping : colIndex → dbField
  const colToField = new Map<number, string>();
  for (const [dbField, colIndex] of Object.entries(mapping.columnMap)) {
    colToField.set(colIndex, dbField);
  }
  for (const ec of mapping.extraColumns) {
    colToField.set(ec.index, `__extra__${ec.header}`);
  }

  const primaryKeyIndex = mapping.columnMap[mapping.primaryKeyField];

  // --- Extraire les couleurs de la ligne d'en-tête ---
  const headerColors: Record<string, string> = {};
  const headerRowExcel = mapping.headerRow + 1; // 0-based → 1-based
  const headerRow = worksheet.getRow(headerRowExcel);
  if (headerRow) {
    for (const [colIndex, dbField] of colToField) {
      const cell = headerRow.getCell(colIndex + 1);
      const bg = extractBgColor(cell);
      if (bg) {
        headerColors[dbField] = bg;
      }
    }
  }

  // --- Extraire les couleurs des lignes de données ---
  const result: RowMetadata[] = [];

  for (let rowNum = headerRowExcel + 1; rowNum <= worksheet.rowCount; rowNum++) {
    const row = worksheet.getRow(rowNum);
    if (!row || row.cellCount === 0) continue;

    // Vérifier la clé primaire — MÊME logique que generic-parser.ts
    if (primaryKeyIndex !== undefined) {
      const pkCell = row.getCell(primaryKeyIndex + 1);
      const pkValue = pkCell.value;
      if (pkValue === null || pkValue === undefined) continue;
      const pkStr = String(pkValue).trim();
      if (NULL_VALUES.has(pkStr)) continue;
      if (mapping.fileType === "lut" && pkStr === "Réservation") continue;
    }

    const rowMeta: RowMetadata = {};
    let hasMeta = false;

    for (const [colIndex, dbField] of colToField) {
      const cell = row.getCell(colIndex + 1);
      const bg = extractBgColor(cell);
      if (bg) {
        rowMeta[dbField] = { bg };
        hasMeta = true;
      }
    }

    result.push(hasMeta ? rowMeta : {});
  }

  return { rows: result, headerColors };
}
