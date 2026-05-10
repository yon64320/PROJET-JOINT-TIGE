"use client";

/**
 * Variante du flux Gammes utilisée à la création de projet depuis
 * `/projets/import` : pas de projectId existant, on passe `projectName`/`client`
 * et l'API crée le projet avant d'insérer la LUT. À la fin, on télécharge le
 * .xlsx puis on délègue au parent via `onSuccess(projectId)` pour enchaîner
 * sur l'import J&T.
 *
 * Distinct de GammesImportWizard (qui sert sur /projets/[id]/import-gammes)
 * pour ne pas mélanger les modes (build sur projet existant, export, build à
 * la création) — chaque chemin garde une UX dédiée.
 */

import { useMemo, useState } from "react";

interface SheetInfo {
  name: string;
  rowCount: number;
  colCount: number;
}

interface DetectionResult {
  rowIdx: number;
  headers: string[];
  confidence: number;
}

interface DetectResponse {
  sheets: SheetInfo[];
  selectedSheet: string;
  detection: DetectionResult | null;
  preselect: { itemColIdx: number | null; corpsColIdx: number | null; titreColIdx: number | null };
  distinctValues: Record<number, string[]>;
  hasExistingLut: boolean;
}

interface ConfirmResponse {
  success: boolean;
  mode: "build" | "export";
  stats: { totalItems: number; concernedCount: number; ncCount: number };
  inserted: number;
  projectId: string;
  errors?: string[];
  file: string;
  filename: string;
}

interface Props {
  projectName: string;
  client: string;
  onSuccess: (result: { projectId: string; inserted: number; total: number }) => void;
  onBack: () => void;
}

type SubStep = "upload" | "mapping";

function colLetter(i: number): string {
  let r = "";
  let n = i;
  while (n >= 0) {
    r = String.fromCharCode(65 + (n % 26)) + r;
    n = Math.floor(n / 26) - 1;
  }
  return r;
}

export function GammesNewProjectFlow({ projectName, client, onSuccess, onBack }: Props) {
  const [subStep, setSubStep] = useState<SubStep>("upload");
  const [file, setFile] = useState<File | null>(null);
  const [detectResult, setDetectResult] = useState<DetectResponse | null>(null);
  const [itemColIdx, setItemColIdx] = useState<number | null>(null);
  const [corpsColIdx, setCorpsColIdx] = useState<number | null>(null);
  const [titreColIdx, setTitreColIdx] = useState<number | null>(null);
  const [emisCorps, setEmisCorps] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const headers = detectResult?.detection?.headers ?? [];
  const corpsList = useMemo<string[]>(() => {
    if (!detectResult || corpsColIdx === null) return [];
    return detectResult.distinctValues[corpsColIdx] ?? [];
  }, [detectResult, corpsColIdx]);

  async function handleAnalyze(): Promise<void> {
    if (!file) return;
    setLoading(true);
    setError(null);
    try {
      // gammes-detect accepte projectId optionnel : sans projectId, il analyse
      // juste la structure du fichier (pas d'ownership check). La création de
      // projet a lieu côté gammes-confirm.
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch("/api/import/gammes-detect", {
        method: "POST",
        body: fd,
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Erreur de détection");
        return;
      }
      const r = data as DetectResponse;
      setDetectResult(r);
      setItemColIdx(r.preselect.itemColIdx);
      setCorpsColIdx(r.preselect.corpsColIdx);
      setTitreColIdx(r.preselect.titreColIdx);
      setSubStep("mapping");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur réseau");
    } finally {
      setLoading(false);
    }
  }

  async function handleConfirm(): Promise<void> {
    if (!file || !detectResult || itemColIdx === null || corpsColIdx === null) return;
    if (emisCorps.size === 0) {
      setError("Sélectionne au moins un corps de métier EMIS");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const fd = new FormData();
      fd.append("file", file);
      fd.append("projectName", projectName);
      fd.append("client", client);
      fd.append(
        "mapping",
        JSON.stringify({
          sheetName: detectResult.selectedSheet,
          headerRowIdx: detectResult.detection?.rowIdx ?? 0,
          itemColIdx,
          corpsColIdx,
          titreColIdx,
        }),
      );
      fd.append("corpsEmis", JSON.stringify([...emisCorps]));
      const res = await fetch("/api/import/gammes-confirm", { method: "POST", body: fd });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Erreur de construction");
        return;
      }
      const r = data as ConfirmResponse;
      const blob = base64ToBlob(
        r.file,
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      );
      triggerDownload(blob, r.filename);
      onSuccess({
        projectId: r.projectId,
        inserted: r.inserted,
        total: r.stats.totalItems,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur réseau");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-5">
      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800">
          {error}
        </div>
      )}

      {subStep === "upload" && (
        <>
          <div className="rounded-lg bg-mcm-mustard-light/40 border border-mcm-mustard/20 p-3 text-sm text-mcm-charcoal">
            Upload du fichier <strong>Gammes Compilées</strong>. La LUT sera construite
            automatiquement à partir des phases puis importée dans le projet
            <strong> {projectName}</strong>.
          </div>
          <div>
            <label className="block text-sm font-medium text-mcm-charcoal mb-1.5">
              Fichier Gammes Compilées
            </label>
            <div className="border-2 border-dashed border-mcm-warm-gray-border rounded-xl p-6 text-center hover:border-mcm-mustard transition-colors">
              <input
                type="file"
                accept=".xlsx,.xlsm"
                onChange={(e) => setFile(e.target.files?.[0] ?? null)}
                className="w-full text-sm text-mcm-warm-gray file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:bg-mcm-mustard file:text-white file:cursor-pointer file:hover:bg-mcm-mustard-hover file:transition-colors"
              />
              <p className="text-xs text-mcm-warm-gray-light mt-2">.xlsx ou .xlsm</p>
            </div>
          </div>
          <div className="flex gap-3 pt-2">
            <button
              onClick={onBack}
              disabled={loading}
              className="px-5 py-2.5 border border-mcm-warm-gray-border text-mcm-warm-gray rounded-lg hover:bg-mcm-warm-gray-bg transition-colors disabled:opacity-50"
            >
              Retour
            </button>
            <button
              onClick={handleAnalyze}
              disabled={!file || loading}
              className="flex-1 px-5 py-2.5 bg-mcm-mustard text-white rounded-lg hover:bg-mcm-mustard-hover disabled:opacity-50 disabled:cursor-not-allowed font-medium transition-colors"
            >
              {loading ? "Analyse en cours..." : "Analyser le fichier"}
            </button>
          </div>
        </>
      )}

      {subStep === "mapping" && detectResult && (
        <>
          <div className="rounded-lg border border-mcm-warm-gray-border bg-white p-3 text-sm">
            <strong>Feuille :</strong> {detectResult.selectedSheet} · <strong>En-tête ligne</strong>{" "}
            {detectResult.detection ? detectResult.detection.rowIdx + 1 : "?"} ·{" "}
            <strong>Codes corps :</strong> {corpsList.length}
          </div>

          <div className="grid gap-3 md:grid-cols-3">
            <ColumnSelect
              label="ITEM (obligatoire)"
              headers={headers}
              value={itemColIdx}
              onChange={setItemColIdx}
              required
            />
            <ColumnSelect
              label="Corps de métier (obligatoire)"
              headers={headers}
              value={corpsColIdx}
              onChange={(v) => {
                setCorpsColIdx(v);
                setEmisCorps(new Set());
              }}
              required
            />
            <ColumnSelect
              label="Titre de gamme"
              headers={headers}
              value={titreColIdx}
              onChange={setTitreColIdx}
            />
          </div>

          <div>
            <p className="text-sm font-medium text-mcm-charcoal mb-2">
              Corps de métier EMIS — coche ceux qui te concernent ({emisCorps.size} /{" "}
              {corpsList.length})
            </p>
            {corpsColIdx === null ? (
              <p className="text-sm text-mcm-warm-gray italic px-3 py-4 border border-dashed border-mcm-warm-gray-border rounded-lg bg-white">
                Sélectionne d&apos;abord la colonne « Corps de métier ».
              </p>
            ) : corpsList.length === 0 ? (
              <p className="text-sm text-orange-700 px-3 py-4 border border-orange-200 rounded-lg bg-orange-50">
                Aucune valeur dans cette colonne — vérifie ton mapping.
              </p>
            ) : (
              <div className="grid grid-cols-3 sm:grid-cols-5 md:grid-cols-7 gap-2 max-h-64 overflow-y-auto p-3 border border-mcm-warm-gray-border rounded-lg bg-white">
                {corpsList.map((c) => (
                  <label
                    key={c}
                    className="flex items-center gap-2 text-sm cursor-pointer hover:bg-mcm-warm-gray-bg px-2 py-1 rounded"
                  >
                    <input
                      type="checkbox"
                      checked={emisCorps.has(c)}
                      onChange={(e) => {
                        const next = new Set(emisCorps);
                        if (e.target.checked) next.add(c);
                        else next.delete(c);
                        setEmisCorps(next);
                      }}
                    />
                    <span className="font-mono">{c}</span>
                  </label>
                ))}
              </div>
            )}
          </div>

          <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-900">
            La LUT sera <strong>importée directement</strong> dans le projet « {projectName} » et le
            fichier <code>.xlsx</code> sera téléchargé.
          </div>

          <div className="flex gap-3 pt-2">
            <button
              onClick={() => setSubStep("upload")}
              disabled={loading}
              className="px-5 py-2.5 border border-mcm-warm-gray-border text-mcm-warm-gray rounded-lg hover:bg-mcm-warm-gray-bg transition-colors disabled:opacity-50"
            >
              Retour
            </button>
            <button
              onClick={handleConfirm}
              disabled={
                loading || itemColIdx === null || corpsColIdx === null || emisCorps.size === 0
              }
              className="flex-1 px-5 py-2.5 bg-mcm-mustard text-white rounded-lg hover:bg-mcm-mustard-hover disabled:opacity-50 disabled:cursor-not-allowed font-medium transition-colors"
            >
              {loading ? "Construction en cours..." : "Construire la LUT"}
            </button>
          </div>
        </>
      )}
    </div>
  );
}

interface ColumnSelectProps {
  label: string;
  headers: readonly string[];
  value: number | null;
  onChange: (v: number | null) => void;
  required?: boolean;
}

function ColumnSelect({ label, headers, value, onChange, required }: ColumnSelectProps) {
  return (
    <div>
      <label className="block text-sm font-medium text-mcm-charcoal mb-2">{label}</label>
      <select
        value={value ?? ""}
        onChange={(e) => onChange(e.target.value === "" ? null : Number(e.target.value))}
        className="w-full px-3 py-2 border border-mcm-warm-gray-border rounded-lg text-sm bg-white"
      >
        {!required && <option value="">— Aucune —</option>}
        {required && value === null && <option value="">— Choisir —</option>}
        {headers.map((h, i) => (
          <option key={i} value={i}>
            {colLetter(i)} — {h || "(vide)"}
          </option>
        ))}
      </select>
    </div>
  );
}

function base64ToBlob(b64: string, mime: string): Blob {
  const bin = globalThis.atob(b64);
  const len = bin.length;
  const buf = new Uint8Array(len);
  for (let i = 0; i < len; i++) buf[i] = bin.charCodeAt(i);
  return new Blob([buf], { type: mime });
}

function triggerDownload(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
