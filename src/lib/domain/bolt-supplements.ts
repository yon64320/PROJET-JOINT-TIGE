/**
 * Suppléments tiges — table de majoration selon le type d'épreuve.
 * Source : feuille Tiges du J&T, lignes 108-113.
 */
export const BOLT_SUPPLEMENTS = [
  { label: "Épreuve", extra: 20 },
  { label: "Épreuve + 1 barrette", extra: 30 },
  { label: "Épreuve + 2 barrettes", extra: 40 },
  { label: "1 barrette", extra: 10 },
  { label: "2 barrettes", extra: 20 },
] as const;

export type BoltSupplement = (typeof BOLT_SUPPLEMENTS)[number];
