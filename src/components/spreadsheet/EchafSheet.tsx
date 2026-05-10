"use client";

import { useCallback, useMemo } from "react";
import dynamic from "next/dynamic";
import type { IWorkbookData } from "@univerjs/presets";
import { useSheetSync } from "@/hooks/useSheetSync";
import SaveBar from "./SaveBar";
import { ALL_BORDERS } from "./sheet-styles";
import {
  FEB_COLUMNS,
  encodeFebCell,
  decodeFebCell,
  type FebColumnDef,
} from "@/lib/spreadsheet/feb-cell-codec";
import type { EchafFebData } from "@/lib/validation/schemas";

const UniverSheet = dynamic(() => import("./UniverSheet"), {
  ssr: false,
  loading: () => (
    <div className="flex items-center justify-center h-full text-gray-500">
      Chargement du tableur Échafaudage...
    </div>
  ),
});

type CoreColumn = {
  header: string;
  field: string;
  width: number;
  editable: boolean;
};

const CORE_COLUMNS: CoreColumn[] = [
  { header: "NOM", field: "nom", width: 140, editable: false },
  { header: "ZONE", field: "zone", width: 100, editable: false },
  { header: "REP. CLIENT", field: "repere_buta", width: 100, editable: false },
  { header: "REP. EMIS", field: "repere_emis", width: 100, editable: false },
  { header: "OPÉRATION", field: "operation", width: 140, editable: false },
  { header: "DN EMIS", field: "dn_emis", width: 80, editable: false },
  { header: "PN EMIS", field: "pn_emis", width: 80, editable: false },
  { header: "DIMENSION (m)", field: "_dimension", width: 180, editable: false },
  { header: "COMMENTAIRES", field: "commentaires", width: 250, editable: true },
];

type CoreColumnWithCat = CoreColumn & { cat: "core" };
type FebColumnWithCat = FebColumnDef & { cat: "feb" };
type Column = CoreColumnWithCat | FebColumnWithCat;

const CORE_COLUMNS_WITH_CAT: CoreColumnWithCat[] = CORE_COLUMNS.map((c) => ({
  ...c,
  cat: "core",
}));
const FEB_COLUMNS_WITH_CAT: FebColumnWithCat[] = FEB_COLUMNS.map((c) => ({
  ...c,
  cat: "feb",
}));
const ALL_COLUMNS: Column[] = [...CORE_COLUMNS_WITH_CAT, ...FEB_COLUMNS_WITH_CAT];

const EDITABLE_COL_INDICES = new Set(
  ALL_COLUMNS.map((c, i) => (c.editable ? i : -1)).filter((i) => i >= 0),
);

interface DbEchafFlange {
  id: string;
  ot_items?: { item: string; unite: string };
  echaf_feb?: EchafFebData | null;
  [key: string]: unknown;
}

interface EchafSheetProps {
  rows: DbEchafFlange[];
}

const ECHAF_BASE_STYLES: Record<string, Record<string, unknown>> = {
  header: {
    ff: "Calibri, Inter, system-ui, sans-serif",
    fs: 11,
    bl: 1,
    bg: { rgb: "#7C3AED" },
    cl: { rgb: "#FFFFFF" },
    ht: 2,
    vt: 2,
    tb: 3,
  },
  headerEditable: {
    ff: "Calibri, Inter, system-ui, sans-serif",
    fs: 11,
    bl: 1,
    bg: { rgb: "#2563EB" },
    cl: { rgb: "#FFFFFF" },
    ht: 2,
    vt: 2,
    tb: 3,
  },
  // Header dédié pour les colonnes FEB (vert pour distinguer visuellement
  // de l'édition échafaudage standard).
  headerFeb: {
    ff: "Calibri, Inter, system-ui, sans-serif",
    fs: 11,
    bl: 1,
    bg: { rgb: "#059669" },
    cl: { rgb: "#FFFFFF" },
    ht: 2,
    vt: 2,
    tb: 3,
  },
  altRow: {
    bg: { rgb: "#EDE9FE" },
  },
};

function getCellValue(row: DbEchafFlange, col: Column): string | number {
  if (col.cat === "feb") {
    return encodeFebCell(row.echaf_feb ?? null, col);
  }
  if (col.field === "_dimension") {
    const parts = [row.echaf_longueur, row.echaf_largeur, row.echaf_hauteur]
      .map((v) => (v == null || v === "" ? "" : String(v).trim()))
      .filter((s) => s !== "");
    return parts.length > 0 ? parts.join(" x ") : "";
  }
  return (row[col.field] as string | number) ?? "";
}

function buildWorkbookData(rows: DbEchafFlange[]): IWorkbookData {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const cellData: Record<number, Record<number, any>> = {};

  // En-têtes
  cellData[0] = {};
  ALL_COLUMNS.forEach((col, i) => {
    let style = "header";
    if (col.cat === "feb") style = col.editable ? "headerFeb" : "header";
    else if (col.editable) style = "headerEditable";
    cellData[0][i] = { v: col.header, s: style };
  });

  // Données
  rows.forEach((row, rowIdx) => {
    cellData[rowIdx + 1] = {};
    const rowStyle = rowIdx % 2 === 1 ? "altRow" : undefined;

    ALL_COLUMNS.forEach((col, colIdx) => {
      const value = getCellValue(row, col);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const cell: any = { v: value };
      if (rowStyle) cell.s = rowStyle;
      cellData[rowIdx + 1][colIdx] = cell;
    });
  });

  const columnData: Record<number, { w: number }> = {};
  ALL_COLUMNS.forEach((col, i) => {
    columnData[i] = { w: col.width };
  });

  const styles: Record<string, Record<string, unknown>> = {};
  for (const [key, val] of Object.entries(ECHAF_BASE_STYLES)) {
    styles[key] = { ...val, bd: ALL_BORDERS };
  }

  return {
    id: "echaf-workbook",
    name: "Échafaudage",
    appVersion: "0.10.2",
    locale: 1,
    styles,
    sheetOrder: ["echaf-sheet"],
    sheets: {
      "echaf-sheet": {
        id: "echaf-sheet",
        name: "Échafaudage",
        rowCount: rows.length + 2,
        columnCount: ALL_COLUMNS.length,
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

export default function EchafSheet({ rows }: EchafSheetProps) {
  const { pendingCount, saveStatus, trackChange, flushChanges } = useSheetSync({
    apiEndpoint: "/api/flanges",
  });

  const handleCellChange = useCallback(
    (evt: { row: number; col: number; value: unknown }) => {
      const { row, col, value } = evt;
      if (row === 0) return;
      const colDef = ALL_COLUMNS[col];
      if (!colDef || !colDef.editable) return;

      const dataIdx = row - 1;
      if (dataIdx < 0 || dataIdx >= rows.length) return;

      const flangeId = rows[dataIdx].id;

      if (colDef.cat === "feb") {
        // Une cellule FEB peut écrire 1 ou 2 sous-clés (ex. CMU = classe3 + autre).
        const patches = decodeFebCell(value, colDef);
        for (const p of patches) {
          const trackKey = `${flangeId}:feb.${p.key}`;
          trackChange(trackKey, { id: flangeId, feb_field: p.key, value: p.value });
        }
        return;
      }

      const key = `${flangeId}:${colDef.field}`;
      const strVal = value == null || value === "" ? null : String(value);
      trackChange(key, { id: flangeId, field: colDef.field, value: strVal });
    },
    [rows, trackChange],
  );

  const handleReady = useCallback((univerAPI: unknown) => {
    const api = univerAPI as {
      addEvent: (
        event: unknown,
        cb: (params: unknown) => boolean | void,
      ) => { dispose: () => void };
      Event: { BeforeSheetEditStart: unknown };
    };

    api.addEvent(api.Event.BeforeSheetEditStart, (params: unknown) => {
      const p = params as { row: number; column: number; cancel?: boolean };
      if (p.row === 0 || !EDITABLE_COL_INDICES.has(p.column)) {
        p.cancel = true;
      }
    });
  }, []);

  const workbookData = useMemo(() => buildWorkbookData(rows), [rows]);

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
          onReady={handleReady}
          onCellChange={handleCellChange}
        />
      </div>
    </div>
  );
}
