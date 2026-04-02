/**
 * Fonctions utilitaires partagées pour l'import en DB.
 */

/** Extrait une valeur string ou null */
export function getStr(row: Record<string, unknown>, field: string): string | null {
  const v = row[field];
  if (v === undefined || v === null || v === "") return null;
  return String(v);
}

/** Convertit en boolean : true si "X", "OUI", "O", ou true */
export function getBool(row: Record<string, unknown>, field: string): boolean {
  const v = row[field];
  if (v === true) return true;
  if (v === undefined || v === null) return false;
  return ["X", "OUI", "O"].includes(String(v).toUpperCase());
}

/**
 * Extrait une valeur numérique ou null.
 * Filtre les valeurs textuelles ("CALO", "PAS D'INFO", etc.)
 * qui peuvent se trouver dans les colonnes numériques Excel.
 */
export function getNumeric(row: Record<string, unknown>, field: string): number | null {
  const v = row[field];
  if (v === undefined || v === null || v === "") return null;
  const n = Number(v);
  if (isNaN(n)) return null;
  return n;
}

/**
 * Extrait un entier ou null.
 * Filtre les valeurs non-numériques et arrondit les décimales.
 */
export function getInteger(row: Record<string, unknown>, field: string): number | null {
  const n = getNumeric(row, field);
  if (n === null) return null;
  return Math.round(n);
}
