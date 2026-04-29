export type Step =
  | "calo_shortcut"
  | "dn"
  | "pn"
  | "nb_tiges"
  | "dimension_tige"
  | "face_bride"
  | "matiere_joint"
  | "rondelle"
  | "calorifuge"
  | "echafaudage"
  | "echafaudage_dimensions"
  | "commentaires"
  | "photo_bride"
  | "photo_echafaudage"
  | "photo_calorifuge"
  | "recap";

/**
 * Valeurs courantes du wizard.
 * `calorifuge` / `echafaudage` sont boolean dans OfflineFlange mais deviennent
 * "OUI" | null après saveField — le type accepte les 2 formes pour la cohabitation.
 */
export interface WizardValues {
  dn_emis: string;
  pn_emis: string;
  face_bride_emis: string;
  nb_tiges_emis: string;
  dimension_tige_emis: string;
  matiere_joint_emis: string;
  rondelle_emis: string;
  calorifuge: string | boolean | null;
  echafaudage: string | boolean | null;
  echaf_longueur: string;
  echaf_largeur: string;
  echaf_hauteur: string;
  commentaires: string;
}

export type SaveField = (field: string, value: string | number | boolean | null) => void;
