"use client";

import { useState, useCallback } from "react";
import JtSheet, { JT_COLUMNS, type DbFlange, type JtColumn } from "./JtSheet";
import JtViewToggle from "./JtViewToggle";
import { JT_VIEW_CONFIGS, type JtViewMode } from "@/lib/jt-views";

interface JtPageClientProps {
  rows: DbFlange[];
  operationTypes: string[];
  extraColumnHeaders?: string[];
  headerColors?: Record<string, string>;
  headerLeft?: React.ReactNode;
}

/** Complete view columns = all JT_COLUMNS (no virtual retenu duplicates) */
const COMPLETE_COLUMNS = JT_COLUMNS.filter(
  (c) => c.field !== "_dn_retenu" && c.field !== "_pn_retenu" && c.field !== "_designation_tige",
);

function getColumnsForView(mode: JtViewMode): JtColumn[] {
  if (mode === "complete") return COMPLETE_COLUMNS;

  const config = JT_VIEW_CONFIGS[mode];
  const cols: JtColumn[] = [];
  for (const field of config.fields) {
    const col = JT_COLUMNS.find((c) => c.field === field);
    if (col) cols.push(col);
  }
  return cols;
}

function getColumnCounts(extraCount: number): Record<JtViewMode, number> {
  return {
    synthese: getColumnsForView("synthese").length,
    client: getColumnsForView("client").length,
    terrain: getColumnsForView("terrain").length,
    complete: COMPLETE_COLUMNS.length + extraCount,
  };
}

export default function JtPageClient({
  rows,
  operationTypes,
  extraColumnHeaders = [],
  headerColors = {},
  headerLeft,
}: JtPageClientProps) {
  const [viewMode, setViewMode] = useState<JtViewMode>("terrain");

  const visibleColumns = getColumnsForView(viewMode);
  const columnCounts = getColumnCounts(extraColumnHeaders.length);

  const handleViewChange = useCallback((newMode: JtViewMode) => {
    setViewMode(newMode);
  }, []);

  return (
    <div className="flex flex-col flex-1 min-h-0">
      {/* En-tête avec header left + view toggle alignés */}
      <div className="flex items-center gap-3 px-4 py-1.5 border-b border-slate-200 bg-white">
        {headerLeft}
        <div className="w-px h-4 bg-slate-200" />
        <JtViewToggle
          activeView={viewMode}
          onViewChange={handleViewChange}
          columnCounts={columnCounts}
        />
      </div>
      <div className="flex-1 min-h-0">
        <JtSheet
          key={viewMode}
          rows={rows}
          operationTypes={operationTypes}
          extraColumnHeaders={viewMode === "complete" ? extraColumnHeaders : []}
          headerColors={headerColors}
          viewMode={viewMode}
          visibleColumns={visibleColumns}
        />
      </div>
    </div>
  );
}
