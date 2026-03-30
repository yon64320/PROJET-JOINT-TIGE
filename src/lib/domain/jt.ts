/**
 * Calcule la valeur RETENU d'un triplet EMIS/BUTA.
 * Règle : si EMIS a une valeur → EMIS, sinon → BUTA.
 * Le terrain prime toujours.
 */
export function computeRetenu(emis: string | null, buta: string | null): string | null {
  return emis ?? buta;
}

/**
 * Détecte un delta (écart) entre deux valeurs.
 * Compare numériquement si les deux sont des nombres, sinon pas de delta.
 * "CALO" ou "PAS D'INFO" ne déclenchent pas de delta.
 */
export function hasDelta(
  emis: string | null,
  buta: string | null
): boolean {
  if (emis === null || buta === null) return false;
  const numEmis = Number(emis);
  const numButa = Number(buta);
  if (isNaN(numEmis) || isNaN(numButa)) return false;
  return numEmis !== numButa;
}
