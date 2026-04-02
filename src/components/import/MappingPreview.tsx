"use client";

import { useState } from "react";
import HeaderPreview from "./HeaderPreview";
import type { FileType } from "@/lib/excel/synonyms";
import { BUILTIN_SYNONYMS } from "@/lib/excel/synonyms";

interface ColumnMatch {
  excelIndex: number;
  excelHeader: string;
  dbField: string | null;
  confidence: number;
}

interface SuggestedTemplate {
  id: string;
  name: string;
  similarity: number;
  columnMapping: Record<string, string>;
  headerRow: number;
}

export interface DetectionResult {
  headerRow: number;
  headerConfidence: number;
  headers: string[];
  matched: ColumnMatch[];
  unmatched: ColumnMatch[];
  fingerprint: string;
  suggestedTemplate: SuggestedTemplate | null;
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
}

export default function MappingPreview({
  fileType,
  detection,
  onConfirm,
  onBack,
}: MappingPreviewProps) {
  const allDbFields = Object.keys(BUILTIN_SYNONYMS[fileType]);
  const primaryKeyField = fileType === "lut" ? "item" : "nom";

  // État du mapping : on commence avec les résultats de l'auto-détection
  const [mappings, setMappings] = useState<ColumnMatch[]>(() => [
    ...detection.matched,
    ...detection.unmatched,
  ]);
  const [templateName, setTemplateName] = useState("");
  const [headerRow, setHeaderRow] = useState(detection.headerRow);
  const [useTemplate, setUseTemplate] = useState(false);

  // Appliquer un template suggéré
  function applyTemplate(template: SuggestedTemplate) {
    const newMappings = mappings.map((m) => {
      // Chercher dans le template si cet en-tête Excel est mappé
      for (const [dbField, excelHeader] of Object.entries(template.columnMapping)) {
        if (excelHeader === m.excelHeader || dbField === m.excelHeader) {
          return { ...m, dbField, confidence: 0.95 };
        }
      }
      return m;
    });
    setMappings(newMappings);
    setHeaderRow(template.headerRow);
    setUseTemplate(true);
  }

  // Changer le mapping d'une colonne
  function updateMapping(excelIndex: number, newDbField: string | null) {
    setMappings((prev) =>
      prev.map((m) => {
        if (m.excelIndex === excelIndex) {
          return { ...m, dbField: newDbField, confidence: newDbField ? 1.0 : 0 };
        }
        // Si le champ DB est déjà utilisé par une autre colonne, le libérer
        if (newDbField && m.dbField === newDbField) {
          return { ...m, dbField: null, confidence: 0 };
        }
        return m;
      }),
    );
  }

  // Colonnes utilisées
  const usedFields = new Set(mappings.filter((m) => m.dbField).map((m) => m.dbField!));

  // Confirmer le mapping
  function handleConfirm() {
    const columnMap: Record<string, number> = {};
    const extraColumns: { index: number; header: string }[] = [];
    const headers: Record<number, string> = {};

    for (const m of mappings) {
      if (!m.excelHeader) continue; // skip empty headers
      headers[m.excelIndex] = m.excelHeader;
      if (m.dbField) {
        columnMap[m.dbField] = m.excelIndex;
      } else {
        extraColumns.push({ index: m.excelIndex, header: m.excelHeader });
      }
    }

    onConfirm({
      fileType,
      headerRow,
      columnMap,
      extraColumns,
      primaryKeyField,
      fingerprint: detection.fingerprint,
      templateName,
      headers,
    });
  }

  // Stats
  const matchedCount = mappings.filter((m) => m.dbField && m.confidence >= 0.8).length;
  const warningCount = mappings.filter(
    (m) => m.dbField && m.confidence < 0.8 && m.confidence > 0,
  ).length;
  const extraCount = mappings.filter((m) => !m.dbField && m.excelHeader).length;
  const hasPrimaryKey = usedFields.has(primaryKeyField);

  return (
    <div className="space-y-6">
      {/* Template suggestion banner */}
      {detection.suggestedTemplate && !useTemplate && (
        <div className="p-4 bg-mcm-mustard-50 border border-mcm-mustard/20 rounded-xl flex items-center justify-between">
          <div>
            <p className="font-medium text-mcm-mustard-hover">
              Template &ldquo;{detection.suggestedTemplate.name}&rdquo; correspond (
              {Math.round(detection.suggestedTemplate.similarity * 100)}%)
            </p>
            <p className="text-sm text-mcm-mustard mt-0.5">
              Appliquer pour pré-remplir le mapping automatiquement.
            </p>
          </div>
          <button
            onClick={() => applyTemplate(detection.suggestedTemplate!)}
            className="px-4 py-2 bg-mcm-mustard text-white rounded-lg hover:bg-mcm-mustard-hover text-sm font-medium"
          >
            Appliquer
          </button>
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
        {warningCount > 0 && (
          <span className="px-2.5 py-1 bg-mcm-burnt-orange-light text-mcm-burnt-orange rounded-md font-medium">
            {warningCount} suggestions
          </span>
        )}
        {extraCount > 0 && (
          <span className="px-2.5 py-1 bg-mcm-warm-gray-bg text-mcm-warm-gray rounded-md font-medium">
            {extraCount} extra
          </span>
        )}
      </div>

      {/* Mapping table */}
      <div className="border border-mcm-warm-gray-border rounded-lg overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-mcm-warm-gray-bg border-b border-mcm-warm-gray-border">
              <th className="px-3 py-2 text-left font-medium text-mcm-warm-gray">Colonne Excel</th>
              <th className="px-3 py-2 text-left font-medium text-mcm-warm-gray">
                Champ base de données
              </th>
              <th className="px-3 py-2 text-center font-medium text-mcm-warm-gray w-20">Statut</th>
            </tr>
          </thead>
          <tbody>
            {mappings
              .filter((m) => m.excelHeader) // skip empty headers
              .map((m) => {
                let statusColor = "bg-mcm-warm-gray-bg text-mcm-warm-gray"; // extra
                let statusLabel = "Extra";
                if (m.dbField && m.confidence >= 0.8) {
                  statusColor = "bg-mcm-teal-light text-mcm-teal";
                  statusLabel = "OK";
                } else if (m.dbField && m.confidence > 0) {
                  statusColor = "bg-mcm-burnt-orange-light text-mcm-burnt-orange";
                  statusLabel = "?";
                }

                return (
                  <tr
                    key={m.excelIndex}
                    className="border-b border-mcm-warm-gray-border/50 hover:bg-mcm-warm-gray-bg/50"
                  >
                    <td className="px-3 py-2 font-mono text-mcm-charcoal">{m.excelHeader}</td>
                    <td className="px-3 py-2">
                      <select
                        value={m.dbField ?? ""}
                        onChange={(e) => updateMapping(m.excelIndex, e.target.value || null)}
                        className="w-full px-2 py-1 border border-mcm-warm-gray-border rounded text-sm bg-white"
                      >
                        <option value="">— Colonne extra —</option>
                        {allDbFields.map((f) => (
                          <option key={f} value={f} disabled={usedFields.has(f) && m.dbField !== f}>
                            {f}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td className="px-3 py-2 text-center">
                      <span className={`px-2 py-0.5 rounded text-xs font-medium ${statusColor}`}>
                        {statusLabel}
                      </span>
                    </td>
                  </tr>
                );
              })}
          </tbody>
        </table>
      </div>

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
          className="px-5 py-2.5 border border-mcm-warm-gray-border text-mcm-warm-gray rounded-lg hover:bg-mcm-warm-gray-bg transition-colors"
        >
          Retour
        </button>
        <button
          onClick={handleConfirm}
          disabled={!hasPrimaryKey}
          className="flex-1 px-5 py-2.5 bg-mcm-mustard text-white rounded-lg hover:bg-mcm-mustard-hover disabled:opacity-50 disabled:cursor-not-allowed font-medium transition-colors"
        >
          Confirmer et importer
        </button>
      </div>
    </div>
  );
}
