"use client";

import { useEffect, useRef } from "react";
import { createUniver, LocaleType, mergeLocales } from "@univerjs/presets";
import type { IWorkbookData } from "@univerjs/presets";
import { UniverSheetsCorePreset } from "@univerjs/preset-sheets-core";
import { UniverSheetsDataValidationPreset } from "@univerjs/preset-sheets-data-validation";
import { UniverSheetsConditionalFormattingPreset } from "@univerjs/preset-sheets-conditional-formatting";
import UniverPresetSheetsCoreEnUS from "@univerjs/preset-sheets-core/locales/en-US";

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

export default function UniverSheet({
  workbookData,
  onCellChange,
  onReady,
}: UniverSheetProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const initialized = useRef(false);

  useEffect(() => {
    // Guard against React 19 Strict Mode double-init
    if (initialized.current || !containerRef.current) return;
    initialized.current = true;

    const { univerAPI } = createUniver({
      locale: LocaleType.EN_US,
      locales: {
        [LocaleType.EN_US]: mergeLocales(UniverPresetSheetsCoreEnUS),
      },
      presets: [
        UniverSheetsCorePreset({
          container: containerRef.current,
          header: true,
          toolbar: true,
          formulaBar: false,
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
        if (!onCellChange) return;
        const range = params.range ?? params;
        const newValues = params.newValues ?? params.changes;
        if (!range || !newValues) return;
        for (let r = 0; r < newValues.length; r++) {
          for (let c = 0; c < (newValues[r]?.length ?? 0); c++) {
            const cell = newValues[r][c];
            onCellChange({
              row: (range.startRow ?? 0) + r,
              col: (range.startColumn ?? 0) + c,
              value: cell?.v ?? null,
              sheetId: "",
            });
          }
        }
      }
    );

    return () => {
      disposable.dispose();
      univerAPI.dispose();
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return <div ref={containerRef} style={{ width: "100%", height: "100%" }} />;
}
