"use client";

import { useCallback, useRef } from "react";
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

interface DbRow {
  id: string;
  [key: string]: unknown;
}

interface LutSheetProps {
  rows: DbRow[];
  dropdowns: { famille_item: string[]; type_item: string[]; type_travaux: string[] };
}

/** Construit le workbookData Univer à partir des lignes DB */
function buildWorkbookData(rows: DbRow[]): IWorkbookData {
  const cellData: Record<number, Record<number, { v: string | number; s?: string }>> = {};

  // En-têtes (ligne 0)
  cellData[0] = {};
  LUT_COLUMNS.forEach((col, i) => {
    cellData[0][i] = { v: col.header, s: "header" };
  });

  // Données (lignes 1+)
  rows.forEach((row, rowIdx) => {
    cellData[rowIdx + 1] = {};
    LUT_COLUMNS.forEach((col, colIdx) => {
      const raw = row[col.field];
      let displayValue: string | number = "";
      if (BOOL_COLS.has(colIdx)) {
        displayValue = raw ? "X" : "";
      } else {
        displayValue = (raw as string | number) ?? "";
      }
      cellData[rowIdx + 1][colIdx] = { v: displayValue };
    });
  });

  // Column widths
  const columnData: Record<number, { w: number }> = {};
  LUT_COLUMNS.forEach((col, i) => {
    columnData[i] = { w: col.width };
  });

  return {
    id: "lut-workbook",
    name: "LUT",
    appVersion: "0.10.2",
    locale: 1, // EN_US
    styles: {
      header: {
        ff: "Arial",
        fs: 11,
        bl: 1,
        bg: { rgb: "#D9E1F2" },
      },
    },
    sheetOrder: ["lut-sheet"],
    sheets: {
      "lut-sheet": {
        id: "lut-sheet",
        name: "LUT",
        rowCount: rows.length + 2,
        columnCount: LUT_COLUMNS.length,
        defaultRowHeight: 24,
        defaultColumnWidth: 100,
        columnData,
        freeze: { startRow: 1, startColumn: 0, ySplit: 1, xSplit: 0 },
        cellData,
      },
    },
  } as unknown as IWorkbookData;
}

export default function LutSheet({ rows, dropdowns }: LutSheetProps) {
  const rowsRef = useRef(rows);
  rowsRef.current = rows;

  const pendingTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const pendingChanges = useRef(new Map<string, { id: string; field: string; value: unknown }>());

  const flushChanges = useCallback(() => {
    const changes = Array.from(pendingChanges.current.values());
    pendingChanges.current.clear();
    changes.forEach(async (change) => {
      await fetch("/api/ot-items", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(change),
      });
    });
  }, []);

  const handleCellChange = useCallback(
    (event: CellChangeEvent) => {
      const { row, col, value } = event;
      if (row === 0) return; // ignore header edits

      const dataRow = rowsRef.current[row - 1];
      if (!dataRow) return;

      const field = COL_TO_FIELD[col];
      if (!field) return;

      // Boolean columns: "X" → true, "" → false
      let dbValue: unknown = value;
      if (BOOL_COLS.has(col)) {
        dbValue = String(value).toUpperCase() === "X";
      }

      const key = `${dataRow.id}-${field}`;
      pendingChanges.current.set(key, { id: dataRow.id, field, value: dbValue });

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
