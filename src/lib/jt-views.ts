/** J&T view mode definitions — shared between JtSheet, JtPageClient, and JtViewToggle */

export type JtViewMode =
  | "synthese"
  | "client"
  | "terrain"
  | "complete"
  | "robinetterie"
  | "echafaudage"
  | "calorifuge";

export interface JtViewConfig {
  label: string;
  description: string;
  fields: string[];
  readOnly?: boolean; // If true, ALL columns are read-only in this view
}

export const JT_VIEW_CONFIGS: Record<JtViewMode, JtViewConfig> = {
  synthese: {
    label: "Synthèse",
    description: "Vue condensée avec RETENU (EMIS prime sur BUTA)",
    fields: [
      "nom",
      "zone",
      "repere_buta",
      "repere_emis",
      "_dn_retenu",
      "_pn_retenu",
      "operation",
      "nb_tiges_retenu",
      "matiere_tiges_retenu",
      "dimension_tige_retenu",
      "nb_joints_prov_retenu",
      "nb_joints_def_retenu",
      "matiere_joint_retenu",
      "face_bride_retenu",
      "rob",
      "commentaires",
    ],
  },
  client: {
    label: "Client",
    description: "Données client importées (lecture seule)",
    fields: [
      "nom",
      "zone",
      "repere_buta",
      "repere_emis",
      "dn_buta",
      "pn_buta",
      "nb_tiges_buta",
      "matiere_tiges_buta",
      "nb_jp_buta",
      "nb_bp_buta",
      "materiel_buta",
      "matiere_joint_buta",
    ],
    readOnly: true,
  },
  terrain: {
    label: "Terrain / EMIS",
    description: "Colonnes EMIS (saisie terrain + données relevées)",
    fields: [
      "nom",
      "zone",
      "repere_buta",
      "repere_emis",
      "operation",
      "nb_jp_emis",
      "nb_bp_emis",
      "dn_emis",
      "pn_emis",
      "nb_tiges_emis",
      "matiere_tiges_emis",
      "dimension_tige_emis",
      "matiere_joint_emis",
      "face_bride_emis",
      "rondelle_emis",
      "calorifuge",
      "echafaudage",
      "field_status",
      "commentaires",
    ],
  },
  complete: {
    label: "Complète",
    description: "Toutes les colonnes + extra columns",
    fields: [], // Empty = all columns (handled by JtPageClient)
  },
  robinetterie: {
    label: "Robinetterie",
    description: "Brides rob — composant dédié (tableur + fiches PDF)",
    fields: [], // Not used — RobinerieView handles its own columns
  },
  echafaudage: {
    label: "Échafaudage",
    description: "Brides nécessitant un échafaudage — dimensions",
    fields: [], // Not used — EchafaudageView handles its own columns
  },
  calorifuge: {
    label: "Calorifuge",
    description: "Brides avec calorifuge — liste pour le calorifugeur",
    fields: [], // Not used — CalorifugeView handles its own columns
  },
};
