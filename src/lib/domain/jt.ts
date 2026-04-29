/**
 * Calcule la valeur RETENU d'un triplet EMIS/BUTA.
 * Règle : si EMIS a une valeur non-vide → EMIS, sinon → BUTA.
 * Le terrain prime toujours, mais une cellule vide ou whitespace-only
 * est considérée comme absente (et ne doit pas écraser BUTA).
 *
 * MED-04 (audit 2026-04-29) : `??` traitait `""` comme une valeur, donc
 * un effacement de cellule EMIS faisait perdre le fallback BUTA.
 */
export function computeRetenu(emis: string | null, buta: string | null): string | null {
  return emis?.trim() ? emis : buta;
}

/**
 * Détecte un delta (écart) entre deux valeurs.
 * Compare numériquement si les deux sont des nombres, sinon pas de delta.
 * "CALO" ou "PAS D'INFO" ne déclenchent pas de delta.
 *
 * MED-03 (audit 2026-04-29) : la virgule décimale française ("100,5")
 * était parsée en NaN. On normalise `,` -> `.` avant `Number()`.
 */
export function hasDelta(emis: string | null, buta: string | null): boolean {
  if (emis === null || buta === null) return false;
  const numEmis = Number(emis.replace(",", "."));
  const numButa = Number(buta.replace(",", "."));
  if (isNaN(numEmis) || isNaN(numButa)) return false;
  return numEmis !== numButa;
}
