"use client";

import { useState, useMemo } from "react";
import HeaderPreview from "./HeaderPreview";
import type { FileType } from "@/lib/excel/synonyms";
import { BUILTIN_SYNONYMS, JT_FIELD_LABELS, JT_FIELD_GROUPS } from "@/lib/excel/synonyms";

interface ColumnMatch {
  excelIndex: number;
  excelHeader: string;
  dbField: string | null;
  confidence: number;
}

interface SavedTemplate {
  id: string;
  name: string;
  columnMapping: Record<string, string>; // db_field → Excel header
  headerRow: number;
}

interface SuggestedTemplate extends SavedTemplate {
  similarity: number;
}

export interface DetectionResult {
  headerRow: number;
  headerConfidence: number;
  headers: string[];
  matched: ColumnMatch[];
  unmatched: ColumnMatch[];
  fingerprint: string;
  suggestedTemplate: SuggestedTemplate | null;
  savedTemplates?: SavedTemplate[];
  previewRows: unknown[][];
}

export interface ConfirmedMappingUI {
  fileType: FileType;
  headerRow: number;
  columnMap: Record<string, number>; // db_field → excel col index
  extraColumns: { index: number; header: string }[];
  primaryKeyField: string;
  fingerprint: string;
  templateName: string;
  headers: Record<number, string>; // colIndex → excel header original
}

interface MappingPreviewProps {
  fileType: FileType;
  detection: DetectionResult;
  onConfirm: (mapping: ConfirmedMappingUI) => void;
  onBack: () => void;
  importing?: boolean;
}

export default function MappingPreview({
  fileType,
  detection,
  onConfirm,
  onBack,
  importing = false,
}: MappingPreviewProps) {
  const primaryKeyField = fileType === "lut" ? "item" : "nom";
  const fileLabel = fileType === "lut" ? "LUT" : "J&T";

  // Liste des colonnes Excel disponibles
  const excelColumns = useMemo(
    () => [...detection.matched, ...detection.unmatched].filter((m) => m.excelHeader),
    [detection.matched, detection.unmatched],
  );

  // État du mapping : db_field → excelIndex | null
  const [fieldMap, setFieldMap] = useState<Record<string, number | null>>(() => {
    const map: Record<string, number | null> = {};
    for (const m of [...detection.matched, ...detection.unmatched]) {
      if (m.dbField) {
        map[m.dbField] = m.excelIndex;
      }
    }
    return map;
  });

  // Confidence par champ DB (pour le statut)
  const [confidenceMap, setConfidenceMap] = useState<Record<string, number>>(() => {
    const map: Record<string, number> = {};
    for (const m of [...detection.matched, ...detection.unmatched]) {
      if (m.dbField) {
        map[m.dbField] = m.confidence;
      }
    }
    return map;
  });

  const [templateName, setTemplateName] = useState("");
  const [headerRow, setHeaderRow] = useState(detection.headerRow);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>("");

  // Groupes de champs : J&T utilise JT_FIELD_GROUPS, LUT tombe en fallback plat
  const isJt = fileType === "jt";
  const allDbFields = Object.keys(BUILTIN_SYNONYMS[fileType]);
  const groups = isJt ? JT_FIELD_GROUPS : [{ label: "Tous les champs", fields: allDbFields }];

  // Templates sauvegardés
  const savedTemplates = detection.savedTemplates ?? [];

  // Colonnes Excel déjà assignées
  const usedExcelIndices = useMemo(() => {
    const set = new Set<number>();
    for (const idx of Object.values(fieldMap)) {
      if (idx !== null && idx !== undefined) set.add(idx);
    }
    return set;
  }, [fieldMap]);

  // Colonnes Excel non-mappées → extra
  const extraColumns = useMemo(
    () => excelColumns.filter((col) => !usedExcelIndices.has(col.excelIndex)),
    [excelColumns, usedExcelIndices],
  );

  // Appliquer un template sauvegardé
  function applyTemplate(template: SavedTemplate) {
    const newMap: Record<string, number | null> = {};
    const newConf: Record<string, number> = {};
    for (const [dbField, excelHeader] of Object.entries(template.columnMapping)) {
      const col = excelColumns.find((c) => c.excelHeader === excelHeader);
      if (col) {
        newMap[dbField] = col.excelIndex;
        newConf[dbField] = 0.95;
      }
    }
    setFieldMap(newMap);
    setConfidenceMap(newConf);
    setHeaderRow(template.headerRow);
  }

  // Sélection d'un template dans le dropdown
  function handleTemplateSelect(templateId: string) {
    setSelectedTemplateId(templateId);
    if (!templateId) return;
    const tpl = savedTemplates.find((t) => t.id === templateId);
    if (tpl) applyTemplate(tpl);
  }

  // Changer le mapping d'un champ DB
  function updateMapping(dbField: string, excelIndex: number | null) {
    setFieldMap((prev) => {
      const next = { ...prev };
      if (excelIndex !== null) {
        for (const [key, val] of Object.entries(next)) {
          if (val === excelIndex && key !== dbField) {
            next[key] = null;
          }
        }
      }
      next[dbField] = excelIndex;
      return next;
    });
  }

  // Confirmer le mapping
  function handleConfirm() {
    const columnMap: Record<string, number> = {};
    const extras: { index: number; header: string }[] = [];
    const headers: Record<number, string> = {};

    for (const col of excelColumns) {
      headers[col.excelIndex] = col.excelHeader;
    }

    for (const [dbField, excelIndex] of Object.entries(fieldMap)) {
      if (excelIndex !== null && excelIndex !== undefined) {
        columnMap[dbField] = excelIndex;
      }
    }

    for (const col of extraColumns) {
      extras.push({ index: col.excelIndex, header: col.excelHeader });
    }

    onConfirm({
      fileType,
      headerRow,
      columnMap,
      extraColumns: extras,
      primaryKeyField,
      fingerprint: detection.fingerprint,
      templateName,
      headers,
    });
  }

  // Stats
  const matchedCount = Object.entries(fieldMap).filter(
    ([, idx]) => idx !== null && idx !== undefined,
  ).length;
  const extraCount = extraColumns.length;
  const hasPrimaryKey =
    fieldMap[primaryKeyField] !== null && fieldMap[primaryKeyField] !== undefined;

  // Helper : label pour un champ DB
  function getLabel(dbField: string): string {
    if (isJt && JT_FIELD_LABELS[dbField]) return JT_FIELD_LABELS[dbField];
    return dbField.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
  }

  // Helper : statut d'un champ
  function getStatus(dbField: string): { color: string; label: string } {
    const idx = fieldMap[dbField];
    if (idx === null || idx === undefined) {
      return { color: "bg-mcm-warm-gray-bg text-mcm-warm-gray", label: "—" };
    }
    const conf = confidenceMap[dbField] ?? 1;
    if (conf >= 0.8) {
      return { color: "bg-mcm-teal-light text-mcm-teal", label: "OK" };
    }
    return { color: "bg-mcm-burnt-orange-light text-mcm-burnt-orange", label: "?" };
  }

  return (
    <div className="relative space-y-6">
      {/* Overlay de chargement pendant l'import */}
      {importing && (
        <div className="absolute inset-0 z-50 bg-white/80 backdrop-blur-sm rounded-2xl flex flex-col items-center justify-center gap-4">
          <svg className="animate-spin w-10 h-10 text-mcm-mustard" fill="none" viewBox="0 0 24 24">
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
            />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
            />
          </svg>
          <p className="text-lg font-semibold text-mcm-charcoal">Import {fileLabel} en cours...</p>
          <p className="text-sm text-mcm-warm-gray">
            Veuillez patienter, ne fermez pas cette page.
          </p>
        </div>
      )}

      {/* Template dropdown */}
      {savedTemplates.length > 0 && (
        <div className="flex items-center gap-4">
          <label className="text-sm font-medium text-mcm-charcoal shrink-0">
            Configuration enregistrée :
          </label>
          <select
            value={selectedTemplateId}
            onChange={(e) => handleTemplateSelect(e.target.value)}
            className="flex-1 px-3 py-1.5 border border-mcm-warm-gray-border rounded-lg text-sm bg-white"
          >
            <option value="">— Détection automatique —</option>
            {savedTemplates.map((tpl) => (
              <option key={tpl.id} value={tpl.id}>
                {tpl.name}
              </option>
            ))}
          </select>
        </div>
      )}

      {/* Header row selector */}
      <div className="flex items-center gap-4">
        <label className="text-sm font-medium text-mcm-charcoal">Ligne d&apos;en-tête :</label>
        <select
          value={headerRow}
          onChange={(e) => setHeaderRow(Number(e.target.value))}
          className="px-3 py-1.5 border border-mcm-warm-gray-border rounded-lg text-sm bg-white"
        >
          {Array.from({ length: 21 }, (_, i) => (
            <option key={i} value={i}>
              Ligne {i + 1} {i === detection.headerRow ? "(auto-détectée)" : ""}
            </option>
          ))}
        </select>
      </div>

      {/* Data preview */}
      <HeaderPreview
        headers={detection.headers}
        previewRows={detection.previewRows}
        headerRow={headerRow}
      />

      {/* Stats */}
      <div className="flex gap-4 text-sm">
        <span className="px-2.5 py-1 bg-mcm-teal-light text-mcm-teal rounded-md font-medium">
          {matchedCount} matchés
        </span>
        {extraCount > 0 && (
          <span className="px-2.5 py-1 bg-mcm-warm-gray-bg text-mcm-warm-gray rounded-md font-medium">
            {extraCount} extra
          </span>
        )}
      </div>

      {/* Mapping table — grouped by category */}
      <div className="border border-mcm-warm-gray-border rounded-lg overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-mcm-warm-gray-bg border-b border-mcm-warm-gray-border">
              <th className="px-3 py-2 text-left font-medium text-mcm-warm-gray">Champ</th>
              <th className="px-3 py-2 text-left font-medium text-mcm-warm-gray">Colonne Excel</th>
              <th className="px-3 py-2 text-center font-medium text-mcm-warm-gray w-20">Statut</th>
            </tr>
          </thead>
          <tbody>
            {groups.map((group) => (
              <GroupRows
                key={group.label}
                group={group}
                fieldMap={fieldMap}
                excelColumns={excelColumns}
                usedExcelIndices={usedExcelIndices}
                getLabel={getLabel}
                getStatus={getStatus}
                updateMapping={updateMapping}
              />
            ))}
          </tbody>
        </table>
      </div>

      {/* Extra columns section */}
      {extraCount > 0 && (
        <div className="border border-mcm-warm-gray-border rounded-lg overflow-hidden">
          <div className="px-3 py-2 bg-mcm-warm-gray-bg border-b border-mcm-warm-gray-border">
            <span className="text-xs font-semibold text-mcm-warm-gray uppercase tracking-wide">
              Colonnes extra ({extraCount}) — iront dans extra_columns
            </span>
          </div>
          <div className="px-3 py-2 flex flex-wrap gap-2">
            {extraColumns.map((col) => (
              <span
                key={col.excelIndex}
                className="px-2 py-1 bg-mcm-warm-gray-bg text-mcm-warm-gray text-xs rounded font-mono"
              >
                {col.excelHeader}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Template name */}
      <div>
        <label className="block text-sm font-medium text-mcm-charcoal mb-1.5">
          Sauvegarder le mapping comme template (optionnel)
        </label>
        <input
          type="text"
          value={templateName}
          onChange={(e) => setTemplateName(e.target.value)}
          placeholder="ex: Butachimie LUT standard"
          className="w-full px-3 py-2 border border-mcm-warm-gray-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-mcm-mustard"
        />
      </div>

      {/* Primary key warning */}
      {!hasPrimaryKey && (
        <div className="p-3 bg-mcm-terracotta-light border border-mcm-terracotta/20 rounded-lg">
          <p className="text-sm text-mcm-terracotta font-medium">
            Le champ clé &ldquo;{primaryKeyField}&rdquo; n&apos;est pas mappé. L&apos;import ne
            fonctionnera pas sans ce champ.
          </p>
        </div>
      )}

      {/* Actions */}
      <div className="flex gap-3 pt-2">
        <button
          onClick={onBack}
          disabled={importing}
          className="px-5 py-2.5 border border-mcm-warm-gray-border text-mcm-warm-gray rounded-lg hover:bg-mcm-warm-gray-bg transition-colors disabled:opacity-50"
        >
          Retour
        </button>
        <button
          onClick={handleConfirm}
          disabled={!hasPrimaryKey || importing}
          className="flex-1 px-5 py-2.5 bg-mcm-mustard text-white rounded-lg hover:bg-mcm-mustard-hover disabled:opacity-50 disabled:cursor-not-allowed font-medium transition-colors"
        >
          Confirmer et importer
        </button>
      </div>
    </div>
  );
}

/** Renders a group header + field rows */
function GroupRows({
  group,
  fieldMap,
  excelColumns,
  usedExcelIndices,
  getLabel,
  getStatus,
  updateMapping,
}: {
  group: { label: string; fields: string[] };
  fieldMap: Record<string, number | null>;
  excelColumns: { excelIndex: number; excelHeader: string }[];
  usedExcelIndices: Set<number>;
  getLabel: (f: string) => string;
  getStatus: (f: string) => { color: string; label: string };
  updateMapping: (dbField: string, excelIndex: number | null) => void;
}) {
  return (
    <>
      {/* Group header */}
      <tr className="bg-slate-50 border-b border-mcm-warm-gray-border/50">
        <td colSpan={3} className="px-3 py-1.5">
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
            {group.label}
          </span>
        </td>
      </tr>
      {/* Field rows */}
      {group.fields.map((dbField) => {
        const status = getStatus(dbField);
        const currentIdx = fieldMap[dbField];

        return (
          <tr
            key={dbField}
            className="border-b border-mcm-warm-gray-border/50 hover:bg-mcm-warm-gray-bg/50"
          >
            <td className="px-3 py-2 text-mcm-charcoal font-medium">{getLabel(dbField)}</td>
            <td className="px-3 py-2">
              <select
                value={currentIdx ?? ""}
                onChange={(e) => {
                  const val = e.target.value;
                  updateMapping(dbField, val === "" ? null : Number(val));
                }}
                className="w-full px-2 py-1 border border-mcm-warm-gray-border rounded text-sm bg-white"
              >
                <option value="">— Non mappé —</option>
                {excelColumns.map((col) => (
                  <option
                    key={col.excelIndex}
                    value={col.excelIndex}
                    disabled={usedExcelIndices.has(col.excelIndex) && currentIdx !== col.excelIndex}
                  >
                    {col.excelHeader}
                  </option>
                ))}
              </select>
            </td>
            <td className="px-3 py-2 text-center">
              <span className={`px-2 py-0.5 rounded text-xs font-medium ${status.color}`}>
                {status.label}
              </span>
            </td>
          </tr>
        );
      })}
    </>
  );
}
