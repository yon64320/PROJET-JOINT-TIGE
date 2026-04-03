/**
 * Registre des champs disponibles pour la fiche intervention robinetterie.
 * Le tableau principal (zone 3) est configurable par projet.
 */

export interface FicheRobField {
  key: string;
  label: string;
  defaultColumn: "caracteristiques" | "travaux";
}

export interface FicheRobTemplate {
  caracteristiques: string[];
  travaux: string[];
}

export const FIELDS: FicheRobField[] = [
  // ── Caractéristiques (12) ──
  { key: "numero_client", label: "NUMERO CLIENT", defaultColumn: "caracteristiques" },
  { key: "eqpt_proximite", label: "EQPT A PROXIMITE", defaultColumn: "caracteristiques" },
  { key: "type", label: "TYPE", defaultColumn: "caracteristiques" },
  { key: "zone", label: "ZONE", defaultColumn: "caracteristiques" },
  { key: "hauteur", label: "HAUTEUR", defaultColumn: "caracteristiques" },
  { key: "encombrement", label: "ENCOMBREMENT", defaultColumn: "caracteristiques" },
  { key: "circuit_primaire", label: "CIRCUIT PRIMAIRE", defaultColumn: "caracteristiques" },
  { key: "gamme", label: "GAMME", defaultColumn: "caracteristiques" },
  { key: "cmr", label: "CMR", defaultColumn: "caracteristiques" },
  { key: "amiante_plomb", label: "AMIANTE / PLOMB", defaultColumn: "caracteristiques" },
  { key: "poids", label: "POIDS", defaultColumn: "caracteristiques" },
  { key: "rondelles", label: "RONDELLES", defaultColumn: "caracteristiques" },

  // ── Travaux (12) ──
  { key: "responsable", label: "RESPONSABLE", defaultColumn: "travaux" },
  { key: "travaux", label: "TRAVAUX", defaultColumn: "travaux" },
  { key: "transport", label: "TRANSPORT", defaultColumn: "travaux" },
  { key: "obturation_adm", label: "OBTURATION ADM", defaultColumn: "travaux" },
  { key: "obturation_ref", label: "OBTURATION REF", defaultColumn: "travaux" },
  { key: "joint_lunette", label: "JOINT & LUNETTE", defaultColumn: "travaux" },
  { key: "echaf", label: "ECHAF", defaultColumn: "travaux" },
  { key: "calo_frigo", label: "CALO / FRIGO", defaultColumn: "travaux" },
  { key: "tracage", label: "TRACAGE", defaultColumn: "travaux" },
  { key: "levage", label: "LEVAGE", defaultColumn: "travaux" },
  { key: "potence", label: "POTENCE", defaultColumn: "travaux" },
  { key: "support_ligne", label: "SUPPORT DE LIGNE", defaultColumn: "travaux" },
];

/** Lookup rapide par key */
export const FIELD_MAP = new Map<string, FicheRobField>(FIELDS.map((f) => [f.key, f]));

/** Template par défaut — tous les champs dans leur colonne d'origine */
export const DEFAULT_TEMPLATE: FicheRobTemplate = {
  caracteristiques: FIELDS.filter((f) => f.defaultColumn === "caracteristiques").map((f) => f.key),
  travaux: FIELDS.filter((f) => f.defaultColumn === "travaux").map((f) => f.key),
};

/** Valide un template : chaque key doit exister, pas de doublon entre colonnes */
export function validateTemplate(
  tpl: FicheRobTemplate,
): { valid: true } | { valid: false; error: string } {
  const allKeys = [...tpl.caracteristiques, ...tpl.travaux];
  const seen = new Set<string>();
  for (const key of allKeys) {
    if (!FIELD_MAP.has(key)) {
      return { valid: false, error: `Champ inconnu : "${key}"` };
    }
    if (seen.has(key)) {
      return { valid: false, error: `Doublon : "${key}"` };
    }
    seen.add(key);
  }
  return { valid: true };
}
