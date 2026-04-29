import type { OperationRef } from "@/types/jt";

/**
 * Table de correspondance : type d'opération → nombre de joints/brides.
 * Source : feuille "Operations" du fichier `data/J&T REV E - 20250209 pour correction.xlsm`
 * (28 opérations distinctes — un doublon "DECONNEXION/RECONNEXION + BRIDE FINE"
 * dans la source a été dédupliqué).
 *
 * Ordre des colonnes Excel : NB JT PROV, NB JT DEF, NB BP, NB JP.
 * 3 colonnes additionnelles présentes dans Excel (PLATINE EP, DUCHENE,
 * BRIDE PERCEE) ne sont pas modélisées ici — voir audit correctness.
 */
export const OPERATIONS_TABLE: Omit<OperationRef, "id">[] = [
  {
    operation_type: "DECONNEXION/RECONNEXION",
    nb_jp: 0,
    nb_bp: 0,
    nb_joints_prov: 0,
    nb_joints_def: 1,
  },
  {
    operation_type: "DECONNEXION/RECONNEXION + BP",
    nb_jp: 0,
    nb_bp: 1,
    nb_joints_prov: 1,
    nb_joints_def: 1,
  },
  {
    operation_type: "DECONNEXION/RECONNEXION + BP + BP EP",
    nb_jp: 0,
    nb_bp: 2,
    nb_joints_prov: 2,
    nb_joints_def: 1,
  },
  {
    operation_type: "DECONNEXION/RECONNEXION + BP + BP CHIM",
    nb_jp: 0,
    nb_bp: 2,
    nb_joints_prov: 2,
    nb_joints_def: 1,
  },
  {
    operation_type: "DECONNEXION/RECONNEXION + BRIDE FINE",
    nb_jp: 0,
    nb_bp: 1,
    nb_joints_prov: 1,
    nb_joints_def: 1,
  },
  {
    operation_type: "DECONNEXION/RECONNEXION + BP EP",
    nb_jp: 0,
    nb_bp: 1,
    nb_joints_prov: 1,
    nb_joints_def: 1,
  },
  {
    operation_type: "DECONNEXION/RECONNEXION + BP CHIM",
    nb_jp: 0,
    nb_bp: 1,
    nb_joints_prov: 1,
    nb_joints_def: 1,
  },
  {
    operation_type: "DECONNEXION/RECONNEXION + BP CHIM + BP EP",
    nb_jp: 0,
    nb_bp: 2,
    nb_joints_prov: 2,
    nb_joints_def: 1,
  },
  {
    operation_type: "DECONNEXION/RECONNEXION + BP NETTOYAGE HP",
    nb_jp: 0,
    nb_bp: 1,
    nb_joints_prov: 1,
    nb_joints_def: 1,
  },
  {
    operation_type: "DECONNEXION/RECONNEXION + NPT",
    nb_jp: 0,
    nb_bp: 0,
    nb_joints_prov: 0,
    nb_joints_def: 0,
  },
  {
    operation_type: "DECONNEXION/RECONNEXION + BP VIDANGE",
    nb_jp: 0,
    nb_bp: 1,
    nb_joints_prov: 1,
    nb_joints_def: 1,
  },
  {
    operation_type: "DECONNEXION/RECONNEXION + BP PASSIV.",
    nb_jp: 0,
    nb_bp: 1,
    nb_joints_prov: 1,
    nb_joints_def: 1,
  },
  {
    operation_type: "DECONNEXION/RECONNEXION + RO + BP",
    nb_jp: 0,
    nb_bp: 1,
    nb_joints_prov: 1,
    nb_joints_def: 2,
  },
  { operation_type: "DEPOSE REPOSE NPT", nb_jp: 0, nb_bp: 0, nb_joints_prov: 0, nb_joints_def: 0 },
  { operation_type: "DEPOSE/POSE RO", nb_jp: 0, nb_bp: 0, nb_joints_prov: 0, nb_joints_def: 2 },
  {
    operation_type: "OUVERTURE COUVERCLE",
    nb_jp: 0,
    nb_bp: 0,
    nb_joints_prov: 0,
    nb_joints_def: 1,
  },
  { operation_type: "OUVERTURE TH", nb_jp: 0, nb_bp: 0, nb_joints_prov: 0, nb_joints_def: 1 },
  {
    operation_type: "OUVERTURE TH + CROISILLON",
    nb_jp: 0,
    nb_bp: 0,
    nb_joints_prov: 0,
    nb_joints_def: 1,
  },
  {
    operation_type: "OUVERTURE TROU DE POING",
    nb_jp: 0,
    nb_bp: 0,
    nb_joints_prov: 0,
    nb_joints_def: 1,
  },
  { operation_type: "POSE/DEPOSE JP", nb_jp: 1, nb_bp: 0, nb_joints_prov: 2, nb_joints_def: 1 },
  {
    operation_type: "POSE/DEPOSE JP ENTRETOISE",
    nb_jp: 1,
    nb_bp: 0,
    nb_joints_prov: 3,
    nb_joints_def: 2,
  },
  { operation_type: "POSE/DEPOSE JP EP", nb_jp: 1, nb_bp: 0, nb_joints_prov: 2, nb_joints_def: 1 },
  {
    operation_type: "DEPOSE/REPOSE DOME OU BOITE",
    nb_jp: 0,
    nb_bp: 0,
    nb_joints_prov: 0,
    nb_joints_def: 1,
  },
  {
    operation_type: "DEPOSE/POSE FUSIBLE + JP",
    nb_jp: 1,
    nb_bp: 0,
    nb_joints_prov: 2,
    nb_joints_def: 2,
  },
  {
    operation_type: "DEPOSE/POSE FUSIBLE",
    nb_jp: 0,
    nb_bp: 0,
    nb_joints_prov: 0,
    nb_joints_def: 2,
  },
  {
    operation_type: "REMPLACEMENT/EQUILIBRAGE BOULONNERIE",
    nb_jp: 0,
    nb_bp: 0,
    nb_joints_prov: 0,
    nb_joints_def: 0,
  },
  {
    operation_type: "DECONNEXION/RECONNEXION + BP + BP CHIM + VANNE 3 VOIES",
    nb_jp: 0,
    nb_bp: 2,
    nb_joints_prov: 3,
    nb_joints_def: 1,
  },
  {
    operation_type: "DECONNEXION/RECONNEXION + BP + BP CHIM + VANNE DE REMPLISSAGE",
    nb_jp: 0,
    nb_bp: 2,
    nb_joints_prov: 3,
    nb_joints_def: 1,
  },
];

/** Lookup index : clé normalisée (trim + uppercase) → quantités. */
const TABLE_INDEX = new Map<string, Omit<OperationRef, "id" | "operation_type">>(
  OPERATIONS_TABLE.map(({ operation_type, ...quantities }) => [
    operation_type.trim().toUpperCase(),
    quantities,
  ]),
);

/**
 * Cherche les quantités de joints/brides pour un type d'opération donné.
 * Normalise (trim + uppercase) avant lookup pour absorber les écarts de saisie
 * (espaces, casse). Retourne null si l'opération est inconnue.
 */
export function getOperationQuantities(
  operationType: string | null | undefined,
): Omit<OperationRef, "id" | "operation_type"> | null {
  if (!operationType) return null;
  const key = operationType.trim().toUpperCase();
  if (!key) return null;
  return TABLE_INDEX.get(key) ?? null;
}

/**
 * Retourne `true` si l'opération est dans la table de référence.
 * Utilisé par le soft warning d'import (HIGH-11) pour signaler les
 * opérations hors enum qui ne déclencheront pas de cascade.
 */
export function isOperationKnown(operationType: string | null | undefined): boolean {
  if (!operationType) return false;
  const key = operationType.trim().toUpperCase();
  if (!key) return false;
  return TABLE_INDEX.has(key);
}
