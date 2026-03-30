import * as XLSX from "xlsx";

/**
 * Mapping colonnes J&T (en-têtes réels extraits du fichier Excel).
 * En-tête en ligne 7 (index 6), données lignes 8-1543.
 */
const COL = {
  ID_UBLEAM: 0,          // A
  NOM: 1,                // B — correspond à ITEM dans la LUT
  ZONE: 2,               // C
  FAMILLE_TRAVAUX: 3,    // D
  TYPE: 4,               // E
  REPERE_BUTA: 5,        // F
  REPERE_EMIS: 6,        // G
  REPERE_UBLEAM: 7,      // H
  COMMENTAIRE_REPERE: 8, // I
  DN_EMIS: 16,           // Q
  DN_BUTA: 17,           // R
  PN_EMIS: 19,           // T
  PN_BUTA: 20,           // U
  OPERATION: 23,         // X
  BARRETTE: 24,          // Y
  NB_JP_EMIS: 25,        // Z
  NB_JP_BUTA: 26,        // AA
  NB_BP_EMIS: 27,        // AB
  NB_BP_BUTA: 28,        // AC
  MATERIEL_EMIS: 29,     // AD
  MATERIEL_BUTA: 30,     // AE
  MATERIEL_ADF: 31,      // AF
  CLE: 32,               // AG
  NB_TIGES_EMIS: 34,     // AI — "NB TIGES"
  NB_TIGES_BUTA: 35,     // AJ — "NB TIGES DONNEES BUTA"
  // 36 = AK — "NB TIGES EMIS si relevé BUTA sinon" (RETENU, calculé)
  // 37 = AL — "TIGES" (dimension texte EMIS, ex: "M20 x 120")
  // 38 = AM — "TIGES DONNES BUTA" (dimension texte BUTA)
  // 39 = AN — "TIGES EMIS si relevé BUTA sinon" (RETENU)
  MATIERE_TIGES_EMIS: 40, // AO — "MAT TIGES"
  MATIERE_TIGES_BUTA: 41, // AP — "MAT TIGE DONNES BUTA"
  // 42 = AQ — "MATIERE BOULONNERIE EMIS si relevé BUTA sinon" (RETENU)
  DIAM_TIGES: 43,         // AR — "DIAM TIGES"
  // 44 = AS — "DIAMETRE THEORIQUE"
  LONG_TIGES: 45,         // AT — "LONG TIGES"
  // 46 = AU — "LONGUEUR THEORIQUE"
  // 47 = AV — "TIGES EPREUVE"
  NB_JT_PROV: 48,         // AW — "NB JT PROV"
  // 49 = AX — "NB JOINT PROV BUTA"
  NB_JT_DEF: 50,          // AY — "NB JT DEF"
  // 51 = AZ — "NB JOINT DEF BUTA"
  MAT_JT_EMIS: 52,        // BA — "MAT JT"
  MAT_JT_BUTA: 53,        // BB — "MATIERE JOINT BUTA"
  // 54 = BC — "MATIERE JOINTS EMIS si relevé BUTA sinon" (RETENU)
  RONDELLE: 55,            // BD — "RONDELLES"
  FACE_BRIDE: 56,          // BE — "FACE DE BRIDE"
  COMMENTAIRE: 57,         // BF — "Commentaire"
} as const;

const HEADER_ROW = 6; // 0-based index (ligne 7 Excel)

/** Valeurs considérées comme nulles dans le fichier J&T */
const NULL_VALUES = new Set([
  "#REF!",
  "#N/A",
  "#VALUE!",
  "",
]);
// Note : "PAS D'INFO" et "CALO" sont des valeurs métier conservées à l'import

export interface JtRow {
  id_ubleam: string | null;
  nom: string | null;
  zone: string | null;
  famille_travaux: string | null;
  type: string | null;
  repere_buta: string | null;
  repere_emis: string | null;
  repere_ubleam: string | null;
  commentaire_repere: string | null;
  dn_emis: string | null;        // TEXT — peut contenir "CALO", "PAS D'INFO"
  dn_buta: string | null;
  pn_emis: string | null;        // TEXT — peut contenir "PAS D'INFO"
  pn_buta: string | null;
  operation: string | null;
  barrette: string | null;
  nb_jp_emis: string | null;     // TEXT — cohérence avec le schéma
  nb_jp_buta: string | null;
  nb_bp_emis: string | null;
  nb_bp_buta: string | null;
  materiel_emis: string | null;
  materiel_buta: string | null;
  materiel_adf: string | null;
  cle: string | null;
  nb_tiges_emis: string | null;  // TEXT — peut contenir "PAS D'INFO"
  nb_tiges_buta: string | null;
  matiere_tiges_emis: string | null;
  matiere_tiges_buta: string | null;
  diametre_tige: string | null;
  longueur_tige: string | null;
  nb_joints_prov: string | null;
  nb_joints_def: string | null;
  matiere_joint_emis: string | null;
  matiere_joint_buta: string | null;
  rondelle: string | null;
  face_bride: string | null;
  commentaires: string | null;
}

function cellStr(row: unknown[], idx: number): string | null {
  const v = row[idx];
  if (v === undefined || v === null) return null;
  const s = String(v).trim();
  if (NULL_VALUES.has(s)) return null;
  return s;
}

/**
 * Parse un fichier J&T (.xlsm / .xlsx) et retourne les lignes de brides.
 * @param buffer ArrayBuffer du fichier Excel
 */
export function parseJt(buffer: ArrayBuffer): JtRow[] {
  const wb = XLSX.read(buffer, { type: "array" });

  // Trouver la feuille J&T (première feuille)
  const sheetName = wb.SheetNames[0];
  const ws = wb.Sheets[sheetName];
  const data: unknown[][] = XLSX.utils.sheet_to_json(ws, {
    header: 1,
    defval: null,
  });

  const rows: JtRow[] = [];

  for (let i = HEADER_ROW + 1; i < data.length; i++) {
    const row = data[i];
    if (!row || row.length === 0) continue;

    const nom = cellStr(row, COL.NOM);
    // Ignorer les lignes sans NOM (= ITEM de la LUT)
    if (!nom) continue;

    rows.push({
      id_ubleam: cellStr(row, COL.ID_UBLEAM),
      nom,
      zone: cellStr(row, COL.ZONE),
      famille_travaux: cellStr(row, COL.FAMILLE_TRAVAUX),
      type: cellStr(row, COL.TYPE),
      repere_buta: cellStr(row, COL.REPERE_BUTA),
      repere_emis: cellStr(row, COL.REPERE_EMIS),
      repere_ubleam: cellStr(row, COL.REPERE_UBLEAM),
      commentaire_repere: cellStr(row, COL.COMMENTAIRE_REPERE),
      dn_emis: cellStr(row, COL.DN_EMIS),
      dn_buta: cellStr(row, COL.DN_BUTA),
      pn_emis: cellStr(row, COL.PN_EMIS),
      pn_buta: cellStr(row, COL.PN_BUTA),
      operation: cellStr(row, COL.OPERATION),
      barrette: cellStr(row, COL.BARRETTE),
      nb_jp_emis: cellStr(row, COL.NB_JP_EMIS),
      nb_jp_buta: cellStr(row, COL.NB_JP_BUTA),
      nb_bp_emis: cellStr(row, COL.NB_BP_EMIS),
      nb_bp_buta: cellStr(row, COL.NB_BP_BUTA),
      materiel_emis: cellStr(row, COL.MATERIEL_EMIS),
      materiel_buta: cellStr(row, COL.MATERIEL_BUTA),
      materiel_adf: cellStr(row, COL.MATERIEL_ADF),
      cle: cellStr(row, COL.CLE),
      nb_tiges_emis: cellStr(row, COL.NB_TIGES_EMIS),
      nb_tiges_buta: cellStr(row, COL.NB_TIGES_BUTA),
      matiere_tiges_emis: cellStr(row, COL.MATIERE_TIGES_EMIS),
      matiere_tiges_buta: cellStr(row, COL.MATIERE_TIGES_BUTA),
      diametre_tige: cellStr(row, COL.DIAM_TIGES),
      longueur_tige: cellStr(row, COL.LONG_TIGES),
      nb_joints_prov: cellStr(row, COL.NB_JT_PROV),
      nb_joints_def: cellStr(row, COL.NB_JT_DEF),
      matiere_joint_emis: cellStr(row, COL.MAT_JT_EMIS),
      matiere_joint_buta: cellStr(row, COL.MAT_JT_BUTA),
      rondelle: cellStr(row, COL.RONDELLE),
      face_bride: cellStr(row, COL.FACE_BRIDE),
      commentaires: cellStr(row, COL.COMMENTAIRE),
    });
  }

  return rows;
}
