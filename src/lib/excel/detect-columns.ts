/**
 * Auto-détection des en-têtes et fuzzy matching des colonnes Excel.
 */

import type { FileType } from "./synonyms";
import { BUILTIN_SYNONYMS } from "./synonyms";

/** Normalise un en-tête : lowercase, sans accents, sans ponctuation superflue */
export function normalizeHeader(s: string): string {
  return s
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/** Distance de Levenshtein entre deux chaînes */
function levenshtein(a: string, b: string): number {
  const m = a.length;
  const n = b.length;
  const dp: number[][] = Array.from({ length: m + 1 }, () => Array(n + 1).fill(0));
  for (let i = 0; i <= m; i++) dp[i][0] = i;
  for (let j = 0; j <= n; j++) dp[0][j] = j;
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      dp[i][j] =
        a[i - 1] === b[j - 1]
          ? dp[i - 1][j - 1]
          : 1 + Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1]);
    }
  }
  return dp[m][n];
}

export interface ColumnMatch {
  excelIndex: number;
  excelHeader: string;
  dbField: string | null;
  confidence: number; // 0-1
}

export interface DetectionResult {
  headerRow: number;
  headerConfidence: number;
  headers: string[];
  matched: ColumnMatch[];
  unmatched: ColumnMatch[];
}

type SynonymMap = Record<string, string[]>;

/** Fusionne synonymes builtin + synonymes appris */
export function mergeSynonyms(
  fileType: FileType,
  learned: Map<string, string[]> = new Map(),
): SynonymMap {
  const builtin = BUILTIN_SYNONYMS[fileType];
  const merged: SynonymMap = {};
  for (const [field, syns] of Object.entries(builtin)) {
    merged[field] = [...syns];
  }
  for (const [field, syns] of learned) {
    if (!merged[field]) merged[field] = [];
    for (const s of syns) {
      if (!merged[field].includes(s)) merged[field].push(s);
    }
  }
  return merged;
}

/** Construit un index inversé normalisé : normalized_synonym → { dbField, original } */
function buildSynonymIndex(
  synonyms: SynonymMap,
): Map<string, { dbField: string; original: string }> {
  const index = new Map<string, { dbField: string; original: string }>();
  for (const [field, syns] of Object.entries(synonyms)) {
    for (const s of syns) {
      index.set(normalizeHeader(s), { dbField: field, original: s });
    }
  }
  return index;
}

/**
 * Détecte la ligne d'en-tête dans les données Excel.
 * Scanne les lignes 0-20 et retourne celle avec le meilleur score de matching.
 */
export function detectHeaderRow(
  data: unknown[][],
  fileType: FileType,
  synonyms?: SynonymMap,
): { rowIndex: number; confidence: number; headers: string[] } {
  const syns = synonyms ?? BUILTIN_SYNONYMS[fileType];
  const index = buildSynonymIndex(syns);

  let bestRow = 0;
  let bestScore = 0;
  let bestHeaders: string[] = [];

  const maxScan = Math.min(data.length, 21);
  for (let i = 0; i < maxScan; i++) {
    const row = data[i];
    if (!row || row.length < 3) continue;

    const headers = row.map((v) => (v != null ? String(v).trim() : ""));
    let score = 0;

    for (const h of headers) {
      if (!h) continue;
      const normalized = normalizeHeader(h);
      if (index.has(normalized)) {
        score++;
      } else {
        // Fuzzy fallback: inclusion or Levenshtein > 0.8 (stricter than column matching)
        for (const [norm] of index) {
          if (normalized.includes(norm) || norm.includes(normalized)) {
            score += 0.5;
            break;
          }
          const dist = levenshtein(normalized, norm);
          const maxLen = Math.max(normalized.length, norm.length);
          if (maxLen > 0 && 1 - dist / maxLen > 0.8) {
            score += 0.5;
            break;
          }
        }
      }
    }

    if (score > bestScore) {
      bestScore = score;
      bestRow = i;
      bestHeaders = headers;
    }
  }

  const totalKnownFields = Object.keys(syns).length;
  const confidence = totalKnownFields > 0 ? bestScore / totalKnownFields : 0;

  return { rowIndex: bestRow, confidence, headers: bestHeaders };
}

/**
 * Matche chaque en-tête Excel vers un champ DB connu.
 * Utilise 3 passes : exact → inclusion → Levenshtein.
 */
export function matchColumns(
  headers: string[],
  fileType: FileType,
  synonyms?: SynonymMap,
): { matched: ColumnMatch[]; unmatched: ColumnMatch[] } {
  const syns = synonyms ?? BUILTIN_SYNONYMS[fileType];
  const index = buildSynonymIndex(syns);
  const usedFields = new Set<string>();
  const matched: ColumnMatch[] = [];
  const unmatched: ColumnMatch[] = [];

  // Phase 1: exact match
  const pending: { idx: number; header: string; normalized: string }[] = [];
  for (let i = 0; i < headers.length; i++) {
    const header = headers[i];
    if (!header) {
      unmatched.push({ excelIndex: i, excelHeader: "", dbField: null, confidence: 0 });
      continue;
    }
    const normalized = normalizeHeader(header);
    const exact = index.get(normalized);
    if (exact && !usedFields.has(exact.dbField)) {
      matched.push({ excelIndex: i, excelHeader: header, dbField: exact.dbField, confidence: 1.0 });
      usedFields.add(exact.dbField);
    } else {
      pending.push({ idx: i, header, normalized });
    }
  }

  // Phase 2: inclusion match (header contient un synonyme ou inversement)
  const stillPending: typeof pending = [];
  for (const p of pending) {
    let bestField: string | null = null;
    let bestConf = 0;

    for (const [norm, { dbField }] of index) {
      if (usedFields.has(dbField)) continue;
      if (p.normalized.includes(norm) || norm.includes(p.normalized)) {
        const conf = 0.7;
        if (conf > bestConf) {
          bestConf = conf;
          bestField = dbField;
        }
      }
    }

    if (bestField && bestConf >= 0.5) {
      matched.push({
        excelIndex: p.idx,
        excelHeader: p.header,
        dbField: bestField,
        confidence: bestConf,
      });
      usedFields.add(bestField);
    } else {
      stillPending.push(p);
    }
  }

  // Phase 3: Levenshtein (seuil: distance / max_len < 0.3)
  for (const p of stillPending) {
    let bestField: string | null = null;
    let bestConf = 0;

    for (const [norm, { dbField }] of index) {
      if (usedFields.has(dbField)) continue;
      const dist = levenshtein(p.normalized, norm);
      const maxLen = Math.max(p.normalized.length, norm.length);
      if (maxLen === 0) continue;
      const ratio = 1 - dist / maxLen;
      if (ratio > 0.7 && ratio > bestConf) {
        bestConf = ratio;
        bestField = dbField;
      }
    }

    if (bestField) {
      matched.push({
        excelIndex: p.idx,
        excelHeader: p.header,
        dbField: bestField,
        confidence: bestConf,
      });
      usedFields.add(bestField);
    } else {
      unmatched.push({ excelIndex: p.idx, excelHeader: p.header, dbField: null, confidence: 0 });
    }
  }

  return { matched, unmatched };
}

/** Calcule un fingerprint des en-têtes pour matching de template */
export function computeFingerprint(headers: string[]): string {
  const normalized = headers.filter(Boolean).map(normalizeHeader).sort();
  return normalized.join("|");
}
