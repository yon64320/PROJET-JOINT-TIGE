import { FIELD_MAP, type FicheRobTemplate } from "@/lib/domain/fiche-rob-fields";
import type { RobFlangeRow, ValvePair } from "@/types/rob";
import { groupIntoValves, getValveLabel } from "@/lib/domain/valve-pairs";

// ── Design tokens ──

const BLUE_DARK = "#1a2744";
const BLUE_MID = "#2d4a6f";
const RED_HEADER = "#c92a2a";
const RED_MID = "#d44040";
const GRAY_ALT = "#f8fafc";
const BORDER = "#e2e8f0";
const BEIGE_BG = "#f5f0e0";
const BEIGE_DARK = "#ebe0c8";

// ── Page constants (mm) ──

const PAGE_W = 210;
const PAGE_H = 297;
const HEADER_H = 10;

// ── Data helpers ──

function retenu(emis: unknown, buta: unknown): string {
  const v = emis ?? buta;
  return v == null ? "" : String(v);
}

function getNumeroClient(row: RobFlangeRow): string {
  const nom = row.nom ?? "";
  const rep = row.repere_buta || row.repere_emis || "";
  return rep ? `${nom}-${rep}` : nom;
}

function getFieldValue(key: string, row: RobFlangeRow): string {
  switch (key) {
    case "numero_client":
      return getNumeroClient(row);
    case "type":
      return row.type ?? row.ot_items?.famille_item ?? "";
    case "zone":
      return row.zone ?? row.ot_items?.unite ?? "";
    case "gamme":
      return row.ot_items?.type_travaux ?? "";
    case "rondelles":
      return (row.rondelle_retenu as string | null) ?? "";
    case "responsable":
      return row.responsable ?? "";
    case "travaux":
      return row.ot_items?.type_travaux ?? "";
    default:
      return "";
  }
}

const BRIDE_LABELS = [
  "DIAM",
  "SERIE",
  "Type joint",
  "Matière joint",
  "Nbr tiges",
  "Boulonnerie",
  "Matière tiges",
];

function getBrideValues(row: RobFlangeRow): string[] {
  return [
    retenu(row.dn_emis, row.dn_buta),
    retenu(row.pn_emis, row.pn_buta),
    retenu(row.matiere_joint_emis, row.matiere_joint_buta),
    retenu(row.matiere_joint_emis, row.matiere_joint_buta),
    retenu(row.nb_tiges_emis, row.nb_tiges_buta),
    "",
    retenu(row.matiere_tiges_emis, row.matiere_tiges_buta),
  ];
}

// ── HTML block renderers ──

function esc(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function dataRowHtml(label: string, value: string, idx: number): string {
  const bg = idx % 2 === 1 ? `background:${GRAY_ALT};` : "";
  return `<div style="display:flex;align-items:center;border-bottom:0.5px solid ${BORDER};min-height:4.5mm;${bg}">
    <div style="width:50%;padding:0.7mm 1.5mm;font-weight:600;font-size:9pt;color:#1e293b;">${esc(label)}</div>
    <div style="width:50%;padding:0.7mm 1.5mm;font-size:9pt;color:#1e293b;">${esc(value || "---")}</div>
  </div>`;
}

function sectionHeaderHtml(text: string, gradFrom: string, gradTo: string): string {
  return `<div style="padding:1.3mm 2mm;font-weight:bold;font-size:10pt;color:white;text-align:center;letter-spacing:1px;text-transform:uppercase;background:linear-gradient(135deg,${gradFrom} 0%,${gradTo} 100%);">${esc(text)}</div>`;
}

function renderBandeauHtml(summary: string): string {
  return `<div style="display:flex;align-items:center;justify-content:center;padding:2mm 4mm;text-align:center;font-weight:bold;font-size:10.5pt;letter-spacing:0.5px;color:${BLUE_DARK};background:linear-gradient(135deg,${BEIGE_BG} 0%,${BEIGE_DARK} 100%);border:0.5px solid ${BEIGE_DARK};border-radius:1mm;">
    ${esc(summary)}
  </div>`;
}

function renderCaracTravauxHtml(row: RobFlangeRow, template: FicheRobTemplate): string {
  const caracRows = template.caracteristiques
    .map((key, i) => {
      const field = FIELD_MAP.get(key);
      return dataRowHtml(field?.label ?? key, getFieldValue(key, row), i);
    })
    .join("");

  const travRows = template.travaux
    .map((key, i) => {
      const field = FIELD_MAP.get(key);
      return dataRowHtml(field?.label ?? key, getFieldValue(key, row), i);
    })
    .join("");

  return `<div style="display:flex;border:0.5px solid ${BORDER};border-radius:1mm;overflow:hidden;">
    <div style="flex:1;min-width:0;border-right:0.5px solid ${BORDER};">
      ${sectionHeaderHtml("CARACTERISTIQUES", BLUE_DARK, BLUE_MID)}
      ${caracRows}
    </div>
    <div style="flex:1;min-width:0;">
      ${sectionHeaderHtml("TRAVAUX", BLUE_DARK, BLUE_MID)}
      ${travRows}
    </div>
  </div>`;
}

function renderBrideHtml(title: string, row: RobFlangeRow | null): string {
  const values = row ? getBrideValues(row) : BRIDE_LABELS.map(() => "---");
  const rows = BRIDE_LABELS.map((label, i) => dataRowHtml(label, values[i], i)).join("");
  return `<div style="height:100%;border:0.5px solid ${BORDER};border-radius:1mm;overflow:hidden;display:flex;flex-direction:column;">
    ${sectionHeaderHtml(title, RED_HEADER, RED_MID)}
    <div style="flex:1;">${rows}</div>
  </div>`;
}

function renderPhotoHtml(): string {
  return `<div style="height:100%;display:flex;align-items:center;justify-content:center;border:0.5px dashed ${BORDER};border-radius:1mm;background:linear-gradient(180deg,#fafafa 0%,#f1f5f9 100%);color:#94a3b8;font-size:8pt;">
    Photo
  </div>`;
}

function renderImplantationHtml(): string {
  return `<div style="height:100%;display:flex;flex-direction:column;border:0.5px solid ${BORDER};border-radius:1mm;overflow:hidden;">
    <div style="padding:0.5mm 2mm;font-weight:bold;font-style:italic;font-size:9pt;color:white;background:linear-gradient(135deg,${BLUE_DARK} 0%,${BLUE_MID} 100%);letter-spacing:0.5px;">Implantation</div>
    <div style="flex:1;display:flex;align-items:center;justify-content:center;background:linear-gradient(180deg,#fafafa 0%,#f1f5f9 100%);color:#94a3b8;font-size:8pt;">Implantation</div>
  </div>`;
}

function renderPidHtml(numClient: string): string {
  return `<div style="height:100%;display:flex;flex-direction:column;border:0.5px solid ${BORDER};border-radius:1mm;overflow:hidden;">
    <div style="background:linear-gradient(135deg,${BLUE_DARK} 0%,${BLUE_MID} 100%);padding:2mm 4mm;text-align:center;font-weight:bold;font-size:10.5pt;color:white;letter-spacing:1.5px;text-transform:uppercase;">PID — ${esc(numClient)}</div>
    <div style="flex:1;display:flex;align-items:center;justify-content:center;color:#94a3b8;font-size:13pt;">PID</div>
  </div>`;
}

// ── Header ──

function headerHtml(projectName: string): string {
  return `<div style="display:flex;justify-content:space-between;align-items:center;padding:2mm 4mm;border-bottom:2px solid ${BLUE_DARK};height:${HEADER_H}mm;box-sizing:border-box;">
    <div style="font-weight:900;font-style:italic;color:${RED_HEADER};font-size:13pt;letter-spacing:1px;">EMIS</div>
    <div style="font-weight:bold;font-size:12pt;color:${BLUE_DARK};letter-spacing:1px;text-transform:uppercase;">FICHE INTERVENTION ROB</div>
    <div style="font-weight:600;font-size:10pt;color:${BLUE_DARK};">${esc(projectName)}</div>
  </div>`;
}

// ── Fixed CSS Grid pages ──

function buildPage1Html(
  admRow: RobFlangeRow | null,
  refRow: RobFlangeRow | null,
  template: FicheRobTemplate,
  projectName: string,
  summary: string,
  isFirst: boolean,
): string {
  const pageBreak = isFirst ? "" : "page-break-before:always;";
  // Use ADM row for characteristics/travaux, fallback to REF
  const caracRow = admRow ?? refRow;

  return `<div class="a4-page" style="${pageBreak}width:${PAGE_W}mm;height:${PAGE_H}mm;background:white;font-family:Helvetica,Arial,sans-serif;font-size:9pt;line-height:1.3;display:flex;flex-direction:column;">
    ${headerHtml(projectName)}
    <div style="flex:1;display:grid;grid-template-columns:1fr 2fr;grid-template-rows:auto auto 2.5fr 2.5fr 3.8fr;min-height:0;">
      <div style="grid-column:1/3;">${renderBandeauHtml(summary)}</div>
      <div style="grid-column:1/3;">${caracRow ? renderCaracTravauxHtml(caracRow, template) : ""}</div>
      <div style="grid-column:1/2;">${renderBrideHtml("ENTREE / ADMISSION", admRow)}</div>
      <div style="grid-column:2/3;grid-row:3/5;">${renderPhotoHtml()}</div>
      <div style="grid-column:1/2;">${renderBrideHtml("SORTIE / REFOULEMENT", refRow)}</div>
      <div style="grid-column:1/3;">${renderImplantationHtml()}</div>
    </div>
  </div>`;
}

function buildPage2Html(row: RobFlangeRow, projectName: string, numClient: string): string {
  return `<div class="a4-page" style="page-break-before:always;width:${PAGE_W}mm;height:${PAGE_H}mm;background:white;font-family:Helvetica,Arial,sans-serif;font-size:9pt;line-height:1.3;display:flex;flex-direction:column;">
    ${headerHtml(projectName)}
    <div style="flex:1;min-height:0;">${renderPidHtml(numClient)}</div>
  </div>`;
}

// ── Main export ──

export function buildFichesHtml(
  rows: RobFlangeRow[],
  template: FicheRobTemplate,
  projectName: string,
): string {
  const valves = groupIntoValves(rows);
  let isFirst = true;
  const pagesHtml: string[] = [];

  for (const valve of valves) {
    const admRow = valve.admission;
    const refRow = valve.refoulement;
    const primaryRow = admRow ?? refRow;
    if (!primaryRow) continue;

    const numClient = getValveLabel(valve);
    const summary = `${numClient} — ${primaryRow.ot_items?.type_travaux ?? ""} — ${primaryRow.operation ?? ""}`;

    pagesHtml.push(buildPage1Html(admRow, refRow, template, projectName, summary, isFirst));
    pagesHtml.push(buildPage2Html(primaryRow, projectName, numClient));
    isFirst = false;
  }

  return `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<style>
  @page { size: A4; margin: 0; }
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { margin: 0; padding: 0; }
</style>
</head>
<body>
${pagesHtml.join("\n")}
</body>
</html>`;
}
