"use client";

import { useCallback, useRef, useState } from "react";
import dynamic from "next/dynamic";
import type { CellChangeEvent } from "./UniverSheet";
import type { IWorkbookData } from "@univerjs/presets";

const UniverSheet = dynamic(() => import("./UniverSheet"), {
  ssr: false,
  loading: () => (
    <div className="flex items-center justify-center h-full text-gray-500">
      Chargement du tableur J&amp;T...
    </div>
  ),
});

/** Colonnes visibles dans le tableur J&T */
const JT_COLUMNS = [
  { header: "NOM", field: "nom", width: 140 },
  { header: "ZONE", field: "zone", width: 100 },
  { header: "ITEM", field: "_item", width: 120, readOnly: true },
  { header: "REP. BUTA", field: "repere_buta", width: 100 },
  { header: "REP. EMIS", field: "repere_emis", width: 100 },
  { header: "DN EMIS", field: "dn_emis", width: 80 },
  { header: "DN BUTA", field: "dn_buta", width: 80 },
  { header: "DELTA DN", field: "delta_dn", width: 80, readOnly: true },
  { header: "PN EMIS", field: "pn_emis", width: 80 },
  { header: "PN BUTA", field: "pn_buta", width: 80 },
  { header: "DELTA PN", field: "delta_pn", width: 80, readOnly: true },
  { header: "OPÉRATION", field: "operation", width: 140 },
  { header: "NB TIGES EMIS", field: "nb_tiges_emis", width: 110 },
  { header: "NB TIGES BUTA", field: "nb_tiges_buta", width: 110 },
  { header: "NB TIGES RET.", field: "nb_tiges_retenu", width: 110, readOnly: true },
  { header: "MAT. TIGES EMIS", field: "matiere_tiges_emis", width: 120 },
  { header: "MAT. TIGES BUTA", field: "matiere_tiges_buta", width: 120 },
  { header: "MAT. TIGES RET.", field: "matiere_tiges_retenu", width: 120, readOnly: true },
  { header: "NB JT PROV", field: "nb_joints_prov", width: 100 },
  { header: "NB JT DEF", field: "nb_joints_def", width: 100 },
  { header: "MAT. JT EMIS", field: "matiere_joint_emis", width: 120 },
  { header: "MAT. JT BUTA", field: "matiere_joint_buta", width: 120 },
  { header: "MAT. JT RET.", field: "matiere_joint_retenu", width: 120, readOnly: true },
  { header: "ROB", field: "rob", width: 60 },
  { header: "COMMENTAIRES", field: "commentaires", width: 250 },
] as const;

const COL_TO_FIELD = JT_COLUMNS.map((c) => c.field);
const READ_ONLY_COLS = JT_COLUMNS
  .map((c, i) => ("readOnly" in c && c.readOnly ? i : -1))
  .filter((i) => i >= 0);

/** Bordures fines appliquées à toutes les cellules (gris Excel) */
const THIN_BORDER = { s: 1, cl: { rgb: "#B4B4B4" } };
const ALL_BORDERS = { t: THIN_BORDER, r: THIN_BORDER, b: THIN_BORDER, l: THIN_BORDER };

interface CellMeta {
  bg?: string;
}

interface DbFlange {
  id: string;
  ot_items?: { item: string; unite: string };
  cell_metadata?: Record<string, CellMeta>;
  [key: string]: unknown;
}

interface JtSheetProps {
  rows: DbFlange[];
  operationTypes: string[];
  extraColumnHeaders?: string[];
  headerColors?: Record<string, string>;
}

/** Calcule retenu côté client pour affichage immédiat */
function computeRetenu(emis: unknown, buta: unknown): unknown {
  return emis ?? buta ?? "";
}

function buildWorkbookData(rows: DbFlange[], extraHeaders: string[] = [], headerColors: Record<string, string> = {}): IWorkbookData {
  const allColumns = [
    ...JT_COLUMNS,
    ...extraHeaders.map((h) => ({ header: h, field: `__extra__${h}`, width: 120 })),
  ];

  // Styles dynamiques : base + couleurs de fond Excel dédupliquées
  const dynamicStyles: Record<string, Record<string, unknown>> = {};

  function getStyleKey(baseStyle: string | undefined, bgColor: string | undefined): string | undefined {
    if (!bgColor) return baseStyle;
    const key = `${baseStyle ?? "default"}_${bgColor}`;
    if (!dynamicStyles[key]) {
      const baseObj = baseStyle ? { ...(JT_BASE_STYLES[baseStyle] ?? {}) } : {};
      dynamicStyles[key] = { ...baseObj, bg: { rgb: bgColor }, bd: ALL_BORDERS };
    }
    return key;
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const cellData: Record<number, Record<number, any>> = {};

  // En-têtes avec couleurs Excel importées
  cellData[0] = {};
  allColumns.forEach((col, i) => {
    const isExtra = i >= JT_COLUMNS.length;
    const excelColor = headerColors[col.field];
    if (excelColor && !isExtra) {
      const hdrKey = `hdr_${excelColor}`;
      if (!dynamicStyles[hdrKey]) {
        dynamicStyles[hdrKey] = {
          ...JT_BASE_STYLES.header,
          bg: { rgb: excelColor },
          bd: ALL_BORDERS,
        };
      }
      cellData[0][i] = { v: col.header, s: hdrKey };
    } else {
      cellData[0][i] = { v: col.header, s: isExtra ? "extraHeader" : "header" };
    }
  });

  // Données avec lignes alternées
  rows.forEach((row, rowIdx) => {
    cellData[rowIdx + 1] = {};
    const rowBaseStyle = rowIdx % 2 === 1 ? "altRow" : undefined;
    const meta = row.cell_metadata ?? {};

    allColumns.forEach((col, colIdx) => {
      const isExtra = colIdx >= JT_COLUMNS.length;
      let value: string | number = "";

      if (isExtra) {
        const extraKey = col.header;
        const extras = (row["extra_columns"] as Record<string, unknown>) ?? {};
        value = (extras[extraKey] as string | number) ?? "";
      } else if (col.field === "_item") {
        value = (row.ot_items?.item as string) ?? "";
      } else if (col.field === "rob") {
        value = row[col.field] ? "OUI" : "";
      } else if (col.field === "delta_dn" || col.field === "delta_pn") {
        value = row[col.field] ? "OUI" : "";
      } else if (col.field === "nb_tiges_retenu") {
        value = computeRetenu(row.nb_tiges_emis as string | null, row.nb_tiges_buta as string | null) as string | number;
      } else if (col.field === "matiere_tiges_retenu") {
        value = computeRetenu(row.matiere_tiges_emis as string | null, row.matiere_tiges_buta as string | null) as string | number;
      } else if (col.field === "matiere_joint_retenu") {
        value = computeRetenu(row.matiere_joint_emis as string | null, row.matiere_joint_buta as string | null) as string | number;
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
      const style = getStyleKey(baseStyle, cellMeta?.bg) ?? baseStyle;

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

  // Merge base styles (with borders) + dynamic styles
  const styles: Record<string, Record<string, unknown>> = {};
  for (const [key, val] of Object.entries(JT_BASE_STYLES)) {
    styles[key] = { ...val, bd: ALL_BORDERS };
  }
  for (const [key, val] of Object.entries(dynamicStyles)) {
    styles[key] = val;
  }

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
  extraCol: {
    bg: { rgb: "#F2F2F2" },
    cl: { rgb: "#808080" },
  },
};

export default function JtSheet({ rows, operationTypes, extraColumnHeaders = [], headerColors = {} }: JtSheetProps) {
  const rowsRef = useRef(rows);
  rowsRef.current = rows;

  const pendingChanges = useRef(new Map<string, Record<string, unknown>>());
  const [pendingCount, setPendingCount] = useState(0);
  const [saveStatus, setSaveStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");

  const flushChanges = useCallback(async () => {
    const changes = Array.from(pendingChanges.current.values());
    if (changes.length === 0) return;
    pendingChanges.current.clear();
    setPendingCount(0);
    setSaveStatus("saving");
    try {
      for (const change of changes) {
        const res = await fetch("/api/flanges", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(change),
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
      }
      setSaveStatus("saved");
      setTimeout(() => setSaveStatus("idle"), 2000);
    } catch {
      setSaveStatus("error");
    }
  }, []);

  const handleCellChange = useCallback(
    (event: CellChangeEvent) => {
      const { row, col, value } = event;
      if (row === 0) return;

      const dataRow = rowsRef.current[row - 1];
      if (!dataRow) return;

      // Extra column?
      if (col >= JT_COLUMNS.length) {
        const extraIdx = col - JT_COLUMNS.length;
        const extraField = extraColumnHeaders[extraIdx];
        if (!extraField) return;
        const key = `${dataRow.id}-extra-${extraField}`;
        pendingChanges.current.set(key, { id: dataRow.id, extra_field: extraField, value });
        setPendingCount(pendingChanges.current.size);
        return;
      }

      const field = COL_TO_FIELD[col];
      if (!field || field.startsWith("_") || READ_ONLY_COLS.includes(col)) return;

      // ROB: "OUI" → true, "" → false
      const dbValue = field === "rob"
        ? String(value).toUpperCase() === "OUI"
        : value;

      const key = `${dataRow.id}-${field}`;
      pendingChanges.current.set(key, { id: dataRow.id, field, value: dbValue });
      setPendingCount(pendingChanges.current.size);
    },
    [extraColumnHeaders]
  );

  const handleReady = useCallback(
    (univerAPI: unknown) => {
      const api = univerAPI as {
        getActiveWorkbook: () => {
          getActiveSheet: () => {
            getRange: (row: number, col: number, numRows: number, numCols: number) => {
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
        addEvent: (event: unknown, cb: (params: unknown) => boolean | void) => { dispose: () => void };
        Event: { BeforeSheetEditStart: unknown };
      };

      const sheet = api.getActiveWorkbook().getActiveSheet();
      const rowCount = rows.length;

      // Dropdown: OPÉRATION (col 11)
      if (operationTypes.length > 0) {
        const opRule = api
          .newDataValidation()
          .requireValueInList(operationTypes)
          .setAllowBlank(true)
          .build();
        sheet.getRange(1, 11, rowCount, 1).setDataValidation(opRule);
      }

      // Dropdown: ROB (col 23)
      const robRule = api
        .newDataValidation()
        .requireValueInList(["OUI"])
        .setAllowBlank(true)
        .build();
      sheet.getRange(1, 23, rowCount, 1).setDataValidation(robRule);

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
        // DELTA DN (col 7)
        sheet.getRange(1, 7, rowCount, 1).addConditionalFormattingRule(deltaRule);
        // DELTA PN (col 10)
        sheet.getRange(1, 10, rowCount, 1).addConditionalFormattingRule(deltaRule);
      } catch {
        // Conditional formatting may not be available
      }

      // Block read-only columns + header row
      api.addEvent(api.Event.BeforeSheetEditStart, (params: unknown) => {
        const p = params as { row: number; column: number; cancel?: boolean };
        if (p.row === 0 || READ_ONLY_COLS.includes(p.column)) {
          p.cancel = true;
        }
      });
    },
    [rows.length, operationTypes]
  );

  const workbookData = buildWorkbookData(rows, extraColumnHeaders, headerColors);

  return (
    <div style={{ width: "100%", height: "calc(100vh - 120px)", display: "flex", flexDirection: "column" }}>
      <div style={{ display: "flex", justifyContent: "flex-end", alignItems: "center", padding: "6px 12px", gap: "8px", borderBottom: "1px solid #e5e7eb" }}>
        {saveStatus === "saved" && (
          <span style={{ color: "#16a34a", fontSize: 13, fontWeight: 500 }}>Sauvegardé ✓</span>
        )}
        {saveStatus === "error" && (
          <span style={{ color: "#dc2626", fontSize: 13, fontWeight: 500 }}>Erreur</span>
        )}
        <button
          onClick={flushChanges}
          disabled={pendingCount === 0 || saveStatus === "saving"}
          style={{
            padding: "6px 16px",
            fontSize: 13,
            fontWeight: 600,
            borderRadius: 6,
            border: "none",
            cursor: pendingCount === 0 || saveStatus === "saving" ? "default" : "pointer",
            backgroundColor: pendingCount === 0 || saveStatus === "saving" ? "#d1d5db" : "#1E3A5F",
            color: pendingCount === 0 || saveStatus === "saving" ? "#9ca3af" : "#fff",
          }}
        >
          {saveStatus === "saving" ? "Sauvegarde..." : `Sauvegarder${pendingCount > 0 ? ` (${pendingCount})` : ""}`}
        </button>
      </div>
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
