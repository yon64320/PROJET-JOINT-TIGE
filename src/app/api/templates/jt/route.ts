import { NextResponse } from "next/server";
import * as XLSX from "xlsx";

/** Column definitions for the J&T template */
const TEMPLATE_COLUMNS = [
  {
    header: "NOM",
    dbField: "nom",
    tier: "essential",
    type: "Texte",
    description: "Nom / repère de la ligne de tuyauterie",
    example: "L-1234-A",
  },
  {
    header: "ZONE",
    dbField: "zone",
    tier: "essential",
    type: "Texte",
    description: "Zone / unité de l'équipement",
    example: "U200",
  },
  {
    header: "REP. CLIENT",
    dbField: "repere_buta",
    tier: "important",
    type: "Texte",
    description: "Repère de la bride côté client",
    example: "B1",
  },
  {
    header: "REP. EMIS",
    dbField: "repere_emis",
    tier: "important",
    type: "Texte",
    description: "Repère de la bride côté terrain (EMIS)",
    example: "B1-A",
  },
  {
    header: "DN EMIS",
    dbField: "dn_emis",
    tier: "essential",
    type: "Nombre",
    description: "Diamètre nominal relevé terrain",
    example: "150",
  },
  {
    header: "DN CLIENT",
    dbField: "dn_buta",
    tier: "essential",
    type: "Nombre",
    description: "Diamètre nominal données client",
    example: "150",
  },
  {
    header: "PN EMIS",
    dbField: "pn_emis",
    tier: "essential",
    type: "Nombre",
    description: "Pression nominale relevée terrain",
    example: "40",
  },
  {
    header: "PN CLIENT",
    dbField: "pn_buta",
    tier: "essential",
    type: "Nombre",
    description: "Pression nominale données client",
    example: "40",
  },
  {
    header: "OPÉRATION",
    dbField: "operation",
    tier: "essential",
    type: "Texte",
    description: "Type d'opération (OUVERTURE/FERMETURE, CHANGEMENT JOINT, etc.)",
    example: "OUVERTURE/FERMETURE",
  },
  {
    header: "NB TIGES EMIS",
    dbField: "nb_tiges_emis",
    tier: "important",
    type: "Nombre entier",
    description: "Nombre de tiges relevé terrain",
    example: "8",
  },
  {
    header: "NB TIGES CLIENT",
    dbField: "nb_tiges_buta",
    tier: "important",
    type: "Nombre entier",
    description: "Nombre de tiges données client",
    example: "8",
  },
  {
    header: "MAT. TIGES EMIS",
    dbField: "matiere_tiges_emis",
    tier: "important",
    type: "Texte",
    description: "Matière des tiges relevée terrain",
    example: "B7",
  },
  {
    header: "MAT. TIGES CLIENT",
    dbField: "matiere_tiges_buta",
    tier: "important",
    type: "Texte",
    description: "Matière des tiges données client",
    example: "B7",
  },
  {
    header: "MAT. JOINT EMIS",
    dbField: "matiere_joint_emis",
    tier: "important",
    type: "Texte",
    description: "Matière du joint relevée terrain",
    example: "GRAPHITE",
  },
  {
    header: "MAT. JOINT CLIENT",
    dbField: "matiere_joint_buta",
    tier: "important",
    type: "Texte",
    description: "Matière du joint données client",
    example: "GRAPHITE",
  },
  {
    header: "DIM TIGE BUTA",
    dbField: "dimension_tige_buta",
    tier: "important",
    type: "Texte",
    description: "Dimension tige côté client (ex. M16 x 70)",
    example: "M16 x 70",
  },
  {
    header: "FACE BRIDE BUTA",
    dbField: "face_bride_buta",
    tier: "important",
    type: "RF / RTJ",
    description: "Type de face de bride côté client",
    example: "RF",
  },
  {
    header: "NB JT PROV BUTA",
    dbField: "nb_joints_prov_buta",
    tier: "optional",
    type: "Nombre entier",
    description: "Nombre de joints provisoires côté client",
    example: "1",
  },
  {
    header: "NB JT DEF BUTA",
    dbField: "nb_joints_def_buta",
    tier: "optional",
    type: "Nombre entier",
    description: "Nombre de joints définitifs côté client",
    example: "1",
  },
  {
    header: "RONDELLE BUTA",
    dbField: "rondelle_buta",
    tier: "optional",
    type: "Texte",
    description: "Type de rondelle côté client",
    example: "",
  },
  {
    header: "CALORIFUGE",
    dbField: "calorifuge",
    tier: "optional",
    type: "OUI / (vide)",
    description: "Présence de calorifuge",
    example: "",
  },
  {
    header: "ÉCHAFAUDAGE",
    dbField: "echafaudage",
    tier: "optional",
    type: "OUI / (vide)",
    description: "Besoin d'échafaudage",
    example: "",
  },
  {
    header: "ROB",
    dbField: "rob",
    tier: "optional",
    type: "OUI / (vide)",
    description: "Bride de robinetterie",
    example: "",
  },
  {
    header: "COMMENTAIRES",
    dbField: "commentaires",
    tier: "optional",
    type: "Texte",
    description: "Commentaires libres",
    example: "",
  },
];

const TIER_LABELS: Record<string, string> = {
  essential: "Essentielle",
  important: "Importante",
  optional: "Optionnelle",
};

export async function GET() {
  const wb = XLSX.utils.book_new();

  // --- Sheet 1: "Données" ---
  const headers = TEMPLATE_COLUMNS.map((c) => c.header);
  const example1 = TEMPLATE_COLUMNS.map((c) => c.example);
  const example2 = TEMPLATE_COLUMNS.map((c) => {
    // Second example row with different values
    if (c.dbField === "nom") return "L-5678-B";
    if (c.dbField === "zone") return "U300";
    if (c.dbField === "repere_buta") return "B3";
    if (c.dbField === "repere_emis") return "B3-A";
    if (c.dbField === "dn_emis") return "200";
    if (c.dbField === "dn_buta") return "200";
    if (c.dbField === "pn_emis") return "16";
    if (c.dbField === "pn_buta") return "16";
    if (c.dbField === "operation") return "CHANGEMENT JOINT";
    if (c.dbField === "nb_tiges_emis") return "12";
    if (c.dbField === "nb_tiges_buta") return "12";
    if (c.dbField === "matiere_tiges_emis") return "L7";
    if (c.dbField === "matiere_tiges_buta") return "L7";
    if (c.dbField === "matiere_joint_emis") return "PTFE";
    if (c.dbField === "matiere_joint_buta") return "PTFE";
    if (c.dbField === "face_bride_buta") return "RTJ";
    if (c.dbField === "dimension_tige_buta") return "M20 x 90";
    if (c.dbField === "calorifuge") return "OUI";
    return "";
  });

  const wsData = XLSX.utils.aoa_to_sheet([headers, example1, example2]);

  // Column widths
  wsData["!cols"] = TEMPLATE_COLUMNS.map((c) => ({
    wch: Math.max(c.header.length + 2, 14),
  }));

  // Style header row (bold + green background) via cell formatting
  for (let i = 0; i < headers.length; i++) {
    const cellRef = XLSX.utils.encode_cell({ r: 0, c: i });
    if (wsData[cellRef]) {
      wsData[cellRef].s = {
        font: { bold: true, color: { rgb: "FFFFFF" } },
        fill: { fgColor: { rgb: "70AD47" } },
        alignment: { horizontal: "center" },
      };
    }
  }

  XLSX.utils.book_append_sheet(wb, wsData, "Données");

  // --- Sheet 2: "Guide" ---
  const guideHeaders = [
    "Colonne",
    "Champ DB",
    "Priorité",
    "Type",
    "Valeurs possibles",
    "Description",
  ];
  const guideRows = TEMPLATE_COLUMNS.map((c) => [
    c.header,
    c.dbField,
    TIER_LABELS[c.tier] ?? c.tier,
    c.type,
    c.type.includes("/") ? c.type : "",
    c.description,
  ]);

  const wsGuide = XLSX.utils.aoa_to_sheet([guideHeaders, ...guideRows]);
  wsGuide["!cols"] = [
    { wch: 18 }, // Colonne
    { wch: 22 }, // Champ DB
    { wch: 12 }, // Priorité
    { wch: 16 }, // Type
    { wch: 16 }, // Valeurs
    { wch: 50 }, // Description
  ];

  // Style guide header
  for (let i = 0; i < guideHeaders.length; i++) {
    const cellRef = XLSX.utils.encode_cell({ r: 0, c: i });
    if (wsGuide[cellRef]) {
      wsGuide[cellRef].s = {
        font: { bold: true, color: { rgb: "FFFFFF" } },
        fill: { fgColor: { rgb: "4472C4" } },
      };
    }
  }

  XLSX.utils.book_append_sheet(wb, wsGuide, "Guide");

  // Generate buffer
  const buf = XLSX.write(wb, { type: "buffer", bookType: "xlsx" });

  return new NextResponse(buf, {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": 'attachment; filename="template-jt-emis.xlsx"',
    },
  });
}
