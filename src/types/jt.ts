/** Triplet EMIS / BUTA / RETENU — le terrain prime toujours */
export interface Triplet<T> {
  emis: T | null;
  buta: T | null;
  /** Calculé : si emis a une valeur → emis, sinon → buta */
  retenu: T | null;
}

/** Une ligne du J&T = 1 bride (joint cassé) */
export interface Flange {
  id: string;
  project_id: string;
  /** FK vers OtItem */
  ot_item_id: string;

  // --- Identification (cols A-E) ---
  id_ubleam: string | null;
  nom: string | null;
  zone: string | null;
  famille_travaux: string | null;
  type: string | null;

  // --- Repères bride (cols F-I) ---
  repere_buta: string | null;
  repere_emis: string | null;
  repere_ubleam: string | null;
  commentaire_repere: string | null;

  // --- DN (cols Q-S) — TEXT, peut contenir "CALO", "PAS D'INFO" ---
  dn_emis: string | null;
  dn_buta: string | null;
  delta_dn: boolean;

  // --- PN (cols T-V) — TEXT, peut contenir "PAS D'INFO" ---
  pn_emis: string | null;
  pn_buta: string | null;
  delta_pn: boolean;

  // --- Opération (cols X-Y) ---
  /** Colonne moteur — détermine joints/brides automatiquement */
  operation: string | null;
  barrette: string | null;

  // --- Matériel (cols Z-AG) — TEXT ---
  nb_jp_emis: string | null;
  nb_jp_buta: string | null;
  nb_bp_emis: string | null;
  nb_bp_buta: string | null;
  materiel_emis: string | null;
  materiel_buta: string | null;
  materiel_adf: string | null;
  cle: string | null;

  // --- Tiges quantité (cols AI-AK) — TEXT ---
  nb_tiges_emis: string | null;
  nb_tiges_buta: string | null;
  nb_tiges_retenu: string | null;

  // --- Tiges matière (cols AL-AN) ---
  matiere_tiges_emis: string | null;
  matiere_tiges_buta: string | null;
  matiere_tiges_retenu: string | null;

  // --- Tiges dimensions (cols AR-AV) — TEXT ---
  diametre_tige: string | null;
  longueur_tige: string | null;

  // --- Joints quantité — TEXT ---
  nb_joints_prov: string | null;
  nb_joints_def: string | null;

  // --- Joints matière (cols BA-BC) ---
  matiere_joint_emis: string | null;
  matiere_joint_buta: string | null;
  matiere_joint_retenu: string | null;

  // --- Compléments (cols BD-BG) ---
  rondelle: string | null;
  face_bride: string | null;
  commentaires: string | null;
}

/** Table de correspondance Opérations (feuille "Operations") */
export interface OperationRef {
  id: string;
  operation_type: string;
  nb_jp: number;
  nb_bp: number;
  nb_joints_prov: number;
  nb_joints_def: number;
}

/** Liste déroulante */
export interface DropdownItem {
  id: string;
  category: string;
  value: string;
  sort_order: number;
}
