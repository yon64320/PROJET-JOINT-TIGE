/**
 * Codec FEB Échafaudage — encode/décode entre la cellule Univer (texte) et
 * la sous-clé JSONB `flanges.echaf_feb.<key>`.
 *
 * Le tableur affiche tout en texte. Les arrays sont sérialisés en CSV
 * (séparateur `,` sauf hauteurs_planchers_supp = `;` pour ne pas confondre
 * avec une décimale).
 */

import type { EchafFebData } from "@/lib/validation/schemas";

export type FebKey = keyof EchafFebData;
export type FebColumnKind = "text" | "csv" | "csv_numeric" | "integer" | "boolean_class3";

/**
 * Définition d'une colonne FEB du tableur Échafaudage.
 * `febKey === null` → colonne dérivée (ex. CMU = combo classe3 + autre)
 *                     gérée à part par le composant.
 */
export interface FebColumnDef {
  header: string;
  febKey: FebKey | null;
  width: number;
  editable: boolean;
  kind: FebColumnKind;
}

export const FEB_COLUMNS: FebColumnDef[] = [
  { header: "N° FEB", febKey: "feb_number", width: 80, editable: false, kind: "text" },
  { header: "DATE FEB", febKey: "feb_date", width: 100, editable: false, kind: "text" },
  {
    header: "SOCIÉTÉ ÉCHAFAUDEUR",
    febKey: "societe_echafaudeur",
    width: 160,
    editable: true,
    kind: "text",
  },
  { header: "TYPES", febKey: "types", width: 200, editable: true, kind: "csv" },
  { header: "OPTIONS", febKey: "options", width: 180, editable: true, kind: "csv" },
  { header: "TYPE AUTRES", febKey: "type_autres", width: 140, editable: true, kind: "text" },
  { header: "NB PLANCHERS", febKey: "nb_planchers", width: 100, editable: true, kind: "integer" },
  {
    header: "HAUTEURS PLANCHERS SUPP",
    febKey: "hauteurs_planchers_supp",
    width: 180,
    editable: true,
    kind: "csv_numeric",
  },
  {
    header: "ÉLÉVATION DÉPART (m)",
    febKey: "elevation_depart",
    width: 130,
    editable: true,
    kind: "text",
  },
  { header: "NB ACCÈS", febKey: "nb_acces", width: 90, editable: true, kind: "integer" },
  { header: "TRAVAUX", febKey: "travaux", width: 240, editable: true, kind: "csv" },
  { header: "TRAVAUX AUTRES", febKey: "travaux_autres", width: 160, editable: true, kind: "text" },
  { header: "CONTRAINTES", febKey: "contraintes", width: 180, editable: true, kind: "csv" },
  { header: "TYPE SOL", febKey: "sol_type", width: 120, editable: true, kind: "text" },
  { header: "RISQUES", febKey: "risques", width: 200, editable: true, kind: "text" },
  { header: "DATE MONTAGE", febKey: "date_montage", width: 110, editable: true, kind: "text" },
  { header: "DATE DÉPOSE", febKey: "date_depose", width: 110, editable: true, kind: "text" },
  // CMU = combo classe3 + autre. Géré séparément par le composant via
  // febKey: null + kind: "boolean_class3" (lecture combinée, écriture sur
  // les 2 sous-clés en parallèle).
  { header: "CMU", febKey: null, width: 110, editable: true, kind: "boolean_class3" },
  { header: "DESCRIPTIF", febKey: "descriptif", width: 250, editable: true, kind: "text" },
  { header: "PRESCRIPTIONS", febKey: "prescriptions", width: 280, editable: true, kind: "text" },
  {
    header: "ENTREPRISES AUTORISÉES",
    febKey: "entreprises",
    width: 200,
    editable: true,
    kind: "csv",
  },
];

/** Encode une valeur JSONB → cellule (string). */
export function encodeFebCell(feb: EchafFebData | null | undefined, col: FebColumnDef): string {
  if (col.kind === "boolean_class3") {
    if (!feb) return "Classe 3";
    if (feb.cmu_classe3 !== false) return "Classe 3";
    return feb.cmu_autre ?? "";
  }
  if (!feb || col.febKey === null) return "";
  const v = feb[col.febKey];
  if (v == null) return "";
  switch (col.kind) {
    case "csv":
      return Array.isArray(v) ? (v as unknown[]).map((x) => String(x)).join(", ") : String(v);
    case "csv_numeric":
      return Array.isArray(v) ? (v as unknown[]).map((x) => String(x)).join("; ") : String(v);
    case "integer":
      return String(v);
    case "text":
    default:
      return String(v);
  }
}

/**
 * Décode une cellule (string) → valeur(s) à pousser via merge_echaf_feb.
 * Pour `boolean_class3`, retourne un array de patches `[{key, value}, ...]`
 * (CMU touche 2 sous-clés en parallèle).
 */
export type FebPatch = { key: FebKey; value: unknown };

export function decodeFebCell(raw: unknown, col: FebColumnDef): FebPatch[] {
  const text = raw == null ? "" : String(raw).trim();

  if (col.kind === "boolean_class3") {
    const isClasse3 = /^classe\s*3/i.test(text);
    if (isClasse3 || text === "") {
      return [
        { key: "cmu_classe3", value: true },
        { key: "cmu_autre", value: undefined },
      ];
    }
    return [
      { key: "cmu_classe3", value: false },
      { key: "cmu_autre", value: text },
    ];
  }

  if (col.febKey === null) return [];

  if (text === "") {
    if (col.kind === "csv" || col.kind === "csv_numeric") {
      return [{ key: col.febKey, value: [] }];
    }
    return [{ key: col.febKey, value: undefined }];
  }

  switch (col.kind) {
    case "csv": {
      const parts = text
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean);
      return [{ key: col.febKey, value: parts }];
    }
    case "csv_numeric": {
      const parts = text
        .split(/[;,]/)
        .map((s) => s.trim().replace(",", "."))
        .filter(Boolean)
        .map((s) => parseFloat(s))
        .filter((n) => !Number.isNaN(n));
      return [{ key: col.febKey, value: parts }];
    }
    case "integer": {
      const n = parseInt(text, 10);
      return [{ key: col.febKey, value: Number.isNaN(n) ? undefined : n }];
    }
    case "text":
    default:
      return [{ key: col.febKey, value: text }];
  }
}
