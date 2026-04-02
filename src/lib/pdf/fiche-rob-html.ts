import { FIELD_MAP, type FicheRobTemplate, type BlockLayout } from "@/lib/domain/fiche-rob-fields";
import type { RobFlangeRow } from "@/types/rob";

// ── Design tokens ──

const BLUE_DARK = "#1a2744";
const RED_HEADER = "#c92a2a";
const GRAY_ALT = "#f4f5f7";
const BORDER = "#d1d5db";
const BEIGE_BG = "#f5f0e0";

// ── Grid constants (mm) ──

const PAGE_W = 210; // A4 width mm
const PAGE_H = 297; // A4 height mm
const HEADER_H = 8; // Header bar height mm
const CONTENT_H = PAGE_H - HEADER_H;
const GRID_COLS = 12;
const COL_W = PAGE_W / GRID_COLS; // 17.5mm

// ── Block types ──

type BlockId =
  | "bandeau"
  | "carac-travaux"
  | "admission"
  | "refoulement"
  | "photo"
  | "implantation"
  | "pid";

const ALL_BLOCKS: BlockId[] = [
  "bandeau",
  "carac-travaux",
  "admission",
  "refoulement",
  "photo",
  "implantation",
  "pid",
];

const DEFAULT_POS: Record<BlockId, { x: number; y: number; w: number; h: number; page: 1 | 2 }> = {
  bandeau: { x: 0, y: 0, w: 12, h: 2, page: 1 },
  "carac-travaux": { x: 0, y: 2, w: 12, h: 15, page: 1 },
  admission: { x: 0, y: 17, w: 5, h: 10, page: 1 },
  refoulement: { x: 5, y: 17, w: 5, h: 10, page: 1 },
  photo: { x: 10, y: 17, w: 2, h: 10, page: 1 },
  implantation: { x: 0, y: 27, w: 12, h: 8, page: 1 },
  pid: { x: 0, y: 0, w: 12, h: 30, page: 2 },
};

interface ResolvedPos {
  x: number;
  y: number;
  w: number;
  h: number;
  page: 1 | 2;
}

function resolvePos(id: BlockId, layouts?: Record<string, BlockLayout>): ResolvedPos {
  const saved = layouts?.[id];
  const def = DEFAULT_POS[id];
  return {
    x: saved?.x ?? def.x,
    y: saved?.y ?? def.y,
    w: saved?.w ?? def.w,
    h: saved?.h ?? def.h,
    page: saved?.page ?? def.page,
  };
}

function computeRowH(blocks: { pos: ResolvedPos }[]): number {
  let maxY = 1;
  for (const { pos } of blocks) {
    maxY = Math.max(maxY, pos.y + pos.h);
  }
  return CONTENT_H / maxY;
}

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
    case "eqpt_proximite":
      return "";
    case "type":
      return row.type ?? row.ot_items?.famille_item ?? "";
    case "zone":
      return row.zone ?? row.ot_items?.unite ?? "";
    case "hauteur":
      return "";
    case "encombrement":
      return "";
    case "circuit_primaire":
      return "";
    case "gamme":
      return row.ot_items?.type_travaux ?? "";
    case "cmr":
      return "";
    case "amiante_plomb":
      return "";
    case "poids":
      return "";
    case "rondelles":
      return row.rondelle ?? "";
    case "responsable":
      return row.responsable ?? "";
    case "travaux":
      return row.ot_items?.type_travaux ?? "";
    case "transport":
      return "";
    case "obturation_adm":
      return "";
    case "obturation_ref":
      return "";
    case "joint_lunette":
      return "";
    case "echaf":
      return "";
    case "calo_frigo":
      return "";
    case "tracage":
      return "";
    case "levage":
      return "";
    case "potence":
      return "";
    case "support_ligne":
      return "";
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
  return `<div style="display:flex;align-items:center;border-bottom:0.5px solid ${BORDER};min-height:3mm;${bg}">
    <div style="width:50%;padding:0.4mm 1mm;font-weight:bold;font-size:6pt;">${esc(label)}</div>
    <div style="width:50%;padding:0.4mm 1mm;font-size:6pt;color:#64748b;">${esc(value || "---")}</div>
  </div>`;
}

function sectionHeaderHtml(text: string, bg: string): string {
  return `<div style="padding:0.8mm 1.5mm;font-weight:bold;font-size:6.5pt;color:white;text-align:center;letter-spacing:0.8px;background:${bg};">${esc(text)}</div>`;
}

function renderBandeauHtml(summary: string): string {
  return `<div style="height:100%;display:flex;align-items:center;justify-content:center;padding:1mm 3mm;text-align:center;font-weight:bold;font-size:7pt;letter-spacing:0.5px;background:${BEIGE_BG};border:0.5px solid ${BORDER};">
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

  return `<div style="height:100%;display:flex;border:0.5px solid ${BORDER};overflow:hidden;">
    <div style="flex:1;display:flex;flex-direction:column;min-width:0;border-right:0.5px solid ${BORDER};">
      ${sectionHeaderHtml("CARACTERISTIQUES", BLUE_DARK)}
      <div style="flex:1;overflow:hidden;">${caracRows}</div>
    </div>
    <div style="flex:1;display:flex;flex-direction:column;min-width:0;">
      ${sectionHeaderHtml("TRAVAUX", BLUE_DARK)}
      <div style="flex:1;overflow:hidden;">${travRows}</div>
    </div>
  </div>`;
}

function renderBrideHtml(title: string, row: RobFlangeRow): string {
  const values = getBrideValues(row);
  const rows = BRIDE_LABELS.map((label, i) => dataRowHtml(label, values[i], i)).join("");
  return `<div style="height:100%;display:flex;flex-direction:column;border:0.5px solid ${BORDER};">
    ${sectionHeaderHtml(title, RED_HEADER)}
    ${rows}
  </div>`;
}

function renderPhotoHtml(): string {
  return `<div style="height:100%;display:flex;align-items:center;justify-content:center;border:0.5px dashed ${BORDER};background:#fafafa;color:#cbd5e1;font-size:6pt;">
    Photo
  </div>`;
}

function renderImplantationHtml(): string {
  return `<div style="height:100%;display:flex;flex-direction:column;border:0.5px solid ${BORDER};">
    <div style="padding:0.8mm 1.5mm;font-weight:bold;font-style:italic;font-size:7pt;color:${BLUE_DARK};border-bottom:0.5px solid ${BORDER};">Implantation</div>
    <div style="flex:1;display:flex;align-items:center;justify-content:center;background:#fafafa;color:#cbd5e1;font-size:6pt;">Implantation</div>
  </div>`;
}

function renderPidHtml(numClient: string): string {
  return `<div style="height:100%;display:flex;flex-direction:column;border:0.5px solid ${BORDER};">
    <div style="background:${BLUE_DARK};padding:1.5mm 3mm;text-align:center;font-weight:bold;font-size:8pt;color:white;letter-spacing:1px;">PID — ${esc(numClient)}</div>
    <div style="flex:1;display:flex;align-items:center;justify-content:center;color:#cbd5e1;font-size:10pt;">PID</div>
  </div>`;
}

function renderBlockHtml(
  id: BlockId,
  row: RobFlangeRow,
  template: FicheRobTemplate,
  numClient: string,
  summary: string,
): string {
  switch (id) {
    case "bandeau":
      return renderBandeauHtml(summary);
    case "carac-travaux":
      return renderCaracTravauxHtml(row, template);
    case "admission":
      return renderBrideHtml("ENTREE / ADMISSION", row);
    case "refoulement":
      return renderBrideHtml("SORTIE / REFOULEMENT", row);
    case "photo":
      return renderPhotoHtml();
    case "implantation":
      return renderImplantationHtml();
    case "pid":
      return renderPidHtml(numClient);
  }
}

// ── Header ──

function headerHtml(projectName: string): string {
  return `<div style="display:flex;justify-content:space-between;align-items:center;padding:1.5mm 3mm;border-bottom:0.5px solid ${BORDER};height:${HEADER_H}mm;box-sizing:border-box;">
    <div style="font-weight:bold;font-style:italic;color:#dc2626;font-size:9pt;letter-spacing:1px;">EMIS</div>
    <div style="font-weight:bold;font-size:8pt;color:${BLUE_DARK};text-decoration:underline;letter-spacing:0.5px;">FICHE INTERVENTION ROB</div>
    <div style="font-weight:bold;font-size:7pt;color:#1d4ed8;">${esc(projectName)}</div>
  </div>`;
}

// ── Page builder ──

function buildPageHtml(
  pageBlocks: { id: BlockId; pos: ResolvedPos }[],
  row: RobFlangeRow,
  template: FicheRobTemplate,
  projectName: string,
  numClient: string,
  summary: string,
  isFirst: boolean,
): string {
  const rowH = computeRowH(pageBlocks);

  const blocksHtml = pageBlocks
    .map(({ id, pos }) => {
      const left = pos.x * COL_W;
      const top = pos.y * rowH;
      const width = pos.w * COL_W;
      const height = pos.h * rowH;
      return `<div style="position:absolute;left:${left}mm;top:${top}mm;width:${width}mm;height:${height}mm;overflow:hidden;">
      ${renderBlockHtml(id, row, template, numClient, summary)}
    </div>`;
    })
    .join("\n");

  const pageBreak = isFirst ? "" : "page-break-before:always;";

  return `<div class="a4-page" style="${pageBreak}width:${PAGE_W}mm;height:${PAGE_H}mm;position:relative;background:white;font-family:Helvetica,Arial,sans-serif;font-size:7pt;line-height:1.2;">
    ${headerHtml(projectName)}
    <div style="position:relative;height:${CONTENT_H}mm;">
      ${blocksHtml}
    </div>
  </div>`;
}

// ── Main export ──

export function buildFichesHtml(
  rows: RobFlangeRow[],
  template: FicheRobTemplate,
  projectName: string,
): string {
  const layouts = template.blockLayouts;

  // Resolve positions
  const positions: Record<BlockId, ResolvedPos> = {} as Record<BlockId, ResolvedPos>;
  for (const id of ALL_BLOCKS) {
    positions[id] = resolvePos(id, layouts);
  }

  // Group blocks by page
  const page1Blocks = ALL_BLOCKS.filter((id) => positions[id].page === 1).map((id) => ({
    id,
    pos: positions[id],
  }));
  const page2Blocks = ALL_BLOCKS.filter((id) => positions[id].page === 2).map((id) => ({
    id,
    pos: positions[id],
  }));
  const pages = [page1Blocks, page2Blocks].filter((p) => p.length > 0);

  let isFirst = true;
  const pagesHtml: string[] = [];

  for (const row of rows) {
    const numClient = getNumeroClient(row);
    const summary = `${numClient} — ${row.ot_items?.type_travaux ?? ""} — ${row.operation ?? ""}`;

    for (const pageBlocks of pages) {
      pagesHtml.push(
        buildPageHtml(pageBlocks, row, template, projectName, numClient, summary, isFirst),
      );
      isFirst = false;
    }
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
