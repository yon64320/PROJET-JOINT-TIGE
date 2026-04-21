"use client";

import { useState, useCallback, useMemo } from "react";
import JtSheet, { JT_COLUMNS, type DbFlange, type JtColumn } from "./JtSheet";
import JtViewToggle from "./JtViewToggle";
import dynamic from "next/dynamic";
import RobinerieView from "@/components/fiche-rob/RobinerieView";

const EchafSheet = dynamic(() => import("./EchafSheet"), { ssr: false });
const CaloSheet = dynamic(() => import("./CaloSheet"), { ssr: false });
import { JT_VIEW_CONFIGS, type JtViewMode } from "@/lib/jt-views";
import type { RobFlangeRow } from "@/types/rob";
import type { FicheRobTemplate } from "@/lib/domain/fiche-rob-fields";

interface JtPageClientProps {
  rows: DbFlange[];
  operationTypes: string[];
  extraColumnHeaders?: string[];
  headerColors?: Record<string, string>;
  headerLeft?: React.ReactNode;
  projectId?: string;
  projectName?: string;
  robTemplate?: FicheRobTemplate;
}

/** Complete view columns = all JT_COLUMNS (no virtual retenu duplicates) */
const COMPLETE_COLUMNS = JT_COLUMNS.filter(
  (c) => c.field !== "_dn_retenu" && c.field !== "_pn_retenu",
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

function getColumnCounts(
  extraCount: number,
  robCount: number,
  echafCount: number,
  caloCount: number,
): Record<JtViewMode, number> {
  return {
    synthese: getColumnsForView("synthese").length,
    client: getColumnsForView("client").length,
    terrain: getColumnsForView("terrain").length,
    complete: COMPLETE_COLUMNS.length + extraCount,
    robinetterie: robCount,
    echafaudage: echafCount,
    calorifuge: caloCount,
  };
}

function isTruthyBool(v: unknown): boolean {
  if (v === true) return true;
  const s = String(v ?? "").toUpperCase();
  return s === "TRUE" || s === "OUI";
}

export default function JtPageClient({
  rows,
  operationTypes,
  extraColumnHeaders = [],
  headerColors = {},
  headerLeft,
  projectId = "",
  projectName = "",
  robTemplate,
}: JtPageClientProps) {
  const [viewMode, setViewMode] = useState<JtViewMode>("terrain");

  // Dériver les sous-ensembles côté client — évite de sérialiser 3x les rows depuis le RSC
  const robRows = useMemo(
    () =>
      rows.filter((r) => r.rob === true || r.rob === "true" || r.rob === "TRUE") as RobFlangeRow[],
    [rows],
  );
  const echafRows = useMemo(() => rows.filter((r) => isTruthyBool(r.echafaudage)), [rows]);
  const caloRows = useMemo(() => rows.filter((r) => isTruthyBool(r.calorifuge)), [rows]);

  const visibleColumns = getColumnsForView(viewMode);
  const columnCounts = getColumnCounts(
    extraColumnHeaders.length,
    robRows.length,
    echafRows.length,
    caloRows.length,
  );

  const handleViewChange = useCallback((newMode: JtViewMode) => {
    setViewMode(newMode);
  }, []);

  return (
    <div className="flex flex-col flex-1 min-h-0">
      {/* En-tête avec header left + view toggle alignés */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3 px-3 sm:px-4 py-2 sm:py-1.5 border-b border-slate-200 bg-white">
        {headerLeft}
        <div className="hidden sm:block w-px h-4 bg-slate-200" />
        <JtViewToggle
          activeView={viewMode}
          onViewChange={handleViewChange}
          columnCounts={columnCounts}
        />
      </div>
      <div className="flex-1 min-h-0">
        {viewMode === "robinetterie" ? (
          <RobinerieView
            rows={robRows}
            projectId={projectId}
            projectName={projectName}
            template={robTemplate ?? { caracteristiques: [], travaux: [] }}
          />
        ) : viewMode === "echafaudage" ? (
          <EchafSheet rows={echafRows} />
        ) : viewMode === "calorifuge" ? (
          <CaloSheet rows={caloRows} />
        ) : (
          <JtSheet
            key={viewMode}
            rows={rows}
            operationTypes={operationTypes}
            extraColumnHeaders={viewMode === "complete" ? extraColumnHeaders : []}
            headerColors={headerColors}
            viewMode={viewMode}
            visibleColumns={visibleColumns}
          />
        )}
      </div>
    </div>
  );
}
