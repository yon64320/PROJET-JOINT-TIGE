import type { CorpsDeMetier } from "@/types/lut";

/**
 * Parse les 7 colonnes corps de métier (AB-AH).
 * Chaque colonne contient "X" si coché, sinon vide.
 */
export function parseCorpsDeMetier(
  values: (string | null)[]
): CorpsDeMetier {
  const isChecked = (v: string | null) => v?.toUpperCase() === "X";
  return {
    echafaudage: isChecked(values[0] ?? null),
    calorifuge: isChecked(values[1] ?? null),
    montage: isChecked(values[2] ?? null),
    metal: isChecked(values[3] ?? null),
    fourniture: isChecked(values[4] ?? null),
    nettoyage: isChecked(values[5] ?? null),
    autres: isChecked(values[6] ?? null),
  };
}
