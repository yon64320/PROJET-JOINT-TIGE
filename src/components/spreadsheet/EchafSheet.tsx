"use client";

import { useCallback } from "react";
import dynamic from "next/dynamic";
import type { IWorkbookData } from "@univerjs/presets";
import { useSheetSync } from "@/hooks/useSheetSync";
import SaveBar from "./SaveBar";
import { ALL_BORDERS } from "./sheet-styles";

const UniverSheet = dynamic(() => import("./UniverSheet"), {
  ssr: false,
  loading: () => (
    <div className="flex items-center justify-center h-full text-gray-500">
      Chargement du tableur Échafaudage...
    </div>
  ),
});

const ECHAF_COLUMNS = [
  { header: "NOM", field: "nom", width: 140, editable: false },
  { header: "ZONE", field: "zone", width: 100, editable: false },
  { header: "REP. BUTA", field: "repere_buta", width: 100, editable: false },
  { header: "REP. EMIS", field: "repere_emis", width: 100, editable: false },
  { header: "OPÉRATION", field: "operation", width: 140, editable: false },
  { header: "DN EMIS", field: "dn_emis", width: 80, editable: false },
  { header: "PN EMIS", field: "pn_emis", width: 80, editable: false },
  { header: "LONGUEUR (m)", field: "echaf_longueur", width: 110, editable: true },
  { header: "LARGEUR (m)", field: "echaf_largeur", width: 110, editable: true },
  { header: "HAUTEUR (m)", field: "echaf_hauteur", width: 110, editable: true },
  { header: "COMMENTAIRES", field: "commentaires", width: 250, editable: true },
] as const;

const EDITABLE_COL_INDICES = new Set(
  ECHAF_COLUMNS.map((c, i) => (c.editable ? i : -1)).filter((i) => i >= 0),
);

interface DbEchafFlange {
  id: string;
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
  altRow: {
    bg: { rgb: "#EDE9FE" },
  },
};

function buildWorkbookData(rows: DbEchafFlange[]): IWorkbookData {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const cellData: Record<number, Record<number, any>> = {};

  // En-têtes
  cellData[0] = {};
  ECHAF_COLUMNS.forEach((col, i) => {
    cellData[0][i] = { v: col.header, s: col.editable ? "headerEditable" : "header" };
  });

  // Données
  rows.forEach((row, rowIdx) => {
    cellData[rowIdx + 1] = {};
    const rowStyle = rowIdx % 2 === 1 ? "altRow" : undefined;

    ECHAF_COLUMNS.forEach((col, colIdx) => {
      const value = (row[col.field] as string | number) ?? "";
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const cell: any = { v: value };
      if (rowStyle) cell.s = rowStyle;
      cellData[rowIdx + 1][colIdx] = cell;
    });
  });

  const columnData: Record<number, { w: number }> = {};
  ECHAF_COLUMNS.forEach((col, i) => {
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
        columnCount: ECHAF_COLUMNS.length,
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
      const colDef = ECHAF_COLUMNS[col];
      if (!colDef || !colDef.editable) return;

      const dataIdx = row - 1;
      if (dataIdx < 0 || dataIdx >= rows.length) return;

      const flangeId = rows[dataIdx].id;
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

  const workbookData = buildWorkbookData(rows);

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
