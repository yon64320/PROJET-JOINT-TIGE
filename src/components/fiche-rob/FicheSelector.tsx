"use client";

import { useMemo, useState, useCallback, useDeferredValue } from "react";
import dynamic from "next/dynamic";
import type { RobFlangeRow, ValvePair } from "@/types/rob";
import type { FicheRobTemplate } from "@/lib/domain/fiche-rob-fields";
import { groupIntoValves, getValveLabel, getValveFlangeIds } from "@/lib/domain/valve-pairs";

const FichePreviewStatic = dynamic(() => import("./FichePreviewStatic"), { ssr: false });

interface FicheSelectorProps {
  rows: RobFlangeRow[];
  template: FicheRobTemplate;
  onGenerate: (selectedIds: string[]) => void;
  generating: boolean;
}

type SortKey =
  | "numero_client"
  | "item"
  | "unite"
  | "type_travaux"
  | "responsable"
  | "operation"
  | "dn"
  | "pn";
type SortDir = "asc" | "desc";

const SORT_LABELS: Record<SortKey, string> = {
  numero_client: "N° client",
  item: "ITEM",
  unite: "UNITE",
  type_travaux: "Type trav.",
  responsable: "Responsable",
  operation: "Opération",
  dn: "DN",
  pn: "PN",
};

// ── Helpers ──

function getRetenu(emis: unknown, buta: unknown): string {
  const v = emis ?? buta;
  return v == null ? "" : String(v);
}

function unique(values: (string | null | undefined)[]): string[] {
  return [...new Set(values.filter((v): v is string => !!v))].sort();
}

function getPrimary(v: ValvePair): RobFlangeRow | null {
  return v.admission ?? v.refoulement;
}

// ── Sub-components (top-level pour éviter re-créations à chaque render) ──

function SortIcon({ col, sortKey, sortDir }: { col: SortKey; sortKey: SortKey; sortDir: SortDir }) {
  if (sortKey !== col) return <span className="text-slate-300 ml-0.5">{"\u2195"}</span>;
  return <span className="text-blue-600 ml-0.5">{sortDir === "asc" ? "\u25B2" : "\u25BC"}</span>;
}

function ThSortable({
  col,
  sortKey,
  sortDir,
  onSort,
  className: extraClassName,
  children,
}: {
  col: SortKey;
  sortKey: SortKey;
  sortDir: SortDir;
  onSort: (col: SortKey) => void;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <th
      className={`px-2 py-2 text-left text-xs font-semibold text-slate-700 cursor-pointer select-none hover:bg-slate-100 whitespace-nowrap ${extraClassName ?? ""}`}
      onClick={() => onSort(col)}
    >
      {children}
      <SortIcon col={col} sortKey={sortKey} sortDir={sortDir} />
    </th>
  );
}

// ── Component ──

export default function FicheSelector({
  rows,
  template,
  onGenerate,
  generating,
}: FicheSelectorProps) {
  // Filters
  const [filterUnite, setFilterUnite] = useState<string>("");
  const [filterResponsable, setFilterResponsable] = useState<string>("");
  const [filterTypeTravaux, setFilterTypeTravaux] = useState<string>("");
  const [filterSearch, setFilterSearch] = useState<string>("");
  // useDeferredValue : l'input reste responsif pendant le filtrage coûteux
  const deferredSearch = useDeferredValue(filterSearch);

  // Sort
  const [sortKey, setSortKey] = useState<SortKey>("numero_client");
  const [sortDir, setSortDir] = useState<SortDir>("asc");

  // Selection
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // Group rows into valves
  const valves = useMemo(() => groupIntoValves(rows), [rows]);

  // Extract unique values for dropdowns (from primary rows)
  const primaryRows = useMemo(
    () => valves.map((v) => v.admission ?? v.refoulement).filter(Boolean) as RobFlangeRow[],
    [valves],
  );
  const unites = useMemo(() => unique(primaryRows.map((r) => r.ot_items?.unite)), [primaryRows]);
  const responsables = useMemo(() => unique(primaryRows.map((r) => r.responsable)), [primaryRows]);
  const typesTravaux = useMemo(
    () => unique(primaryRows.map((r) => r.ot_items?.type_travaux)),
    [primaryRows],
  );

  // Filter valves
  const filteredValves = useMemo(() => {
    return valves.filter((v) => {
      const r = getPrimary(v);
      if (!r) return false;
      if (filterUnite && r.ot_items?.unite !== filterUnite) return false;
      if (filterResponsable && r.responsable !== filterResponsable) return false;
      if (filterTypeTravaux && r.ot_items?.type_travaux !== filterTypeTravaux) return false;
      if (deferredSearch) {
        const search = deferredSearch.toLowerCase();
        const label = getValveLabel(v).toLowerCase();
        const item = (r.ot_items?.item ?? "").toLowerCase();
        if (!label.includes(search) && !item.includes(search)) return false;
      }
      return true;
    });
  }, [valves, filterUnite, filterResponsable, filterTypeTravaux, deferredSearch]);

  // Sort valves
  const sortedValves = useMemo(() => {
    const getValue = (v: ValvePair, key: SortKey): string => {
      const r = getPrimary(v);
      if (!r) return "";
      switch (key) {
        case "numero_client":
          return getValveLabel(v);
        case "item":
          return r.ot_items?.item ?? "";
        case "unite":
          return r.ot_items?.unite ?? "";
        case "type_travaux":
          return r.ot_items?.type_travaux ?? "";
        case "responsable":
          return r.responsable ?? "";
        case "operation":
          return r.operation ?? "";
        case "dn":
          return getRetenu(r.dn_emis, r.dn_buta);
        case "pn":
          return getRetenu(r.pn_emis, r.pn_buta);
      }
    };

    return [...filteredValves].sort((a, b) => {
      const va = getValue(a, sortKey);
      const vb = getValue(b, sortKey);
      const cmp = va.localeCompare(vb, "fr", { numeric: true });
      return sortDir === "asc" ? cmp : -cmp;
    });
  }, [filteredValves, sortKey, sortDir]);

  // Toggle sort on column header click
  const handleSort = useCallback((key: SortKey) => {
    setSortKey((prev) => {
      if (prev === key) {
        setSortDir((d) => (d === "asc" ? "desc" : "asc"));
        return key;
      }
      setSortDir("asc");
      return key;
    });
  }, []);

  // Explicit direction toggle
  const toggleDir = useCallback(() => {
    setSortDir((d) => (d === "asc" ? "desc" : "asc"));
  }, []);

  // Selection handlers — selected by pairKey
  const toggleOne = useCallback((pairKey: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(pairKey)) next.delete(pairKey);
      else next.add(pairKey);
      return next;
    });
  }, []);

  const toggleAllFiltered = useCallback(() => {
    const filteredPairKeys = sortedValves.map((v) => v.pairKey);
    setSelectedIds((prev) => {
      const allSelected = filteredPairKeys.every((id) => prev.has(id));
      if (allSelected) {
        const next = new Set(prev);
        filteredPairKeys.forEach((id) => next.delete(id));
        return next;
      }
      return new Set([...prev, ...filteredPairKeys]);
    });
  }, [sortedValves]);

  const allFilteredSelected =
    sortedValves.length > 0 && sortedValves.every((v) => selectedIds.has(v.pairKey));

  const handleGenerate = useCallback(() => {
    const selectedValves = sortedValves.filter((v) => selectedIds.has(v.pairKey));
    const flangeIds = getValveFlangeIds(selectedValves);
    onGenerate(flangeIds);
  }, [sortedValves, selectedIds, onGenerate]);

  return (
    <div className="flex h-full bg-white">
      {/* ════ LEFT: Table + filters ════ */}
      <div className="flex flex-col flex-1 min-w-0">
        {/* ── Filter bar ── */}
        <div className="flex flex-wrap items-center gap-2 px-4 py-2.5 border-b border-slate-200 bg-slate-50">
          <FilterSelect
            label="Unité"
            value={filterUnite}
            options={unites}
            onChange={setFilterUnite}
          />
          <FilterSelect
            label="Responsable"
            value={filterResponsable}
            options={responsables}
            onChange={setFilterResponsable}
          />
          <FilterSelect
            label="Type travaux"
            value={filterTypeTravaux}
            options={typesTravaux}
            onChange={setFilterTypeTravaux}
          />

          <div className="flex items-center gap-1">
            <label className="text-xs text-slate-500">Recherche</label>
            <input
              type="text"
              placeholder="N° client ou ITEM..."
              value={filterSearch}
              onChange={(e) => setFilterSearch(e.target.value)}
              className="px-2 py-1 text-xs border border-slate-300 rounded w-full sm:w-44 focus:ring-1 focus:ring-blue-400 focus:border-blue-400 outline-none"
            />
          </div>

          {(filterUnite || filterResponsable || filterTypeTravaux || filterSearch) && (
            <button
              onClick={() => {
                setFilterUnite("");
                setFilterResponsable("");
                setFilterTypeTravaux("");
                setFilterSearch("");
              }}
              className="text-xs text-slate-500 hover:text-slate-700 underline"
            >
              Effacer filtres
            </button>
          )}
        </div>

        {/* ── Sort bar ── */}
        <div className="flex items-center gap-2 px-4 py-1.5 border-b border-slate-100 bg-white">
          <span className="text-[10px] text-slate-400 uppercase tracking-wide">Tri :</span>
          <span className="text-xs font-medium text-slate-700">{SORT_LABELS[sortKey]}</span>
          <button
            onClick={toggleDir}
            className={`inline-flex items-center gap-1 px-2 py-0.5 text-[11px] font-medium rounded border transition-colors ${
              sortDir === "asc"
                ? "bg-blue-50 text-blue-700 border-blue-200"
                : "bg-amber-50 text-amber-700 border-amber-200"
            }`}
          >
            {sortDir === "asc" ? "A \u2192 Z" : "Z \u2192 A"}
            <svg
              className="w-3 h-3"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              {sortDir === "asc" ? (
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M3 4h13M3 8h9M3 12h5m4 0l4 4m0 0l4-4m-4 4V4"
                />
              ) : (
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M3 4h13M3 8h9M3 12h5m4 0l4-4m0 0l4 4m-4-4v12"
                />
              )}
            </svg>
          </button>

          <div className="ml-auto text-xs text-slate-500">
            <span className="font-medium text-slate-700">{selectedIds.size}</span> sél.
            {" / "}
            <span>{sortedValves.length}</span> filtrée{sortedValves.length > 1 ? "s" : ""}
            {" / "}
            <span>{valves.length}</span> total
          </div>
        </div>

        {/* ── Table ── */}
        <div className="flex-1 overflow-auto min-h-0">
          <table className="w-full text-xs border-collapse">
            <thead className="sticky top-0 bg-white z-10 shadow-[0_1px_0_0_theme(colors.slate.200)]">
              <tr>
                <th className="px-2 py-2 w-8">
                  <input
                    type="checkbox"
                    checked={allFilteredSelected}
                    onChange={toggleAllFiltered}
                    className="rounded border-slate-300"
                  />
                </th>
                <ThSortable
                  col="numero_client"
                  sortKey={sortKey}
                  sortDir={sortDir}
                  onSort={handleSort}
                >
                  N° client
                </ThSortable>
                <ThSortable col="item" sortKey={sortKey} sortDir={sortDir} onSort={handleSort}>
                  ITEM
                </ThSortable>
                <ThSortable
                  col="unite"
                  sortKey={sortKey}
                  sortDir={sortDir}
                  onSort={handleSort}
                  className="hidden sm:table-cell"
                >
                  UNITE
                </ThSortable>
                <ThSortable
                  col="type_travaux"
                  sortKey={sortKey}
                  sortDir={sortDir}
                  onSort={handleSort}
                  className="hidden sm:table-cell"
                >
                  TYPE TRAV.
                </ThSortable>
                <ThSortable
                  col="responsable"
                  sortKey={sortKey}
                  sortDir={sortDir}
                  onSort={handleSort}
                  className="hidden sm:table-cell"
                >
                  RESPONSABLE
                </ThSortable>
                <ThSortable
                  col="operation"
                  sortKey={sortKey}
                  sortDir={sortDir}
                  onSort={handleSort}
                  className="hidden sm:table-cell"
                >
                  OPÉRATION
                </ThSortable>
                <ThSortable col="dn" sortKey={sortKey} sortDir={sortDir} onSort={handleSort}>
                  DN
                </ThSortable>
                <ThSortable col="pn" sortKey={sortKey} sortDir={sortDir} onSort={handleSort}>
                  PN
                </ThSortable>
              </tr>
            </thead>
            <tbody>
              {sortedValves.map((v) => {
                const r = getPrimary(v);
                if (!r) return null;
                const checked = selectedIds.has(v.pairKey);
                const isPaired = v.admission !== null && v.refoulement !== null;
                return (
                  <tr
                    key={v.pairKey}
                    className={`border-b border-slate-100 cursor-pointer transition-colors ${
                      checked ? "bg-blue-50" : "hover:bg-slate-50"
                    }`}
                    onClick={() => toggleOne(v.pairKey)}
                  >
                    <td className="px-2 py-1.5 text-center" onClick={(e) => e.stopPropagation()}>
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => toggleOne(v.pairKey)}
                        className="rounded border-slate-300"
                      />
                    </td>
                    <td className="px-2 py-1.5 font-mono font-medium text-slate-900">
                      <span className="flex items-center gap-1">
                        {getValveLabel(v)}
                        {isPaired && (
                          <span
                            className="inline-block w-2 h-2 rounded-full bg-emerald-400"
                            title="Paire complète"
                          />
                        )}
                      </span>
                    </td>
                    <td className="px-2 py-1.5 text-slate-700">{r.ot_items?.item ?? ""}</td>
                    <td className="px-2 py-1.5 hidden sm:table-cell">
                      <span className="px-1.5 py-0.5 bg-slate-100 rounded text-slate-600 text-[10px] font-medium">
                        {r.ot_items?.unite ?? ""}
                      </span>
                    </td>
                    <td className="px-2 py-1.5 text-slate-600 hidden sm:table-cell">
                      {r.ot_items?.type_travaux ?? ""}
                    </td>
                    <td className="px-2 py-1.5 text-slate-700 font-medium hidden sm:table-cell">
                      {r.responsable ?? ""}
                    </td>
                    <td className="px-2 py-1.5 text-slate-600 hidden sm:table-cell">
                      {r.operation ?? ""}
                    </td>
                    <td className="px-2 py-1.5 text-slate-600 tabular-nums">
                      {getRetenu(r.dn_emis, r.dn_buta)}
                    </td>
                    <td className="px-2 py-1.5 text-slate-600 tabular-nums">
                      {getRetenu(r.pn_emis, r.pn_buta)}
                    </td>
                  </tr>
                );
              })}
              {sortedValves.length === 0 && (
                <tr>
                  <td colSpan={9} className="px-4 py-8 text-center text-slate-400">
                    Aucune vanne ne correspond aux filtres
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* ── Action bar ── */}
        {selectedIds.size > 0 && (
          <div className="flex flex-wrap items-center gap-3 px-4 py-3 border-t border-slate-200 bg-white shadow-[0_-1px_3px_rgba(0,0,0,0.05)]">
            <span className="text-sm text-slate-700">
              <span className="font-semibold">{selectedIds.size}</span> vanne
              {selectedIds.size > 1 ? "s" : ""}
              {" = "}
              <span className="font-semibold">{selectedIds.size * 2}</span> pages
            </span>
            <button
              onClick={handleGenerate}
              disabled={generating}
              className="ml-auto px-4 py-2 min-h-[44px] bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-wait transition-colors"
            >
              {generating ? "Génération..." : `Générer PDF (${selectedIds.size} vannes)`}
            </button>
          </div>
        )}
      </div>

      {/* ════ RIGHT: Template preview ════ */}
      <div className="hidden md:flex w-[280px] shrink-0 border-l border-slate-200 bg-slate-50 flex-col overflow-hidden">
        <div className="px-3 py-2 border-b border-slate-200 bg-white">
          <h3 className="text-xs font-semibold text-slate-700">Aperçu template</h3>
          <p className="text-[10px] text-slate-400 mt-0.5">Mise en page des fiches PDF</p>
        </div>
        <div className="flex-1 overflow-auto p-3">
          <FichePreviewStatic template={template} />
        </div>
      </div>
    </div>
  );
}

// ── Filter dropdown ──

function FilterSelect({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string;
  options: string[];
  onChange: (v: string) => void;
}) {
  return (
    <div className="flex items-center gap-1">
      <label className="text-xs text-slate-500">{label}</label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="px-2 py-1 min-h-[36px] text-xs border border-slate-300 rounded bg-white focus:ring-1 focus:ring-blue-400 focus:border-blue-400 outline-none"
      >
        <option value="">Toutes</option>
        {options.map((opt) => (
          <option key={opt} value={opt}>
            {opt}
          </option>
        ))}
      </select>
    </div>
  );
}
