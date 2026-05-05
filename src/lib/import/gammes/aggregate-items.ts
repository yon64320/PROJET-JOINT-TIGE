/**
 * Agrégation des phases par ITEM : pour chaque item, calcule la liste des
 * corps de métier intervenants et l'intersection avec la sélection EMIS.
 */

import type { Phase } from "./parse-gammes";

export interface ItemAggregation {
  item: string;
  titre: string; // 1ʳᵉ valeur non-vide rencontrée pour cet item
  corpsAll: string[]; // tous les corps vus, triés
  corpsEmis: string[]; // intersection avec la sélection EMIS, triés
  isConcerned: boolean; // corpsEmis.length > 0
}

export interface AggregateStats {
  totalItems: number;
  concernedCount: number;
  ncCount: number;
}

export function aggregateItems(
  phases: Phase[],
  emisSelection: ReadonlySet<string>,
): { items: ItemAggregation[]; stats: AggregateStats } {
  const map = new Map<string, { titre: string; corps: Set<string> }>();
  for (const p of phases) {
    const key = p.item.trim();
    const corps = p.corps.trim().toUpperCase();
    if (!key || !corps) continue;
    let agg = map.get(key);
    if (!agg) {
      agg = { titre: "", corps: new Set() };
      map.set(key, agg);
    }
    agg.corps.add(corps);
    if (!agg.titre && p.titre) agg.titre = p.titre.trim();
  }

  const items: ItemAggregation[] = [...map.entries()]
    .map(([item, { titre, corps }]) => {
      const corpsAll = [...corps].sort();
      const corpsEmis = corpsAll.filter((c) => emisSelection.has(c));
      return { item, titre, corpsAll, corpsEmis, isConcerned: corpsEmis.length > 0 };
    })
    .sort((a, b) => a.item.localeCompare(b.item, "fr", { numeric: true }));

  const concernedCount = items.filter((i) => i.isConcerned).length;
  return {
    items,
    stats: {
      totalItems: items.length,
      concernedCount,
      ncCount: items.length - concernedCount,
    },
  };
}
