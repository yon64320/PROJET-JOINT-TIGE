/**
 * Parser générique Excel basé sur un mapping confirmé.
 * Remplace parse-lut.ts et parse-jt.ts pour les imports adaptatifs.
 */

import * as XLSX from "xlsx";
import type { FileType } from "./synonyms";

/** Valeurs considérées comme nulles dans les fichiers Excel */
const NULL_VALUES = new Set(["#REF!", "#N/A", "#VALUE!", "#DIV/0!", "#NAME?", ""]);

/** Mapping confirmé par l'utilisateur après détection */
export interface ConfirmedMapping {
  fileType: FileType;
  headerRow: number;
  columnMap: Record<string, number>; // db_field → excel col index
  extraColumns: { index: number; header: string }[];
  primaryKeyField: string; // "item" pour LUT, "nom" pour J&T
  headers: Record<number, string>; // colIndex → excel header original
}

/** Ligne parsée avec champs connus typés et extra columns */
export interface ParsedRow {
  /** Champs connus : db_field → valeur texte */
  [key: string]: string | boolean | null | Record<string, unknown>;
  extra_columns: Record<string, unknown>;
  cell_metadata: Record<string, unknown>;
}

/** Champs boolean (corps de métier LUT) : valeur "X" = true */
const BOOL_FIELDS = new Set([
  "corps_metier_echaf",
  "corps_metier_calo",
  "corps_metier_montage",
  "corps_metier_metal",
  "corps_metier_fourniture",
  "corps_metier_nettoyage",
  "corps_metier_autres",
]);

function cellStr(row: unknown[], idx: number): string | null {
  const v = row[idx];
  if (v === undefined || v === null) return null;
  const s = String(v).trim();
  if (NULL_VALUES.has(s)) return null;
  return s;
}

/**
 * Parse un fichier Excel avec un mapping confirmé.
 * @returns Les lignes parsées et les en-têtes des colonnes extra.
 */
export function parseWithMapping(
  buffer: ArrayBuffer,
  mapping: ConfirmedMapping,
): { rows: ParsedRow[]; extraColumnHeaders: string[] } {
  const wb = XLSX.read(buffer, { type: "array" });
  const sheetName = wb.SheetNames[0];
  const ws = wb.Sheets[sheetName];
  const data: unknown[][] = XLSX.utils.sheet_to_json(ws, {
    header: 1,
    defval: null,
  });

  const rows: ParsedRow[] = [];
  const extraColumnHeaders = mapping.extraColumns.map((ec) => ec.header);
  const primaryKeyIndex = mapping.columnMap[mapping.primaryKeyField];

  for (let i = mapping.headerRow + 1; i < data.length; i++) {
    const row = data[i];
    if (!row || row.length === 0) continue;

    // Skip rows without primary key
    const pkValue = primaryKeyIndex !== undefined ? cellStr(row, primaryKeyIndex) : null;
    if (!pkValue) continue;
    // Skip "Réservation" rows in LUT
    if (mapping.fileType === "lut" && pkValue === "Réservation") continue;

    const parsed: ParsedRow = { extra_columns: {}, cell_metadata: {} };

    // Known fields
    for (const [dbField, colIndex] of Object.entries(mapping.columnMap)) {
      if (BOOL_FIELDS.has(dbField)) {
        const v = cellStr(row, colIndex);
        parsed[dbField] = v?.toUpperCase() === "X";
      } else {
        parsed[dbField] = cellStr(row, colIndex);
      }
    }

    // Extra columns
    for (const ec of mapping.extraColumns) {
      const v = cellStr(row, ec.index);
      if (v !== null) {
        parsed.extra_columns[ec.header] = v;
      }
    }

    rows.push(parsed);
  }

  return { rows, extraColumnHeaders };
}

/**
 * Lit les N premières lignes de données pour preview (sans mapping complet).
 */
export function readPreviewRows(
  buffer: ArrayBuffer,
  headerRow: number,
  count: number = 5,
): unknown[][] {
  const wb = XLSX.read(buffer, { type: "array" });
  const sheetName = wb.SheetNames[0];
  const ws = wb.Sheets[sheetName];
  const data: unknown[][] = XLSX.utils.sheet_to_json(ws, {
    header: 1,
    defval: null,
  });

  const preview: unknown[][] = [];
  for (let i = headerRow + 1; i < data.length && preview.length < count; i++) {
    const row = data[i];
    if (row && row.length > 0) {
      preview.push(row);
    }
  }
  return preview;
}

/**
 * Lit toutes les données brutes d'un fichier Excel (pour la détection).
 */
export function readExcelData(buffer: ArrayBuffer): unknown[][] {
  const wb = XLSX.read(buffer, { type: "array" });
  const sheetName = wb.SheetNames[0];
  const ws = wb.Sheets[sheetName];
  return XLSX.utils.sheet_to_json(ws, { header: 1, defval: null });
}
