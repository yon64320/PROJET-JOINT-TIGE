/** Données d'une bride robinetterie (num_rob non vide) avec jointure ot_items.
 *  Utilisé par FicheSelector, fiche-rob-html, RobinerieView.
 *  L'appariement (ADM/REF) est implicite via la clé (ot_item_id, num_rob).
 */
export interface RobFlangeRow {
  id: string;
  ot_item_id: string;
  nom: string | null;
  zone: string | null;
  type: string | null;
  repere_buta: string | null;
  repere_emis: string | null;
  operation: string | null;
  dn_emis: string | number | null;
  dn_buta: string | number | null;
  pn_emis: string | number | null;
  pn_buta: string | number | null;
  nb_tiges_emis: string | number | null;
  nb_tiges_buta: string | number | null;
  matiere_tiges_emis: string | null;
  matiere_tiges_buta: string | null;
  matiere_joint_emis: string | null;
  matiere_joint_buta: string | null;
  nb_joints_prov_emis: string | number | null;
  nb_joints_prov_buta: string | number | null;
  nb_joints_prov_retenu: string | number | null;
  nb_joints_def_emis: string | number | null;
  nb_joints_def_buta: string | number | null;
  nb_joints_def_retenu: string | number | null;
  responsable: string | null;
  rondelle_emis: string | null;
  rondelle_buta: string | null;
  rondelle_retenu: string | null;
  commentaires: string | null;
  num_rob: string | null;
  rob_side: "ADM" | "REF" | null;
  ot_items?: {
    item: string;
    unite: string;
    famille_item: string;
    type_travaux: string;
  };
  [key: string]: unknown;
}

/**
 * Une vanne = 1 ou 2 brides du même item partageant le même num_rob.
 * `pairKey` est une clé synthétique `${ot_item_id}::${num_rob}`.
 */
export interface ValvePair {
  pairKey: string;
  admission: RobFlangeRow | null;
  refoulement: RobFlangeRow | null;
}
