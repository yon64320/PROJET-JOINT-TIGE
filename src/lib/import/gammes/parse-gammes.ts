/**
 * Parsing du fichier Gammes via SheetJS.
 *
 * Le fichier source contient typiquement une feuille "OTs" avec des lignes plates :
 * 1 ligne = 1 phase d'OT. Plusieurs phases par ITEM. La structure exacte
 * (numéros de colonnes, ligne d'en-tête) varie selon les clients — on détecte
 * automatiquement et on laisse l'utilisateur valider/corriger via le mapping.
 */

import { readFileSync } from "node:fs";
import * as XLSX from "xlsx";

export interface SheetInfo {
  name: string;
  rowCount: number;
  colCount: number;
}

export interface LoadedWorkbook {
  wb: XLSX.WorkBook;
  sheets: SheetInfo[];
}

function describeSheets(wb: XLSX.WorkBook): SheetInfo[] {
  return wb.SheetNames.map((name) => {
    const ws = wb.Sheets[name];
    const ref = ws["!ref"];
    const range = ref ? XLSX.utils.decode_range(ref) : { s: { r: 0, c: 0 }, e: { r: 0, c: 0 } };
    return {
      name,
      rowCount: range.e.r - range.s.r + 1,
      colCount: range.e.c - range.s.c + 1,
    };
  });
}

export function loadWorkbook(filePath: string): LoadedWorkbook {
  const buf = readFileSync(filePath);
  return loadWorkbookFromBuffer(buf);
}

export function loadWorkbookFromBuffer(buf: Buffer | Uint8Array | ArrayBuffer): LoadedWorkbook {
  const wb = XLSX.read(buf, { type: "buffer", cellFormula: false, cellHTML: false });
  return { wb, sheets: describeSheets(wb) };
}

/** Lit une feuille en array-of-arrays. Cellules vides → null. */
export function loadSheetRows(wb: XLSX.WorkBook, sheetName: string): unknown[][] {
  const ws = wb.Sheets[sheetName];
  if (!ws) throw new Error(`Feuille introuvable : ${sheetName}`);
  return XLSX.utils.sheet_to_json<unknown[]>(ws, { header: 1, defval: null, raw: true });
}

export interface HeaderDetection {
  rowIdx: number; // 0-based
  headers: string[]; // valeurs brutes des cellules de la ligne d'en-tête
  confidence: number; // 0-1, heuristique
}

/**
 * Cherche la première ligne qui ressemble à un en-tête : ≥3 cellules
 * non-vides, courtes (< 80 chars), avec une majorité non-numérique.
 */
export function detectHeaderRow(rows: unknown[][]): HeaderDetection | null {
  const maxScan = Math.min(rows.length, 20);
  let best: HeaderDetection | null = null;
  for (let r = 0; r < maxScan; r++) {
    const row = rows[r] ?? [];
    const labels = row
      .map((v) => (v == null ? "" : String(v).trim()))
      .filter((s) => s.length > 0 && s.length < 80);
    if (labels.length < 3) continue;
    const nonNumeric = labels.filter((s) => Number.isNaN(Number(s.replace(",", ".")))).length;
    const ratio = nonNumeric / labels.length;
    if (ratio < 0.6) continue;
    const score = ratio * Math.min(labels.length / 10, 1);
    if (!best || score > best.confidence) {
      best = {
        rowIdx: r,
        headers: row.map((v) => (v == null ? "" : String(v).trim())),
        confidence: score,
      };
    }
  }
  return best;
}

export interface ColumnMapping {
  itemColIdx: number;
  corpsColIdx: number;
  titreColIdx: number | null;
}

export interface Phase {
  item: string;
  corps: string;
  titre?: string;
}

export function extractPhases(
  rows: unknown[][],
  headerRowIdx: number,
  mapping: ColumnMapping,
): Phase[] {
  const phases: Phase[] = [];
  for (let r = headerRowIdx + 1; r < rows.length; r++) {
    const row = rows[r] ?? [];
    const item = cellToString(row[mapping.itemColIdx]);
    const corps = cellToString(row[mapping.corpsColIdx]);
    if (!item || !corps) continue;
    const phase: Phase = { item, corps };
    if (mapping.titreColIdx !== null) {
      const titre = cellToString(row[mapping.titreColIdx]);
      if (titre) phase.titre = titre;
    }
    phases.push(phase);
  }
  return phases;
}

function cellToString(v: unknown): string {
  if (v == null) return "";
  return String(v).trim();
}

/** Liste des codes corps de métier distincts dans une colonne, triés alphabétiquement. */
export function distinctCorps(
  rows: unknown[][],
  headerRowIdx: number,
  corpsColIdx: number,
): string[] {
  const set = new Set<string>();
  for (let r = headerRowIdx + 1; r < rows.length; r++) {
    const v = cellToString((rows[r] ?? [])[corpsColIdx]);
    if (v) set.add(v.toUpperCase());
  }
  return [...set].sort();
}

/**
 * Pour chaque colonne du fichier, liste les valeurs distinctes (uppercased + triées).
 * Permet au wizard web de recalculer instantanément la liste des corps de métier
 * quand l'utilisateur change la colonne mappée — sans réuploader le fichier.
 */
export function distinctValuesByColumn(
  rows: unknown[][],
  headerRowIdx: number,
  colCount: number,
): Record<number, string[]> {
  const sets: Set<string>[] = Array.from({ length: colCount }, () => new Set<string>());
  for (let r = headerRowIdx + 1; r < rows.length; r++) {
    const row = rows[r] ?? [];
    for (let c = 0; c < colCount; c++) {
      const v = cellToString(row[c]);
      if (v) sets[c].add(v.toUpperCase());
    }
  }
  const out: Record<number, string[]> = {};
  for (let c = 0; c < colCount; c++) {
    out[c] = [...sets[c]].sort();
  }
  return out;
}

/** Pré-sélection heuristique des colonnes via patterns regex sur les en-têtes. */
const ITEM_PATTERNS = [/^item$/i, /n.{0,2}item/i, /^numero.*item$/i];
const CORPS_PATTERNS = [/corps.*m.*tier/i, /^corps$/i, /^trade$/i, /^discipline$/i];
const TITRE_PATTERNS = [/lib.*ll.*ot/i, /^titre/i, /intitul/i, /designation/i];

function normalize(s: string): string {
  return s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/\s+/g, " ").trim();
}

function findBestMatch(headers: readonly string[], patterns: readonly RegExp[]): number | null {
  for (let i = 0; i < headers.length; i++) {
    const h = normalize(headers[i] ?? "");
    if (h && patterns.some((p) => p.test(h))) return i;
  }
  return null;
}

export interface PreselectedMapping {
  itemColIdx: number | null;
  corpsColIdx: number | null;
  titreColIdx: number | null;
}

export function preselectColumns(headers: readonly string[]): PreselectedMapping {
  return {
    itemColIdx: findBestMatch(headers, ITEM_PATTERNS),
    corpsColIdx: findBestMatch(headers, CORPS_PATTERNS),
    titreColIdx: findBestMatch(headers, TITRE_PATTERNS),
  };
}

/** Pré-sélection automatique de la feuille la plus susceptible de contenir les gammes. */
export function preselectSheet(sheets: readonly SheetInfo[]): string {
  if (sheets.length === 1) return sheets[0].name;
  const otSheet = sheets.find((s) => /^ot/i.test(s.name));
  if (otSheet) return otSheet.name;
  return [...sheets].sort((a, b) => b.rowCount - a.rowCount)[0].name;
}
