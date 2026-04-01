"use client";

import { useCallback, useRef, useState } from "react";
import dynamic from "next/dynamic";
import type { CellChangeEvent } from "./UniverSheet";
import type { IWorkbookData } from "@univerjs/presets";

const UniverSheet = dynamic(() => import("./UniverSheet"), {
  ssr: false,
  loading: () => (
    <div className="flex items-center justify-center h-full text-gray-500">
      Chargement du tableur LUT...
    </div>
  ),
});

/** Colonnes visibles dans le tableur LUT */
const LUT_COLUMNS = [
  { header: "UNITE", field: "unite", width: 110 },
  { header: "ITEM", field: "item", width: 120 },
  { header: "OT", field: "ot", width: 80 },
  { header: "LOT", field: "lot", width: 70 },
  { header: "TITRE GAMME", field: "titre_gamme", width: 350 },
  { header: "FAMILLE", field: "famille_item", width: 120 },
  { header: "TYPE", field: "type_item", width: 110 },
  { header: "TYPE TRAVAUX", field: "type_travaux", width: 110 },
  { header: "STATUT", field: "statut", width: 80 },
  { header: "COMMENTAIRES", field: "commentaires", width: 250 },
  { header: "ÉCHAF", field: "corps_metier_echaf", width: 60 },
  { header: "CALO", field: "corps_metier_calo", width: 60 },
  { header: "MONTAGE", field: "corps_metier_montage", width: 75 },
  { header: "MÉTAL", field: "corps_metier_metal", width: 65 },
  { header: "FOURN.", field: "corps_metier_fourniture", width: 65 },
  { header: "NETT.", field: "corps_metier_nettoyage", width: 60 },
  { header: "AUTRES", field: "corps_metier_autres", width: 65 },
] as const;

/** Mapping colonne index → field name DB */
const COL_TO_FIELD = LUT_COLUMNS.map((c) => c.field);

// Colonnes corps de métier (boolean → "X" / "")
const BOOL_COLS = new Set([10, 11, 12, 13, 14, 15, 16]);

/** Bordures fines appliquées à toutes les cellules (gris Excel) */
const THIN_BORDER = { s: 1, cl: { rgb: "#B4B4B4" } };
const ALL_BORDERS = { t: THIN_BORDER, r: THIN_BORDER, b: THIN_BORDER, l: THIN_BORDER };

interface CellMeta {
  bg?: string;
}

interface DbRow {
  id: string;
  cell_metadata?: Record<string, CellMeta>;
  [key: string]: unknown;
}

interface LutSheetProps {
  rows: DbRow[];
  dropdowns: { famille_item: string[]; type_item: string[]; type_travaux: string[] };
  extraColumnHeaders?: string[];
  headerColors?: Record<string, string>;
}

/** Construit le workbookData Univer à partir des lignes DB */
function buildWorkbookData(rows: DbRow[], extraHeaders: string[] = [], headerColors: Record<string, string> = {}): IWorkbookData {
  const allColumns = [
    ...LUT_COLUMNS,
    ...extraHeaders.map((h) => ({ header: h, field: `__extra__${h}`, width: 120 })),
  ];
  const boolColsSet = new Set<string>(
    LUT_COLUMNS.filter((_, i) => BOOL_COLS.has(i)).map((c) => c.field)
  );

  // Styles dynamiques : base + couleurs de fond Excel dédupliquées
  const dynamicStyles: Record<string, Record<string, unknown>> = {};

  function getStyleKey(baseStyle: string | undefined, bgColor: string | undefined): string | undefined {
    if (!bgColor) return baseStyle;
    const key = `${baseStyle ?? "default"}_${bgColor}`;
    if (!dynamicStyles[key]) {
      const baseObj = baseStyle ? { ...(BASE_STYLES[baseStyle] ?? {}) } : {};
      dynamicStyles[key] = { ...baseObj, bg: { rgb: bgColor }, bd: ALL_BORDERS };
    }
    return key;
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const cellData: Record<number, Record<number, any>> = {};

  // En-têtes (ligne 0) avec couleurs Excel importées
  cellData[0] = {};
  allColumns.forEach((col, i) => {
    const isExtra = i >= LUT_COLUMNS.length;
    const excelColor = headerColors[col.field];
    if (excelColor && !isExtra) {
      // Style dynamique pour cette en-tête avec couleur Excel
      const hdrKey = `hdr_${excelColor}`;
      if (!dynamicStyles[hdrKey]) {
        dynamicStyles[hdrKey] = {
          ...BASE_STYLES.header,
          bg: { rgb: excelColor },
          bd: ALL_BORDERS,
        };
      }
      cellData[0][i] = { v: col.header, s: hdrKey };
    } else {
      cellData[0][i] = { v: col.header, s: isExtra ? "extraHeader" : "header" };
    }
  });

  // Données (lignes 1+) avec lignes alternées
  rows.forEach((row, rowIdx) => {
    cellData[rowIdx + 1] = {};
    const rowStyle = rowIdx % 2 === 1 ? "altRow" : undefined;
    const isTA = row["statut"] === "TA";
    const meta = row.cell_metadata ?? {};

    allColumns.forEach((col, colIdx) => {
      const isExtra = colIdx >= LUT_COLUMNS.length;
      let displayValue: string | number = "";
      if (isExtra) {
        const extraKey = col.header;
        const extras = (row["extra_columns"] as Record<string, unknown>) ?? {};
        displayValue = (extras[extraKey] as string | number) ?? "";
      } else if (boolColsSet.has(col.field)) {
        displayValue = row[col.field] ? "X" : "";
      } else {
        displayValue = (row[col.field] as string | number) ?? "";
      }

      const baseStyle = isTA ? "taRow" : isExtra ? "extraCol" : rowStyle;
      const cellMeta = meta[col.field] as CellMeta | undefined;
      const style = getStyleKey(baseStyle, cellMeta?.bg) ?? baseStyle;

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const cell: any = { v: displayValue };
      if (style) cell.s = style;

      cellData[rowIdx + 1][colIdx] = cell;
    });
  });

  // Column widths
  const columnData: Record<number, { w: number }> = {};
  allColumns.forEach((col, i) => {
    columnData[i] = { w: col.width };
  });

  // Merge base styles (with borders) + dynamic styles
  const styles: Record<string, Record<string, unknown>> = {};
  for (const [key, val] of Object.entries(BASE_STYLES)) {
    styles[key] = { ...val, bd: ALL_BORDERS };
  }
  for (const [key, val] of Object.entries(dynamicStyles)) {
    styles[key] = val;
  }

  return {
    id: "lut-workbook",
    name: "LUT",
    appVersion: "0.10.2",
    locale: 1, // EN_US
    styles,
    sheetOrder: ["lut-sheet"],
    sheets: {
      "lut-sheet": {
        id: "lut-sheet",
        name: "LUT",
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

/** Styles de base — palette Office/Excel (sans bordures — ajoutées dynamiquement) */
const BASE_STYLES: Record<string, Record<string, unknown>> = {
  header: {
    ff: "Calibri, Inter, system-ui, sans-serif",
    fs: 11,
    bl: 1,
    bg: { rgb: "#4472C4" },
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
    bg: { rgb: "#D9E2F3" },
  },
  taRow: {
    bg: { rgb: "#F2F2F2" },
    cl: { rgb: "#A6A6A6" },
    st: { s: 1 },
  },
  extraCol: {
    bg: { rgb: "#F2F2F2" },
    cl: { rgb: "#808080" },
  },
};

export default function LutSheet({ rows, dropdowns, extraColumnHeaders = [], headerColors = {} }: LutSheetProps) {
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
        const res = await fetch("/api/ot-items", {
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
      if (col >= LUT_COLUMNS.length) {
        const extraIdx = col - LUT_COLUMNS.length;
        const extraField = extraColumnHeaders[extraIdx];
        if (!extraField) return;
        const key = `${dataRow.id}-extra-${extraField}`;
        pendingChanges.current.set(key, { id: dataRow.id, field: "__extra__", extra_field: extraField, value } as unknown as { id: string; field: string; value: unknown });
        setPendingCount(pendingChanges.current.size);
        return;
      }

      const field = COL_TO_FIELD[col];
      if (!field) return;

      // Boolean columns: "X" → true, "" → false
      let dbValue: unknown = value;
      if (BOOL_COLS.has(col)) {
        dbValue = String(value).toUpperCase() === "X";
      }

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
          whenFormula: (formula: string) => {
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

      // Dropdown: STATUT (col 8)
      const statutRule = api
        .newDataValidation()
        .requireValueInList(["TB", "TC", "TA"])
        .setAllowBlank(true)
        .build();
      sheet.getRange(1, 8, rowCount, 1).setDataValidation(statutRule);

      // Dropdown: FAMILLE ITEM (col 5)
      if (dropdowns.famille_item.length > 0) {
        const familleRule = api
          .newDataValidation()
          .requireValueInList(dropdowns.famille_item)
          .setAllowBlank(true)
          .build();
        sheet.getRange(1, 5, rowCount, 1).setDataValidation(familleRule);
      }

      // Dropdown: TYPE ITEM (col 6)
      if (dropdowns.type_item.length > 0) {
        const typeRule = api
          .newDataValidation()
          .requireValueInList(dropdowns.type_item)
          .setAllowBlank(true)
          .build();
        sheet.getRange(1, 6, rowCount, 1).setDataValidation(typeRule);
      }

      // Dropdown: TYPE TRAVAUX (col 7)
      if (dropdowns.type_travaux.length > 0) {
        const travauxRule = api
          .newDataValidation()
          .requireValueInList(dropdowns.type_travaux)
          .setAllowBlank(true)
          .build();
        sheet.getRange(1, 7, rowCount, 1).setDataValidation(travauxRule);
      }

      // Conditional formatting: lignes TA (annulées) → fond gris
      try {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const cfApi = api as any;
        const taRule = cfApi
          .newConditionalFormattingRule()
          .whenFormula('=$I2="TA"')
          .setBackground("#D3D3D3")
          .setFontColor("#808080")
          .build();
        sheet.getRange(1, 0, rowCount, LUT_COLUMNS.length).addConditionalFormattingRule(taRule);
      } catch {
        // Conditional formatting may not be supported in all Univer versions
      }

      // Block header row editing
      api.addEvent(api.Event.BeforeSheetEditStart, (params: unknown) => {
        const p = params as { range: { startRow: number } };
        if (p.range.startRow === 0) return false;
      });
    },
    [rows.length, dropdowns]
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
