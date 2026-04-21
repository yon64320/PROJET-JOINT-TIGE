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
      Chargement du tableur Robinetterie...
    </div>
  ),
});

/** Colonnes affichées dans le tableur Rob */
const ROB_COLUMNS = [
  { header: "POSTE TECHNIQUE", field: "_item", width: 140, editable: false },
  { header: "ZONE", field: "_unite", width: 100, editable: false },
  { header: "GAMME", field: "_gamme", width: 120, editable: false },
  { header: "RESPONSABLE", field: "responsable", width: 130, editable: true },
  { header: "REP. BUTA", field: "repere_buta", width: 100, editable: false },
  { header: "REP. EMIS", field: "repere_emis", width: 100, editable: false },
  { header: "OPÉRATION", field: "operation", width: 140, editable: false },
  { header: "DN EMIS", field: "dn_emis", width: 80, editable: false },
  { header: "DN BUTA", field: "dn_buta", width: 80, editable: false },
  { header: "PN EMIS", field: "pn_emis", width: 80, editable: false },
  { header: "PN BUTA", field: "pn_buta", width: 80, editable: false },
  { header: "NB TIGES RET.", field: "_nb_tiges_retenu", width: 110, editable: false },
  { header: "MAT. JT RET.", field: "_matiere_joint_retenu", width: 120, editable: false },
  { header: "COMMENTAIRES", field: "commentaires", width: 250, editable: true },
] as const;

/** Index des colonnes éditables */
const EDITABLE_COL_INDICES = new Set(
  ROB_COLUMNS.map((c, i) => (c.editable ? i : -1)).filter((i) => i >= 0),
);

interface DbRobFlange {
  id: string;
  ot_items?: { item: string; unite: string; famille_item: string; type_travaux: string };
  [key: string]: unknown;
}

interface RobSheetProps {
  rows: DbRobFlange[];
}

function computeRetenu(emis: unknown, buta: unknown): unknown {
  return emis ?? buta ?? "";
}

function deriveGamme(familleItem: string | undefined): string {
  if (!familleItem) return "";
  const lower = familleItem.toLowerCase();
  if (lower === "robinetterie") return "Vanne";
  if (lower === "equipement" || lower === "appareil") return "Équipement";
  return familleItem;
}

function buildWorkbookData(rows: DbRobFlange[]): IWorkbookData {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const cellData: Record<number, Record<number, any>> = {};

  // En-têtes
  cellData[0] = {};
  ROB_COLUMNS.forEach((col, i) => {
    cellData[0][i] = { v: col.header, s: col.editable ? "headerEditable" : "header" };
  });

  // Données
  rows.forEach((row, rowIdx) => {
    cellData[rowIdx + 1] = {};
    const rowStyle = rowIdx % 2 === 1 ? "altRow" : undefined;

    ROB_COLUMNS.forEach((col, colIdx) => {
      let value: string | number = "";

      if (col.field === "_item") {
        value = row.ot_items?.item ?? "";
      } else if (col.field === "_unite") {
        value = row.ot_items?.unite ?? "";
      } else if (col.field === "_gamme") {
        value = deriveGamme(row.ot_items?.famille_item);
      } else if (col.field === "_nb_tiges_retenu") {
        value = computeRetenu(row.nb_tiges_emis, row.nb_tiges_buta) as string;
      } else if (col.field === "_matiere_joint_retenu") {
        value = computeRetenu(row.matiere_joint_emis, row.matiere_joint_buta) as string;
      } else {
        value = (row[col.field] as string | number) ?? "";
      }

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const cell: any = { v: value };
      if (rowStyle) cell.s = rowStyle;
      cellData[rowIdx + 1][colIdx] = cell;
    });
  });

  const columnData: Record<number, { w: number }> = {};
  ROB_COLUMNS.forEach((col, i) => {
    columnData[i] = { w: col.width };
  });

  const styles: Record<string, Record<string, unknown>> = {};
  for (const [key, val] of Object.entries(ROB_BASE_STYLES)) {
    styles[key] = { ...val, bd: ALL_BORDERS };
  }

  return {
    id: "rob-workbook",
    name: "Robinetterie",
    appVersion: "0.10.2",
    locale: 1,
    styles,
    sheetOrder: ["rob-sheet"],
    sheets: {
      "rob-sheet": {
        id: "rob-sheet",
        name: "Robinetterie",
        rowCount: rows.length + 2,
        columnCount: ROB_COLUMNS.length,
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

const ROB_BASE_STYLES: Record<string, Record<string, unknown>> = {
  header: {
    ff: "Calibri, Inter, system-ui, sans-serif",
    fs: 11,
    bl: 1,
    bg: { rgb: "#C2572A" },
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
    bg: { rgb: "#F5E0D8" },
  },
};

export default function RobSheet({ rows }: RobSheetProps) {
  const { pendingCount, saveStatus, trackChange, flushChanges } = useSheetSync({
    apiEndpoint: "/api/flanges",
  });

  const handleCellChange = useCallback(
    (evt: { row: number; col: number; value: unknown }) => {
      const { row, col, value } = evt;
      if (row === 0) return; // header
      const colDef = ROB_COLUMNS[col];
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

    // Block editing on non-editable columns and header row
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
