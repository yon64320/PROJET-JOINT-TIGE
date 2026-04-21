"use client";

import { useCallback, useMemo, useRef } from "react";
import dynamic from "next/dynamic";
import type { CellChangeEvent } from "./UniverSheet";
import type { IWorkbookData } from "@univerjs/presets";
import { useSheetSync } from "@/hooks/useSheetSync";
import SaveBar from "./SaveBar";
import {
  ALL_BORDERS,
  getStyleKey as sharedGetStyleKey,
  mergeStyles,
  buildHeaderStyleKey,
} from "./sheet-styles";
import { type JtViewMode } from "@/lib/jt-views";

const UniverSheet = dynamic(() => import("./UniverSheet"), {
  ssr: false,
  loading: () => (
    <div className="flex items-center justify-center h-full text-gray-500">
      Chargement du tableur J&amp;T...
    </div>
  ),
});

/** Type d'une colonne J&T */
export type JtColumn = { header: string; field: string; width: number; readOnly?: boolean };

/** Colonnes visibles dans le tableur J&T (tableau complet — 46 colonnes) */
export const JT_COLUMNS: JtColumn[] = [
  { header: "NOM", field: "nom", width: 140 },
  { header: "ZONE", field: "zone", width: 100 },
  { header: "REP. BUTA", field: "repere_buta", width: 100 },
  { header: "REP. EMIS", field: "repere_emis", width: 100 },
  { header: "DN EMIS", field: "dn_emis", width: 80 },
  { header: "DN BUTA", field: "dn_buta", width: 80 },
  { header: "DELTA DN", field: "delta_dn", width: 80, readOnly: true },
  { header: "DN RET.", field: "_dn_retenu", width: 80, readOnly: true },
  { header: "PN EMIS", field: "pn_emis", width: 80 },
  { header: "PN BUTA", field: "pn_buta", width: 80 },
  { header: "DELTA PN", field: "delta_pn", width: 80, readOnly: true },
  { header: "PN RET.", field: "_pn_retenu", width: 80, readOnly: true },
  { header: "OPÉRATION", field: "operation", width: 140 },
  { header: "NB TIGES EMIS", field: "nb_tiges_emis", width: 110 },
  { header: "NB TIGES BUTA", field: "nb_tiges_buta", width: 110 },
  { header: "NB TIGES RET.", field: "nb_tiges_retenu", width: 110, readOnly: true },
  { header: "MAT. TIGES EMIS", field: "matiere_tiges_emis", width: 120 },
  { header: "MAT. TIGES BUTA", field: "matiere_tiges_buta", width: 120 },
  { header: "MAT. TIGES RET.", field: "matiere_tiges_retenu", width: 120, readOnly: true },
  { header: "DIAM. TIGE", field: "diametre_tige", width: 100 },
  { header: "LONG. TIGE", field: "longueur_tige", width: 100 },
  { header: "DIM. TIGE", field: "_designation_tige", width: 120, readOnly: true },
  { header: "CLE", field: "cle", width: 80 },
  { header: "NB JT PROV", field: "nb_joints_prov", width: 100 },
  { header: "NB JT DEF", field: "nb_joints_def", width: 100 },
  { header: "NB JP EMIS", field: "nb_jp_emis", width: 100 },
  { header: "NB JP BUTA", field: "nb_jp_buta", width: 100, readOnly: true },
  { header: "NB BP EMIS", field: "nb_bp_emis", width: 100 },
  { header: "NB BP BUTA", field: "nb_bp_buta", width: 100, readOnly: true },
  { header: "MAT. EMIS", field: "materiel_emis", width: 120 },
  { header: "MAT. BUTA", field: "materiel_buta", width: 120, readOnly: true },
  { header: "MAT. JT EMIS", field: "matiere_joint_emis", width: 120 },
  { header: "MAT. JT BUTA", field: "matiere_joint_buta", width: 120 },
  { header: "MAT. JT RET.", field: "matiere_joint_retenu", width: 120, readOnly: true },
  { header: "ROB", field: "rob", width: 60 },
  { header: "PAIRE ROB", field: "_rob_pair_display", width: 120 },
  { header: "CÔTÉ ROB", field: "rob_side", width: 90 },
  { header: "FACE BRIDE", field: "face_bride", width: 80 },
  { header: "RONDELLE", field: "rondelle", width: 90 },
  { header: "CALORIFUGE", field: "calorifuge", width: 90 },
  { header: "ÉCHAFAUDAGE", field: "echafaudage", width: 100 },
  { header: "STATUT TERRAIN", field: "field_status", width: 120, readOnly: true },
  { header: "COMMENTAIRES", field: "commentaires", width: 250 },
];

/** Couleurs d'en-tetes forcées par vue (sauf "complete" qui garde les couleurs Excel/défaut) */
const VIEW_HEADER_COLORS: Partial<Record<JtViewMode, string>> = {
  terrain: "#2563EB",
  client: "#EA8C00",
  synthese: "#16A34A",
};

/** Couleurs d'alternance de lignes par vue (groupe d'équipement pair) */
const VIEW_ALT_ROW_COLORS: Partial<Record<JtViewMode, string>> = {
  terrain: "#DBEAFE", // bleu très clair
  client: "#FFF3E0", // orange très clair
  synthese: "#DCFCE7", // vert très clair
};

/** Construit un tableau group parity (0 ou 1) par index de row, basé sur ot_item_id */
function buildEquipmentGroupParity(rows: DbFlange[]): number[] {
  const parities: number[] = [];
  let currentGroup = 0;
  let lastOtItemId: string | undefined;
  for (const row of rows) {
    const otId = row.ot_item_id ?? "";
    if (lastOtItemId !== undefined && otId !== lastOtItemId) {
      currentGroup++;
    }
    lastOtItemId = otId;
    parities.push(currentGroup % 2);
  }
  return parities;
}

interface CellMeta {
  bg?: string;
}

export interface DbFlange {
  id: string;
  ot_item_id?: string;
  ot_items?: { item: string; unite: string };
  rob_pair_id?: string | null;
  rob_side?: string | null;
  cell_metadata?: Record<string, CellMeta>;
  [key: string]: unknown;
}

interface JtSheetProps {
  rows: DbFlange[];
  operationTypes: string[];
  extraColumnHeaders?: string[];
  headerColors?: Record<string, string>;
  viewMode?: JtViewMode;
  visibleColumns?: JtColumn[];
}

/** Calcule retenu côté client pour affichage immédiat */
function computeRetenu(emis: unknown, buta: unknown): unknown {
  return emis ?? buta ?? "";
}

/** Build a map: flangeId → partner repère display string for rob pairs */
function buildPairDisplayMap(rows: DbFlange[]): Map<string, string> {
  const map = new Map<string, string>();
  // Group by rob_pair_id
  const pairGroups = new Map<string, DbFlange[]>();
  for (const row of rows) {
    const pid = row.rob_pair_id;
    if (!pid) continue;
    if (!pairGroups.has(pid)) pairGroups.set(pid, []);
    pairGroups.get(pid)!.push(row);
  }
  // For each pair, each flange shows the other's repère
  for (const [, group] of pairGroups) {
    if (group.length === 2) {
      const [a, b] = group;
      const repA = (a.repere_buta as string) || (a.repere_emis as string) || "?";
      const repB = (b.repere_buta as string) || (b.repere_emis as string) || "?";
      map.set(a.id, repB);
      map.set(b.id, repA);
    } else if (group.length === 1) {
      // Pair incomplete (partner not in current view)
      map.set(group[0].id, "(partenaire hors vue)");
    }
  }
  return map;
}

function buildWorkbookData(
  rows: DbFlange[],
  activeColumns: JtColumn[],
  extraHeaders: string[] = [],
  headerColors: Record<string, string> = {},
  viewMode?: JtViewMode,
): IWorkbookData {
  const baseColCount = activeColumns.length;
  const allColumns = [
    ...activeColumns,
    ...extraHeaders.map((h) => ({ header: h, field: `__extra__${h}`, width: 120 })),
  ];

  // Pair display map for PAIRE ROB column
  const pairDisplayMap = buildPairDisplayMap(rows);

  // Styles dynamiques : base + couleurs de fond Excel dédupliquées
  const dynamicStyles: Record<string, Record<string, unknown>> = {};

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const cellData: Record<number, Record<number, any>> = {};

  // En-têtes avec couleurs par vue ou couleurs Excel importées
  const viewHeaderBg = viewMode ? VIEW_HEADER_COLORS[viewMode] : undefined;
  cellData[0] = {};
  allColumns.forEach((col, i) => {
    const isExtra = i >= baseColCount;
    if (viewHeaderBg && !isExtra) {
      // Vue spécifique : couleur forcée (écrase les couleurs Excel)
      const hdrKey = buildHeaderStyleKey(viewHeaderBg, JT_BASE_STYLES.header, dynamicStyles);
      cellData[0][i] = { v: col.header, s: hdrKey };
    } else {
      const excelColor = headerColors[col.field];
      if (excelColor && !isExtra) {
        const hdrKey = buildHeaderStyleKey(excelColor, JT_BASE_STYLES.header, dynamicStyles);
        cellData[0][i] = { v: col.header, s: hdrKey };
      } else {
        cellData[0][i] = { v: col.header, s: isExtra ? "extraHeader" : "header" };
      }
    }
  });

  // Alternance par groupe d'équipement (change de couleur à chaque changement d'OT)
  const groupParities = buildEquipmentGroupParity(rows);
  const viewAltColor = viewMode ? VIEW_ALT_ROW_COLORS[viewMode] : undefined;

  // Si une couleur de vue est définie, enregistrer le style altRow dynamique
  const viewAltStyleKey = viewAltColor
    ? (() => {
        const key = `viewAlt_${viewAltColor.replace("#", "")}`;
        dynamicStyles[key] = { bg: { rgb: viewAltColor } };
        return key;
      })()
    : "altRow";

  // Données avec lignes alternées par groupe d'équipement
  rows.forEach((row, rowIdx) => {
    cellData[rowIdx + 1] = {};
    const isAltGroup = groupParities[rowIdx] === 1;
    const rowBaseStyle = isAltGroup ? viewAltStyleKey : undefined;
    const meta = row.cell_metadata ?? {};

    allColumns.forEach((col, colIdx) => {
      const isExtra = colIdx >= baseColCount;
      let value: string | number = "";

      if (isExtra) {
        const extraKey = col.header;
        const extras = (row["extra_columns"] as Record<string, unknown>) ?? {};
        value = (extras[extraKey] as string | number) ?? "";
      } else if (col.field === "_item") {
        value = (row.ot_items?.item as string) ?? "";
      } else if (col.field === "_dn_retenu") {
        value = computeRetenu(row.dn_emis, row.dn_buta) as string | number;
      } else if (col.field === "_pn_retenu") {
        value = computeRetenu(row.pn_emis, row.pn_buta) as string | number;
      } else if (col.field === "_designation_tige") {
        const diam = row.diametre_tige as string | null;
        const long = row.longueur_tige as string | null;
        value = diam && long ? `${diam} x ${long}` : "";
      } else if (col.field === "_rob_pair_display") {
        value = pairDisplayMap.get(row.id) ?? "";
      } else if (col.field === "rob_side") {
        value = (row.rob_side as string) ?? "";
      } else if (col.field === "rob" || col.field === "calorifuge" || col.field === "echafaudage") {
        value = row[col.field] ? "OUI" : "";
      } else if (col.field === "field_status") {
        const status = row[col.field] as string;
        value = status === "completed" ? "FAIT" : status === "in_progress" ? "EN COURS" : "";
      } else if (col.field === "delta_dn" || col.field === "delta_pn") {
        value = row[col.field] ? "OUI" : "";
      } else if (col.field === "nb_tiges_retenu") {
        value = computeRetenu(
          row.nb_tiges_emis as string | null,
          row.nb_tiges_buta as string | null,
        ) as string | number;
      } else if (col.field === "matiere_tiges_retenu") {
        value = computeRetenu(
          row.matiere_tiges_emis as string | null,
          row.matiere_tiges_buta as string | null,
        ) as string | number;
      } else if (col.field === "matiere_joint_retenu") {
        value = computeRetenu(
          row.matiere_joint_emis as string | null,
          row.matiere_joint_buta as string | null,
        ) as string | number;
      } else {
        value = (row[col.field] as string | number) ?? "";
      }

      // Priorité style : delta > calo > extra > readonly > altRow
      let baseStyle: string | undefined;
      if (isExtra) {
        baseStyle = "extraCol";
      } else if ((col.field === "delta_dn" || col.field === "delta_pn") && row[col.field]) {
        baseStyle = "delta";
      } else if (col.field === "rob" && row[col.field]) {
        baseStyle = "rob";
      } else if (
        (col.field === "_rob_pair_display" || col.field === "rob_side") &&
        row.rob_pair_id
      ) {
        baseStyle = "robPair";
      } else if ((col.field === "calorifuge" || col.field === "echafaudage") && row[col.field]) {
        baseStyle = "terrain";
      } else if (col.field === "field_status" && value === "FAIT") {
        baseStyle = "terrainDone";
      } else if (col.field === "field_status" && value === "EN COURS") {
        baseStyle = "terrainProgress";
      } else if (value === "CALO") {
        baseStyle = "calo";
      } else if (value === "PAS D'INFO") {
        baseStyle = "pasinfo";
      } else if ("readOnly" in col && col.readOnly) {
        baseStyle = "readonly";
      } else {
        baseStyle = rowBaseStyle;
      }

      const cellMeta = meta[col.field] as CellMeta | undefined;
      // Vue spécifique : ignorer les couleurs Excel (cell_metadata.bg), les garder uniquement en vue complète
      const cellBg = viewMode && viewMode !== "complete" ? undefined : cellMeta?.bg;
      const style =
        sharedGetStyleKey(baseStyle, cellBg, JT_BASE_STYLES, dynamicStyles) ?? baseStyle;

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const cell: any = { v: value };
      if (style) cell.s = style;

      cellData[rowIdx + 1][colIdx] = cell;
    });
  });

  const columnData: Record<number, { w: number }> = {};
  allColumns.forEach((col, i) => {
    columnData[i] = { w: col.width };
  });

  const styles = mergeStyles(JT_BASE_STYLES, dynamicStyles);

  return {
    id: "jt-workbook",
    name: "J&T",
    appVersion: "0.10.2",
    locale: 1,
    styles,
    sheetOrder: ["jt-sheet"],
    sheets: {
      "jt-sheet": {
        id: "jt-sheet",
        name: "J&T",
        rowCount: rows.length + 2,
        columnCount: allColumns.length,
        defaultRowHeight: 24,
        defaultColumnWidth: 100,
        columnData,
        rowData: { 0: { h: 72 } },
        freeze: { startRow: 1, startColumn: 0, ySplit: 1, xSplit: 0 },
        cellData,
      },
    },
  } as unknown as IWorkbookData;
}

/** Styles de base J&T — palette Office/Excel (sans bordures — ajoutées dynamiquement) */
const JT_BASE_STYLES: Record<string, Record<string, unknown>> = {
  header: {
    ff: "Calibri, Inter, system-ui, sans-serif",
    fs: 11,
    bl: 1,
    bg: { rgb: "#70AD47" },
    cl: { rgb: "#FFFFFF" },
    ht: 2,
    vt: 2,
    tb: 3,
  },
  extraHeader: {
    ff: "Calibri, Inter, system-ui, sans-serif",
    fs: 11,
    bl: 1,
    bg: { rgb: "#A5A5A5" },
    cl: { rgb: "#FFFFFF" },
    ht: 2,
    vt: 2,
    tb: 3,
  },
  altRow: {
    bg: { rgb: "#E2EFDA" },
  },
  delta: {
    bg: { rgb: "#FFC7CE" },
    cl: { rgb: "#9C0006" },
    bl: 1,
  },
  calo: {
    bg: { rgb: "#FFEB9C" },
    cl: { rgb: "#9C6500" },
    bl: 1,
  },
  pasinfo: {
    bg: { rgb: "#D9E2F3" },
    cl: { rgb: "#4472C4" },
  },
  readonly: {
    bg: { rgb: "#E2EFDA" },
    cl: { rgb: "#375623" },
  },
  rob: {
    bg: { rgb: "#C2572A" },
    cl: { rgb: "#FFFFFF" },
    bl: 1,
  },
  robPair: {
    bg: { rgb: "#F5E0D8" },
    cl: { rgb: "#C2572A" },
  },
  extraCol: {
    bg: { rgb: "#F2F2F2" },
    cl: { rgb: "#808080" },
  },
  terrain: {
    bg: { rgb: "#FFF3CD" },
    cl: { rgb: "#856404" },
  },
  terrainDone: {
    bg: { rgb: "#D4EDE8" },
    cl: { rgb: "#1F5F54" },
    bl: 1,
  },
  terrainProgress: {
    bg: { rgb: "#F5E6C8" },
    cl: { rgb: "#A87525" },
  },
};

export default function JtSheet({
  rows,
  operationTypes,
  extraColumnHeaders = [],
  headerColors = {},
  viewMode,
  visibleColumns,
}: JtSheetProps) {
  const rowsRef = useRef(rows);
  rowsRef.current = rows;

  const activeColumns = visibleColumns ?? JT_COLUMNS;
  const colToField = useMemo(() => activeColumns.map((c) => c.field), [activeColumns]);
  const readOnlyCols = useMemo(
    () => activeColumns.map((c, i) => (c.readOnly ? i : -1)).filter((i) => i >= 0),
    [activeColumns],
  );
  const isReadOnlyView = viewMode === "client";

  const { pendingCount, saveStatus, trackChange, flushChanges } = useSheetSync({
    apiEndpoint: "/api/flanges",
  });

  const handleCellChange = useCallback(
    (event: CellChangeEvent) => {
      const { row, col, value } = event;
      if (row === 0) return;
      if (isReadOnlyView) return;

      const dataRow = rowsRef.current[row - 1];
      if (!dataRow) return;

      // Extra column?
      if (col >= activeColumns.length) {
        const extraIdx = col - activeColumns.length;
        const extraField = extraColumnHeaders[extraIdx];
        if (!extraField) return;
        const key = `${dataRow.id}-extra-${extraField}`;
        trackChange(key, { id: dataRow.id, extra_field: extraField, value });
        return;
      }

      const field = colToField[col];
      if (!field || readOnlyCols.includes(col)) return;

      // PAIRE ROB: special pairing logic via dedicated API
      if (field === "_rob_pair_display") {
        const repere = String(value).trim();
        if (!repere) {
          // Unpair
          if (dataRow.rob_pair_id) {
            fetch("/api/flanges/pair", {
              method: "DELETE",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ pairId: dataRow.rob_pair_id }),
            }).catch(console.error);
          }
          return;
        }
        // Find partner by repere in same ot_item
        const allRows = rowsRef.current;
        const partner = allRows.find(
          (r) =>
            r.id !== dataRow.id &&
            r.ot_item_id === dataRow.ot_item_id &&
            ((r.repere_buta as string) === repere || (r.repere_emis as string) === repere),
        );
        if (!partner) {
          console.warn(`Bride "${repere}" non trouvée sur le même ITEM`);
          return;
        }
        fetch("/api/flanges/pair", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ flangeIdA: dataRow.id, flangeIdB: partner.id, sideA: "ADM" }),
        }).catch(console.error);
        return;
      }

      // Skip virtual fields
      if (field.startsWith("_")) return;

      // Boolean fields: "OUI" → true, "" → false
      const isBoolField = field === "rob" || field === "calorifuge" || field === "echafaudage";
      const dbValue = isBoolField ? String(value).toUpperCase() === "OUI" : value;

      const key = `${dataRow.id}-${field}`;
      trackChange(key, { id: dataRow.id, field, value: dbValue });
    },
    [extraColumnHeaders, trackChange, activeColumns, colToField, readOnlyCols, isReadOnlyView],
  );

  const handleReady = useCallback(
    (univerAPI: unknown) => {
      const api = univerAPI as {
        getActiveWorkbook: () => {
          getActiveSheet: () => {
            getRange: (
              row: number,
              col: number,
              numRows: number,
              numCols: number,
            ) => {
              setDataValidation: (rule: unknown) => void;
              addConditionalFormattingRule: (rule: unknown) => void;
            };
          };
        };
        newDataValidation: () => {
          requireValueInList: (values: string[]) => {
            setAllowBlank: (allow: boolean) => {
              build: () => unknown;
            };
          };
        };
        newConditionalFormattingRule: () => {
          whenCellNotEmpty: () => {
            setBackground: (color: string) => {
              setFontColor: (color: string) => {
                build: () => unknown;
              };
            };
          };
        };
        addEvent: (
          event: unknown,
          cb: (params: unknown) => boolean | void,
        ) => { dispose: () => void };
        Event: { BeforeSheetEditStart: unknown };
      };

      const sheet = api.getActiveWorkbook().getActiveSheet();
      const rowCount = rows.length;

      // Dynamic column index lookup (based on active view columns)
      const colIdx = (field: string) => activeColumns.findIndex((c) => c.field === field);

      // Dropdown: OPÉRATION
      const opCol = colIdx("operation");
      if (operationTypes.length > 0 && opCol >= 0) {
        const opRule = api
          .newDataValidation()
          .requireValueInList(operationTypes)
          .setAllowBlank(true)
          .build();
        sheet.getRange(1, opCol, rowCount, 1).setDataValidation(opRule);
      }

      // Dropdown: ROB
      const robCol = colIdx("rob");
      if (robCol >= 0) {
        const robRule = api
          .newDataValidation()
          .requireValueInList(["OUI"])
          .setAllowBlank(true)
          .build();
        sheet.getRange(1, robCol, rowCount, 1).setDataValidation(robRule);
      }

      // Dropdown: CALORIFUGE / ÉCHAFAUDAGE
      for (const boolField of ["calorifuge", "echafaudage"] as const) {
        const boolCol = colIdx(boolField);
        if (boolCol >= 0) {
          const boolRule = api
            .newDataValidation()
            .requireValueInList(["OUI"])
            .setAllowBlank(true)
            .build();
          sheet.getRange(1, boolCol, rowCount, 1).setDataValidation(boolRule);
        }
      }

      // Dropdown: CÔTÉ ROB (ADM / REF)
      const sideCol = colIdx("rob_side");
      if (sideCol >= 0) {
        const sideRule = api
          .newDataValidation()
          .requireValueInList(["ADM", "REF"])
          .setAllowBlank(true)
          .build();
        sheet.getRange(1, sideCol, rowCount, 1).setDataValidation(sideRule);
      }

      // Dropdown: FACE BRIDE (RF / RTJ)
      const faceCol = colIdx("face_bride");
      if (faceCol >= 0) {
        const faceRule = api
          .newDataValidation()
          .requireValueInList(["RF", "RTJ"])
          .setAllowBlank(true)
          .build();
        sheet.getRange(1, faceCol, rowCount, 1).setDataValidation(faceRule);
      }

      // Conditional formatting: DELTA rouge
      try {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const cfApi = api as any;
        const deltaRule = cfApi
          .newConditionalFormattingRule()
          .whenCellNotEmpty()
          .setBackground("#FFC7CE")
          .setFontColor("#9C0006")
          .build();
        const deltaDnCol = colIdx("delta_dn");
        if (deltaDnCol >= 0)
          sheet.getRange(1, deltaDnCol, rowCount, 1).addConditionalFormattingRule(deltaRule);
        const deltaPnCol = colIdx("delta_pn");
        if (deltaPnCol >= 0)
          sheet.getRange(1, deltaPnCol, rowCount, 1).addConditionalFormattingRule(deltaRule);
      } catch {
        // Conditional formatting may not be available
      }

      // Block read-only columns + header row (+ entire sheet if read-only view)
      api.addEvent(api.Event.BeforeSheetEditStart, (params: unknown) => {
        const p = params as { row: number; column: number; cancel?: boolean };
        if (isReadOnlyView || p.row === 0 || readOnlyCols.includes(p.column)) {
          p.cancel = true;
        }
      });
    },
    [rows.length, operationTypes, activeColumns, readOnlyCols, isReadOnlyView],
  );

  const workbookData = useMemo(
    () => buildWorkbookData(rows, activeColumns, extraColumnHeaders, headerColors, viewMode),
    [rows, activeColumns, extraColumnHeaders, headerColors, viewMode],
  );

  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
      }}
    >
      <SaveBar pendingCount={pendingCount} saveStatus={saveStatus} onSave={flushChanges} />
      <div style={{ flex: 1, minHeight: 0 }}>
        <UniverSheet
          workbookData={workbookData}
          onCellChange={handleCellChange}
          onReady={handleReady}
        />
      </div>
    </div>
  );
}
