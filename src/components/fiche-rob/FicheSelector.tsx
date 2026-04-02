"use client";

import { useMemo, useState, useCallback } from "react";
import dynamic from "next/dynamic";
import type { RobFlangeRow } from "@/types/rob";
import type { FicheRobTemplate } from "@/lib/domain/fiche-rob-fields";

const FichePreview = dynamic(() => import("./FichePreview"), { ssr: false });

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

function getNumeroClient(row: RobFlangeRow): string {
  const nom = row.nom ?? "";
  const rep = row.repere_buta || row.repere_emis || "";
  return rep ? `${nom}-${rep}` : nom;
}

function getRetenu(emis: unknown, buta: unknown): string {
  const v = emis ?? buta;
  return v == null ? "" : String(v);
}

function unique(values: (string | null | undefined)[]): string[] {
  return [...new Set(values.filter((v): v is string => !!v))].sort();
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

  // Sort
  const [sortKey, setSortKey] = useState<SortKey>("numero_client");
  const [sortDir, setSortDir] = useState<SortDir>("asc");

  // Selection
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // Extract unique values for dropdowns
  const unites = useMemo(() => unique(rows.map((r) => r.ot_items?.unite)), [rows]);
  const responsables = useMemo(() => unique(rows.map((r) => r.responsable)), [rows]);
  const typesTravaux = useMemo(() => unique(rows.map((r) => r.ot_items?.type_travaux)), [rows]);

  // Filter rows
  const filteredRows = useMemo(() => {
    return rows.filter((r) => {
      if (filterUnite && r.ot_items?.unite !== filterUnite) return false;
      if (filterResponsable && r.responsable !== filterResponsable) return false;
      if (filterTypeTravaux && r.ot_items?.type_travaux !== filterTypeTravaux) return false;
      if (filterSearch) {
        const search = filterSearch.toLowerCase();
        const numClient = getNumeroClient(r).toLowerCase();
        const item = (r.ot_items?.item ?? "").toLowerCase();
        if (!numClient.includes(search) && !item.includes(search)) return false;
      }
      return true;
    });
  }, [rows, filterUnite, filterResponsable, filterTypeTravaux, filterSearch]);

  // Sort rows
  const sortedRows = useMemo(() => {
    const getValue = (r: RobFlangeRow, key: SortKey): string => {
      switch (key) {
        case "numero_client":
          return getNumeroClient(r);
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

    return [...filteredRows].sort((a, b) => {
      const va = getValue(a, sortKey);
      const vb = getValue(b, sortKey);
      const cmp = va.localeCompare(vb, "fr", { numeric: true });
      return sortDir === "asc" ? cmp : -cmp;
    });
  }, [filteredRows, sortKey, sortDir]);

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

  // Selection handlers
  const toggleOne = useCallback((id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const toggleAllFiltered = useCallback(() => {
    const filteredIds = sortedRows.map((r) => r.id);
    setSelectedIds((prev) => {
      const allSelected = filteredIds.every((id) => prev.has(id));
      if (allSelected) {
        const next = new Set(prev);
        filteredIds.forEach((id) => next.delete(id));
        return next;
      }
      return new Set([...prev, ...filteredIds]);
    });
  }, [sortedRows]);

  const allFilteredSelected =
    sortedRows.length > 0 && sortedRows.every((r) => selectedIds.has(r.id));

  const handleGenerate = useCallback(() => {
    const ids = sortedRows.filter((r) => selectedIds.has(r.id)).map((r) => r.id);
    onGenerate(ids);
  }, [sortedRows, selectedIds, onGenerate]);

  // Sort indicator in headers
  const SortIcon = ({ col }: { col: SortKey }) => {
    if (sortKey !== col) return <span className="text-slate-300 ml-0.5">{"\u2195"}</span>;
    return <span className="text-blue-600 ml-0.5">{sortDir === "asc" ? "\u25B2" : "\u25BC"}</span>;
  };

  const ThSortable = ({ col, children }: { col: SortKey; children: React.ReactNode }) => (
    <th
      className="px-2 py-2 text-left text-xs font-semibold text-slate-700 cursor-pointer select-none hover:bg-slate-100 whitespace-nowrap"
      onClick={() => handleSort(col)}
    >
      {children}
      <SortIcon col={col} />
    </th>
  );

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
              className="px-2 py-1 text-xs border border-slate-300 rounded w-44 focus:ring-1 focus:ring-blue-400 focus:border-blue-400 outline-none"
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
            <span>{sortedRows.length}</span> filtrée{sortedRows.length > 1 ? "s" : ""}
            {" / "}
            <span>{rows.length}</span> total
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
                <ThSortable col="numero_client">N° client</ThSortable>
                <ThSortable col="item">ITEM</ThSortable>
                <ThSortable col="unite">UNITE</ThSortable>
                <ThSortable col="type_travaux">TYPE TRAV.</ThSortable>
                <ThSortable col="responsable">RESPONSABLE</ThSortable>
                <ThSortable col="operation">OPÉRATION</ThSortable>
                <ThSortable col="dn">DN</ThSortable>
                <ThSortable col="pn">PN</ThSortable>
              </tr>
            </thead>
            <tbody>
              {sortedRows.map((r) => {
                const checked = selectedIds.has(r.id);
                return (
                  <tr
                    key={r.id}
                    className={`border-b border-slate-100 cursor-pointer transition-colors ${
                      checked ? "bg-blue-50" : "hover:bg-slate-50"
                    }`}
                    onClick={() => toggleOne(r.id)}
                  >
                    <td className="px-2 py-1.5 text-center" onClick={(e) => e.stopPropagation()}>
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => toggleOne(r.id)}
                        className="rounded border-slate-300"
                      />
                    </td>
                    <td className="px-2 py-1.5 font-mono font-medium text-slate-900">
                      {getNumeroClient(r)}
                    </td>
                    <td className="px-2 py-1.5 text-slate-700">{r.ot_items?.item ?? ""}</td>
                    <td className="px-2 py-1.5">
                      <span className="px-1.5 py-0.5 bg-slate-100 rounded text-slate-600 text-[10px] font-medium">
                        {r.ot_items?.unite ?? ""}
                      </span>
                    </td>
                    <td className="px-2 py-1.5 text-slate-600">{r.ot_items?.type_travaux ?? ""}</td>
                    <td className="px-2 py-1.5 text-slate-700 font-medium">
                      {r.responsable ?? ""}
                    </td>
                    <td className="px-2 py-1.5 text-slate-600">{r.operation ?? ""}</td>
                    <td className="px-2 py-1.5 text-slate-600 tabular-nums">
                      {getRetenu(r.dn_emis, r.dn_buta)}
                    </td>
                    <td className="px-2 py-1.5 text-slate-600 tabular-nums">
                      {getRetenu(r.pn_emis, r.pn_buta)}
                    </td>
                  </tr>
                );
              })}
              {sortedRows.length === 0 && (
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
          <div className="flex items-center gap-3 px-4 py-3 border-t border-slate-200 bg-white shadow-[0_-1px_3px_rgba(0,0,0,0.05)]">
            <span className="text-sm text-slate-700">
              <span className="font-semibold">{selectedIds.size}</span> fiche
              {selectedIds.size > 1 ? "s" : ""}
              {" = "}
              <span className="font-semibold">{selectedIds.size * 2}</span> pages
            </span>
            <button
              onClick={handleGenerate}
              disabled={generating}
              className="ml-auto px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-wait transition-colors"
            >
              {generating ? "Génération..." : `Générer PDF (${selectedIds.size} fiches)`}
            </button>
          </div>
        )}
      </div>

      {/* ════ RIGHT: Template preview ════ */}
      <div className="w-[280px] shrink-0 border-l border-slate-200 bg-slate-50 flex flex-col overflow-hidden">
        <div className="px-3 py-2 border-b border-slate-200 bg-white">
          <h3 className="text-xs font-semibold text-slate-700">Aperçu template</h3>
          <p className="text-[10px] text-slate-400 mt-0.5">Mise en page des fiches PDF</p>
        </div>
        <div className="flex-1 overflow-auto p-3">
          <FichePreview template={template} />
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
        className="px-2 py-1 text-xs border border-slate-300 rounded bg-white focus:ring-1 focus:ring-blue-400 focus:border-blue-400 outline-none"
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
