"use client";

import { useCallback, useRef } from "react";
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
  { header: "COMMENTAIRES", field: "commentaires", width: 250 },
] as const;

const COL_TO_FIELD = JT_COLUMNS.map((c) => c.field);
const READ_ONLY_COLS = JT_COLUMNS
  .map((c, i) => ("readOnly" in c && c.readOnly ? i : -1))
  .filter((i) => i >= 0);

interface DbFlange {
  id: string;
  ot_items?: { item: string; unite: string };
  [key: string]: unknown;
}

interface JtSheetProps {
  rows: DbFlange[];
  operationTypes: string[];
}

/** Calcule retenu côté client pour affichage immédiat */
function computeRetenu(emis: unknown, buta: unknown): unknown {
  return emis ?? buta ?? "";
}

function buildWorkbookData(rows: DbFlange[]): IWorkbookData {
  const cellData: Record<number, Record<number, { v: string | number; s?: string }>> = {};

  // En-têtes
  cellData[0] = {};
  JT_COLUMNS.forEach((col, i) => {
    cellData[0][i] = { v: col.header, s: "header" };
  });

  // Données avec lignes alternées
  rows.forEach((row, rowIdx) => {
    cellData[rowIdx + 1] = {};
    const baseStyle = rowIdx % 2 === 1 ? "altRow" : undefined;
    JT_COLUMNS.forEach((col, colIdx) => {
      let value: string | number = "";

      if (col.field === "_item") {
        value = (row.ot_items?.item as string) ?? "";
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

      // Priorité style : delta > calo > readonly > altRow
      let style: string | undefined;
      if ((col.field === "delta_dn" || col.field === "delta_pn") && row[col.field]) {
        style = "delta";
      } else if (value === "CALO") {
        style = "calo";
      } else if (value === "PAS D'INFO") {
        style = "pasinfo";
      } else if ("readOnly" in col && col.readOnly) {
        style = "readonly";
      } else {
        style = baseStyle;
      }

      cellData[rowIdx + 1][colIdx] = { v: value, ...(style ? { s: style } : {}) };
    });
  });

  const columnData: Record<number, { w: number }> = {};
  JT_COLUMNS.forEach((col, i) => {
    columnData[i] = { w: col.width };
  });

  return {
    id: "jt-workbook",
    name: "J&T",
    appVersion: "0.10.2",
    locale: 1,
    styles: {
      header: {
        ff: "Inter, system-ui, sans-serif",
        fs: 11,
        bl: 1,
        bg: { rgb: "#0F766E" },
        cl: { rgb: "#FFFFFF" },
      },
      altRow: {
        bg: { rgb: "#F8FAFC" },
      },
      delta: {
        bg: { rgb: "#FEE2E2" },
        cl: { rgb: "#DC2626" },
        bl: 1,
      },
      calo: {
        bg: { rgb: "#FEF3C7" },
        cl: { rgb: "#B45309" },
        bl: 1,
      },
      pasinfo: {
        bg: { rgb: "#F3E8FF" },
        cl: { rgb: "#7C3AED" },
      },
      readonly: {
        bg: { rgb: "#F0FDF4" },
        cl: { rgb: "#166534" },
      },
    },
    sheetOrder: ["jt-sheet"],
    sheets: {
      "jt-sheet": {
        id: "jt-sheet",
        name: "J&T",
        rowCount: rows.length + 2,
        columnCount: JT_COLUMNS.length,
        defaultRowHeight: 24,
        defaultColumnWidth: 100,
        columnData,
        freeze: { startRow: 1, startColumn: 0, ySplit: 1, xSplit: 0 },
        cellData,
      },
    },
  } as unknown as IWorkbookData;
}

export default function JtSheet({ rows, operationTypes }: JtSheetProps) {
  const rowsRef = useRef(rows);
  rowsRef.current = rows;

  const pendingTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const pendingChanges = useRef(new Map<string, { id: string; field: string; value: unknown }>());

  const flushChanges = useCallback(() => {
    const changes = Array.from(pendingChanges.current.values());
    pendingChanges.current.clear();
    changes.forEach(async (change) => {
      await fetch("/api/flanges", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(change),
      });
    });
  }, []);

  const handleCellChange = useCallback(
    (event: CellChangeEvent) => {
      const { row, col, value } = event;
      if (row === 0) return;

      const dataRow = rowsRef.current[row - 1];
      if (!dataRow) return;

      const field = COL_TO_FIELD[col];
      if (!field || field.startsWith("_") || READ_ONLY_COLS.includes(col)) return;

      const key = `${dataRow.id}-${field}`;
      pendingChanges.current.set(key, { id: dataRow.id, field, value });

      clearTimeout(pendingTimer.current);
      pendingTimer.current = setTimeout(flushChanges, 500);
    },
    [flushChanges]
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
        const p = params as { range: { startRow: number; startColumn: number } };
        if (p.range.startRow === 0) return false;
        if (READ_ONLY_COLS.includes(p.range.startColumn)) return false;
      });
    },
    [rows.length, operationTypes]
  );

  const workbookData = buildWorkbookData(rows);

  return (
    <div style={{ width: "100%", height: "calc(100vh - 120px)" }}>
      <UniverSheet
        workbookData={workbookData}
        onCellChange={handleCellChange}
        onReady={handleReady}
      />
    </div>
  );
}
