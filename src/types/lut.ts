/** Famille d'item dans la LUT */
export type FamilleItem =
  | "Equipement"
  | "Intervention"
  | "NC"
  | "OTG"
  | "Robinetterie"
  | "Tuyauterie";

/** Type d'item (équipement) */
export type TypeItem =
  | "Colonne"
  | "Filtre"
  | "Ballon"
  | "Echangeur"
  | "Aéro"
  | "Capacité"
  | "Réacteur"
  | string;

/** Type de travaux (corps de métier principal) */
export type TypeTravaux = "H0" | "K0" | "L0" | "N0" | "T0" | string;

/** Statut OT : Base, Complémentaire, Annulé */
export type StatutOT = "TB" | "TC" | "TA";

/** Corps de métier cochés (7 colonnes AB-AH) */
export interface CorpsDeMetier {
  echafaudage: boolean;
  calorifuge: boolean;
  montage: boolean;
  metal: boolean;
  fourniture: boolean;
  nettoyage: boolean;
  autres: boolean;
}

/** Une ligne de la LUT = 1 OT */
export interface OtItem {
  id: string;
  project_id: string;
  /** Colonne A — N° ligne */
  numero_ligne: number | null;
  /** Colonne B — N° OT */
  ot: string | null;
  /** Colonne C — Lot */
  lot: string | null;
  /** Colonne H — Unité */
  unite: string | null;
  /** Colonne I — ITEM (clé primaire métier) */
  item: string;
  /** Colonne L — Titre gamme */
  titre_gamme: string | null;
  /** Colonne M — Famille item */
  famille_item: FamilleItem | null;
  /** Colonne N — Type item */
  type_item: TypeItem | null;
  /** Colonne O — Type travaux */
  type_travaux: TypeTravaux | null;
  /** Colonne Q — TB/TC/TA */
  statut: StatutOT | null;
  /** Colonnes AB-AH — Corps de métier */
  corps_de_metier: CorpsDeMetier;
  /** Colonne AI — Révision */
  revision: string | null;
  /** Colonne AK — Commentaires */
  commentaires: string | null;
}
