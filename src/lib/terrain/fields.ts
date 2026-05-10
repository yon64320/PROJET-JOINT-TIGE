export type TerrainFieldKey =
  | "dn"
  | "pn"
  | "face_bride"
  | "nb_tiges"
  | "dimension_tige"
  | "matiere_joint"
  | "rondelle"
  | "calorifuge"
  | "echafaudage"
  | "echafaudage_feb"
  | "commentaires";

/**
 * `parent` : la case n'est cochable que si le parent est lui-même coché. Permet
 * de représenter la sous-option "FEB Échafaudage détaillée" qui dépend du
 * relevé Échafaudage.
 */
export const TERRAIN_FIELDS: { key: TerrainFieldKey; label: string; parent?: TerrainFieldKey }[] = [
  { key: "dn", label: "DN (Diamètre Nominal)" },
  { key: "pn", label: "PN (Pression Nominale)" },
  { key: "face_bride", label: "Type de face (RF/RTJ)" },
  { key: "nb_tiges", label: "Nombre de tiges" },
  { key: "dimension_tige", label: "Dimension tige" },
  { key: "matiere_joint", label: "Matière joint" },
  { key: "rondelle", label: "Rondelle" },
  { key: "calorifuge", label: "Calorifuge" },
  { key: "echafaudage", label: "Échafaudage" },
  { key: "echafaudage_feb", label: "FEB Échafaudage détaillée", parent: "echafaudage" },
  { key: "commentaires", label: "Commentaires" },
];

export const ALL_FIELD_KEYS = TERRAIN_FIELDS.map((f) => f.key);
