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
  | "commentaires";

export const TERRAIN_FIELDS: { key: TerrainFieldKey; label: string }[] = [
  { key: "dn", label: "DN (Diamètre Nominal)" },
  { key: "pn", label: "PN (Pression Nominale)" },
  { key: "face_bride", label: "Type de face (RF/RTJ)" },
  { key: "nb_tiges", label: "Nombre de tiges" },
  { key: "dimension_tige", label: "Dimension tige" },
  { key: "matiere_joint", label: "Matière joint" },
  { key: "rondelle", label: "Rondelle" },
  { key: "calorifuge", label: "Calorifuge" },
  { key: "echafaudage", label: "Échafaudage" },
  { key: "commentaires", label: "Commentaires" },
];

export const ALL_FIELD_KEYS = TERRAIN_FIELDS.map((f) => f.key);
