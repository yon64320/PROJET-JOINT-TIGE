/**
 * @deprecated Utiliser generic-parser.ts avec detect-columns.ts pour l'import adaptatif.
 * Ce parser est conservé en fallback pour l'ancien endpoint /api/import.
 */
import * as XLSX from "xlsx";

/**
 * Mapping colonnes LUT (en-têtes réels extraits du fichier Excel).
 * En-tête en ligne 3 (index 2), données lignes 4-301.
 * Colonne A = vide (marge), données utiles B-AH.
 */
/**
 * SheetJS supprime la colonne A (vide/marge) du fichier Excel,
 * donc les indices sont décalés de -1 par rapport aux lettres Excel.
 * Excel B = index 0, Excel C = index 1, etc.
 */
const COL = {
  CHRONO_EMIS: 0,    // Excel B (idx 0 après suppression col A)
  CHRONO_BUTA: 1,    // Excel C
  RESPONSABLE: 2,    // Excel D
  AMIANTE: 5,        // Excel G
  UNITE: 6,          // Excel H
  ITEM: 7,           // Excel I
  OT: 8,             // Excel J
  LOT: 9,            // Excel K
  TITRE_GAMME: 10,   // Excel L
  FAMILLE_ITEM: 11,  // Excel M
  TYPE_ITEM: 12,     // Excel N
  TYPE_TRAVAUX: 13,  // Excel O
  REV: 14,           // Excel P
  TB_TC_TA: 15,      // Excel Q
  FIESP: 16,         // Excel R
  COMMENTAIRES: 17,  // Excel S
  ECHAF: 26,         // Excel AB
  CALO: 27,          // Excel AC
  MONT: 28,          // Excel AD
  MET: 29,           // Excel AE
  FOURNITURE: 30,    // Excel AF
  NETT: 31,          // Excel AG
  AUTRES: 32,        // Excel AH
} as const;

const HEADER_ROW = 2; // 0-based index (ligne 3 Excel)

export interface LutRow {
  chrono_emis: string | null;
  chrono_buta: string | null;
  unite: string | null;
  item: string;
  ot: string | null;
  lot: string | null;
  titre_gamme: string | null;
  famille_item: string | null;
  type_item: string | null;
  type_travaux: string | null;
  revision: string | null;
  statut: string | null;
  commentaires: string | null;
  corps_metier_echaf: boolean;
  corps_metier_calo: boolean;
  corps_metier_montage: boolean;
  corps_metier_metal: boolean;
  corps_metier_fourniture: boolean;
  corps_metier_nettoyage: boolean;
  corps_metier_autres: boolean;
}

function cellStr(row: unknown[], idx: number): string | null {
  const v = row[idx];
  if (v === undefined || v === null || v === "") return null;
  return String(v).trim();
}

function isChecked(row: unknown[], idx: number): boolean {
  const v = cellStr(row, idx);
  return v?.toUpperCase() === "X";
}

/**
 * Parse un fichier LUT (.xlsm / .xlsx) et retourne les lignes d'OT.
 * @param buffer ArrayBuffer du fichier Excel
 */
export function parseLut(buffer: ArrayBuffer): LutRow[] {
  const wb = XLSX.read(buffer, { type: "array" });
  const sheetName = wb.SheetNames[0]; // Première feuille = "LUT"
  const ws = wb.Sheets[sheetName];
  const data: unknown[][] = XLSX.utils.sheet_to_json(ws, {
    header: 1,
    defval: null,
  });

  const rows: LutRow[] = [];

  // Données à partir de la ligne après l'en-tête
  for (let i = HEADER_ROW + 1; i < data.length; i++) {
    const row = data[i];
    if (!row || row.length === 0) continue;

    const item = cellStr(row, COL.ITEM);
    // Ignorer les lignes sans ITEM ou les réservations
    if (!item || item === "Réservation") continue;

    rows.push({
      chrono_emis: cellStr(row, COL.CHRONO_EMIS),
      chrono_buta: cellStr(row, COL.CHRONO_BUTA),
      unite: cellStr(row, COL.UNITE),
      item,
      ot: cellStr(row, COL.OT),
      lot: cellStr(row, COL.LOT),
      titre_gamme: cellStr(row, COL.TITRE_GAMME),
      famille_item: cellStr(row, COL.FAMILLE_ITEM),
      type_item: cellStr(row, COL.TYPE_ITEM),
      type_travaux: cellStr(row, COL.TYPE_TRAVAUX),
      revision: cellStr(row, COL.REV),
      statut: cellStr(row, COL.TB_TC_TA),
      commentaires: cellStr(row, COL.COMMENTAIRES),
      corps_metier_echaf: isChecked(row, COL.ECHAF),
      corps_metier_calo: isChecked(row, COL.CALO),
      corps_metier_montage: isChecked(row, COL.MONT),
      corps_metier_metal: isChecked(row, COL.MET),
      corps_metier_fourniture: isChecked(row, COL.FOURNITURE),
      corps_metier_nettoyage: isChecked(row, COL.NETT),
      corps_metier_autres: isChecked(row, COL.AUTRES),
    });
  }

  return rows;
}
