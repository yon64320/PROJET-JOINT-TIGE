/**
 * Matching d'un nom de dossier (issu d'un upload `webkitdirectory`) vers un
 * `ot_items.item` du projet. Réutilise la logique de fuzzy matching Excel.
 *
 * Algorithme :
 *   1. Match exact normalisé (NFD + sans accents + lowercase + ponctuation collapse)
 *   2. Levenshtein avec ratio de similarité > 0.85 (strict — un nom d'ITEM est
 *      court, on ne veut pas associer "P-2547" à "P-2548" par erreur)
 */

import { normalizeHeader, levenshtein } from "@/lib/excel/detect-columns";

export interface ItemRef {
  id: string;
  item: string;
}

export interface FolderMatch {
  matchId: string | null;
  matchItem: string | null;
  /** 0-1 — 1 = exact, < 1 = fuzzy. null si pas de match du tout */
  confidence: number;
}

/**
 * Tente d'associer un `folderName` à un ITEM du projet.
 * Retourne `{ matchId: null }` si aucun match au-dessus du seuil.
 */
export function matchFolderToItem(
  folderName: string,
  otItems: ReadonlyArray<ItemRef>,
): FolderMatch {
  const normalized = normalizeHeader(folderName);
  if (!normalized) return { matchId: null, matchItem: null, confidence: 0 };

  // Phase 1 : exact normalisé
  for (const ot of otItems) {
    if (normalizeHeader(ot.item) === normalized) {
      return { matchId: ot.id, matchItem: ot.item, confidence: 1 };
    }
  }

  // Phase 2 : Levenshtein avec seuil strict (0.85) — évite "P-2547" → "P-2548"
  let bestId: string | null = null;
  let bestItem: string | null = null;
  let bestRatio = 0;

  for (const ot of otItems) {
    const norm = normalizeHeader(ot.item);
    if (!norm) continue;
    const dist = levenshtein(normalized, norm);
    const maxLen = Math.max(normalized.length, norm.length);
    if (maxLen === 0) continue;
    const ratio = 1 - dist / maxLen;
    if (ratio > 0.85 && ratio > bestRatio) {
      bestRatio = ratio;
      bestId = ot.id;
      bestItem = ot.item;
    }
  }

  return { matchId: bestId, matchItem: bestItem, confidence: bestRatio };
}
