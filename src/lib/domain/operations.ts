import type { OperationRef } from "@/types/jt";

/**
 * Table de correspondance : type d'opération → nombre de joints/brides.
 * Source : feuille "Operations" du fichier J&T.
 * À terme, cette table sera en base de données.
 * Pour l'instant, hardcodée d'après le fichier Excel.
 */
export const OPERATIONS_TABLE: Omit<OperationRef, "id">[] = [
  // TODO: Extraire les valeurs exactes depuis la feuille Operations du J&T
  // Exemple de structure :
  // { operation_type: "Ouverture", nb_jp: 1, nb_bp: 0, nb_joints_prov: 1, nb_joints_def: 1 },
];

/**
 * Cherche les quantités de joints/brides pour un type d'opération donné.
 */
export function getOperationQuantities(
  operationType: string,
): Omit<OperationRef, "id" | "operation_type"> | null {
  const match = OPERATIONS_TABLE.find((op) => op.operation_type === operationType);
  if (!match) return null;
  const { operation_type: _, ...quantities } = match;
  void _;
  return quantities;
}
