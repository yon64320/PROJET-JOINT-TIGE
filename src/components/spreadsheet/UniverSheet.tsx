"use client";

import { useEffect, useRef } from "react";
import { createUniver, LocaleType, mergeLocales } from "@univerjs/presets";
import type { IWorkbookData } from "@univerjs/presets";
import { UniverSheetsCorePreset } from "@univerjs/preset-sheets-core";
import { UniverSheetsDataValidationPreset } from "@univerjs/preset-sheets-data-validation";
import { UniverSheetsConditionalFormattingPreset } from "@univerjs/preset-sheets-conditional-formatting";
import UniverPresetSheetsCoreFrFR from "@univerjs/preset-sheets-core/locales/fr-FR";
import UniverPresetSheetsDataValidationFrFR from "@univerjs/preset-sheets-data-validation/locales/fr-FR";
import UniverPresetSheetsConditionalFormattingFrFR from "@univerjs/preset-sheets-conditional-formatting/locales/fr-FR";
import { defaultTheme } from "@univerjs/themes";

/** Thème EMIS — bleu marine corporate #1E3A5F comme couleur primaire */
const emisTheme = {
  ...defaultTheme,
  primary: {
    "50": "#EEF2F7",
    "100": "#D4DFED",
    "200": "#A9BFD9",
    "300": "#7E9FC6",
    "400": "#4D7AAD",
    "500": "#2B5A8C",
    "600": "#1E3A5F",
    "700": "#1A3253",
    "800": "#152A46",
    "900": "#0F1F33",
  },
};

import "@univerjs/preset-sheets-core/lib/index.css";
import "@univerjs/preset-sheets-data-validation/lib/index.css";
import "@univerjs/preset-sheets-conditional-formatting/lib/index.css";

export interface CellChangeEvent {
  row: number;
  col: number;
  value: string | number | boolean | null;
  sheetId: string;
}

interface UniverSheetProps {
  workbookData: IWorkbookData;
  onCellChange?: (event: CellChangeEvent) => void;
  /** Called once Univer is ready — use to set up validation/formatting */
  onReady?: (univerAPI: unknown) => void;
}

export default function UniverSheet({ workbookData, onCellChange, onReady }: UniverSheetProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const onCellChangeRef = useRef(onCellChange);
  onCellChangeRef.current = onCellChange;

  useEffect(() => {
    if (!containerRef.current) return;
    // Clean up residual DOM from previous instance (React 19 Strict Mode
    // disposes the JS event system but leaves Univer's DOM nodes behind)
    containerRef.current.innerHTML = "";

    const { univerAPI } = createUniver({
      locale: LocaleType.FR_FR,
      locales: {
        [LocaleType.FR_FR]: mergeLocales(
          UniverPresetSheetsCoreFrFR,
          UniverPresetSheetsDataValidationFrFR,
          UniverPresetSheetsConditionalFormattingFrFR,
        ),
      },
      theme: emisTheme,
      presets: [
        UniverSheetsCorePreset({
          container: containerRef.current,
          header: true,
          toolbar: true,
          formulaBar: true,
          contextMenu: true,
        }),
        UniverSheetsDataValidationPreset(),
        UniverSheetsConditionalFormattingPreset(),
      ],
    });

    univerAPI.createWorkbook(workbookData);
    onReady?.(univerAPI);

    const disposable = univerAPI.addEvent(
      univerAPI.Event.SheetValueChanged,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (params: any) => {
        const cb = onCellChangeRef.current;
        if (!cb) return;
        const { effectedRanges } = params;
        if (!effectedRanges) return;
        for (const fRange of effectedRanges) {
          const startRow = fRange.getRow();
          const startCol = fRange.getColumn();
          const values = fRange.getValues();
          if (!values) continue;
          for (let r = 0; r < values.length; r++) {
            for (let c = 0; c < (values[r]?.length ?? 0); c++) {
              const raw = values[r][c];
              // getValues() returns primitives, but guard against cell objects
              const cellValue =
                raw !== null && typeof raw === "object" && "v" in raw
                  ? (raw as { v: unknown }).v
                  : raw;
              cb({
                row: startRow + r,
                col: startCol + c,
                value: (cellValue ?? null) as string | number | boolean | null,
                sheetId: "",
              });
            }
          }
        }
      },
    );

    return () => {
      disposable.dispose();
      univerAPI.dispose();
    };
  }, []);

  return (
    <div
      ref={containerRef}
      className="univer-container"
      style={{ width: "100%", height: "100%" }}
    />
  );
}
