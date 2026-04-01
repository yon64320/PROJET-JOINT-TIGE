"use client";

import { useCallback } from "react";
import dynamic from "next/dynamic";
import type { IWorkbookData } from "@univerjs/presets";

const UniverSheet = dynamic(() => import("./UniverSheet"), {
  ssr: false,
  loading: () => (
    <div className="flex items-center justify-center h-full text-gray-500">
      Chargement du tableur Robinetterie...
    </div>
  ),
});

/** Colonnes affichées dans le tableur Rob (toutes read-only) */
const ROB_COLUMNS = [
  { header: "POSTE TECHNIQUE", field: "_item", width: 140 },
  { header: "ZONE", field: "_unite", width: 100 },
  { header: "GAMME", field: "_gamme", width: 120 },
  { header: "REP. BUTA", field: "repere_buta", width: 100 },
  { header: "REP. EMIS", field: "repere_emis", width: 100 },
  { header: "OPÉRATION", field: "operation", width: 140 },
  { header: "DN EMIS", field: "dn_emis", width: 80 },
  { header: "DN BUTA", field: "dn_buta", width: 80 },
  { header: "PN EMIS", field: "pn_emis", width: 80 },
  { header: "PN BUTA", field: "pn_buta", width: 80 },
  { header: "NB TIGES RET.", field: "_nb_tiges_retenu", width: 110 },
  { header: "MAT. JT RET.", field: "_matiere_joint_retenu", width: 120 },
  { header: "COMMENTAIRES", field: "commentaires", width: 250 },
] as const;

/** Bordures fines */
const THIN_BORDER = { s: 1, cl: { rgb: "#B4B4B4" } };
const ALL_BORDERS = { t: THIN_BORDER, r: THIN_BORDER, b: THIN_BORDER, l: THIN_BORDER };

interface DbRobFlange {
  id: string;
  ot_items?: { item: string; unite: string; famille_item: string };
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
    cellData[0][i] = { v: col.header, s: "header" };
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
  altRow: {
    bg: { rgb: "#F5E0D8" },
  },
};

export default function RobSheet({ rows }: RobSheetProps) {
  const handleReady = useCallback(
    (univerAPI: unknown) => {
      const api = univerAPI as {
        addEvent: (event: unknown, cb: (params: unknown) => boolean | void) => { dispose: () => void };
        Event: { BeforeSheetEditStart: unknown };
      };

      // Block all editing — Rob is read-only
      api.addEvent(api.Event.BeforeSheetEditStart, (params: unknown) => {
        (params as { cancel?: boolean }).cancel = true;
      });
    },
    []
  );

  const workbookData = buildWorkbookData(rows);

  return (
    <div style={{ width: "100%", height: "calc(100vh - 120px)" }}>
      <UniverSheet
        workbookData={workbookData}
        onReady={handleReady}
      />
    </div>
  );
}
