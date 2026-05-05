"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";

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
  errors?: string[];
  file: string;
  filename: string;
}

interface Props {
  projectId: string;
  projectName: string;
  hasExistingLut: boolean;
}

type Step = "upload" | "mapping" | "confirm" | "done";

function colLetter(i: number): string {
  let r = "";
  let n = i;
  while (n >= 0) {
    r = String.fromCharCode(65 + (n % 26)) + r;
    n = Math.floor(n / 26) - 1;
  }
  return r;
}

export function GammesImportWizard({ projectId, projectName, hasExistingLut }: Props) {
  const router = useRouter();
  const [step, setStep] = useState<Step>("upload");
  const [file, setFile] = useState<File | null>(null);
  const [detectResult, setDetectResult] = useState<DetectResponse | null>(null);
  const [itemColIdx, setItemColIdx] = useState<number | null>(null);
  const [corpsColIdx, setCorpsColIdx] = useState<number | null>(null);
  const [titreColIdx, setTitreColIdx] = useState<number | null>(null);
  const [emisCorps, setEmisCorps] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<ConfirmResponse | null>(null);

  const headers = detectResult?.detection?.headers ?? [];

  // Liste des corps distincts dans la colonne actuellement choisie — recalculée à chaque
  // changement de `corpsColIdx`. Le serveur a renvoyé toutes les colonnes via `distinctValues`.
  const corpsList = useMemo<string[]>(() => {
    if (!detectResult || corpsColIdx === null) return [];
    return detectResult.distinctValues[corpsColIdx] ?? [];
  }, [detectResult, corpsColIdx]);

  // Étape 1 — Upload + détection
  async function handleUpload(e: React.FormEvent): Promise<void> {
    e.preventDefault();
    if (!file) return;
    setLoading(true);
    setError(null);
    try {
      const fd = new FormData();
      fd.append("file", file);
      fd.append("projectId", projectId);
      const res = await fetch("/api/import/gammes-detect", { method: "POST", body: fd });
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
      setStep("mapping");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur réseau");
    } finally {
      setLoading(false);
    }
  }

  // Étape 2 — Confirmation
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
      fd.append("projectId", projectId);
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
        setError(data.error ?? "Erreur d'import");
        return;
      }
      const r = data as ConfirmResponse;
      setResult(r);
      // Téléchargement automatique du .xlsx
      const blob = base64ToBlob(
        r.file,
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      );
      triggerDownload(blob, r.filename);
      setStep("done");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur réseau");
    } finally {
      setLoading(false);
    }
  }

  // Récap dynamique côté client (compte basé sur la sélection actuelle)
  const previewStats = useMemo(() => {
    const total = corpsList.length;
    const concerned = [...emisCorps].filter((c) => corpsList.includes(c)).length;
    return { totalCorps: total, selectedCorps: concerned };
  }, [corpsList, emisCorps]);

  return (
    <div className="space-y-6">
      {/* Stepper */}
      <ol className="flex items-center gap-2 text-sm">
        <StepBadge label="1. Upload" active={step === "upload"} done={step !== "upload"} />
        <span className="text-mcm-warm-gray-border">›</span>
        <StepBadge
          label="2. Mapping & corps EMIS"
          active={step === "mapping"}
          done={step === "confirm" || step === "done"}
        />
        <span className="text-mcm-warm-gray-border">›</span>
        <StepBadge
          label="3. Confirmation"
          active={step === "confirm" || step === "done"}
          done={step === "done"}
        />
      </ol>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800">
          {error}
        </div>
      )}

      {/* === Étape 1 === */}
      {step === "upload" && (
        <form onSubmit={handleUpload} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-mcm-charcoal mb-2">
              Fichier Gammes Compilées (.xlsx ou .xlsm)
            </label>
            <input
              type="file"
              accept=".xlsx,.xlsm"
              onChange={(e) => setFile(e.target.files?.[0] ?? null)}
              className="block w-full text-sm text-mcm-warm-gray file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:bg-mcm-mustard file:text-white file:font-medium hover:file:bg-mcm-mustard/90"
            />
          </div>
          {hasExistingLut && (
            <div className="rounded-lg border border-blue-200 bg-blue-50 p-3 text-sm text-blue-900">
              <strong>Mode export :</strong> ce projet a déjà une LUT importée. Le wizard{" "}
              <strong>ne touchera pas</strong> à la LUT actuelle — il génère uniquement le fichier{" "}
              <code>.xlsx</code> en téléchargement (utile comme livrable ou pour comparaison).
            </div>
          )}
          <button
            type="submit"
            disabled={!file || loading}
            className="px-4 py-2 bg-mcm-mustard text-white rounded-lg font-medium disabled:opacity-50 hover:bg-mcm-mustard/90 transition-colors"
          >
            {loading ? "Analyse en cours…" : "Analyser le fichier"}
          </button>
        </form>
      )}

      {/* === Étape 2 === */}
      {step === "mapping" && detectResult && (
        <div className="space-y-6">
          <div className="rounded-lg border border-mcm-warm-gray-border bg-white p-4 text-sm">
            <p>
              <strong>Feuille :</strong> {detectResult.selectedSheet} ·{" "}
              <strong>Ligne d&apos;en-tête :</strong>{" "}
              {detectResult.detection ? detectResult.detection.rowIdx + 1 : "non détectée"} ·{" "}
              <strong>Codes corps distincts :</strong>{" "}
              {corpsColIdx === null ? "—" : corpsList.length}
            </p>
          </div>

          <div className="grid gap-4 md:grid-cols-3">
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
                setEmisCorps(new Set()); // reset : la liste de corps change avec la colonne
              }}
              required
            />
            <ColumnSelect
              label="Titre de gamme (optionnel)"
              headers={headers}
              value={titreColIdx}
              onChange={setTitreColIdx}
            />
          </div>

          <div>
            <p className="text-sm font-medium text-mcm-charcoal mb-2">
              Corps de métier EMIS — coche ceux qui te concernent ({previewStats.selectedCorps} /{" "}
              {previewStats.totalCorps})
            </p>
            {corpsColIdx === null ? (
              <p className="text-sm text-mcm-warm-gray italic px-3 py-4 border border-dashed border-mcm-warm-gray-border rounded-lg bg-white">
                Sélectionne d&apos;abord la colonne &laquo; Corps de métier &raquo; ci-dessus pour
                afficher les codes disponibles.
              </p>
            ) : corpsList.length === 0 ? (
              <p className="text-sm text-orange-700 px-3 py-4 border border-orange-200 rounded-lg bg-orange-50">
                Aucune valeur trouvée dans cette colonne. Vérifie ton mapping.
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

          <div className="flex gap-3">
            <button
              onClick={() => setStep("upload")}
              className="px-4 py-2 border border-mcm-warm-gray-border text-mcm-warm-gray rounded-lg font-medium hover:bg-mcm-warm-gray-bg"
            >
              Retour
            </button>
            <button
              onClick={() => setStep("confirm")}
              disabled={itemColIdx === null || corpsColIdx === null || emisCorps.size === 0}
              className="px-4 py-2 bg-mcm-mustard text-white rounded-lg font-medium disabled:opacity-50 hover:bg-mcm-mustard/90"
            >
              Continuer
            </button>
          </div>
        </div>
      )}

      {/* === Étape 3 === */}
      {step === "confirm" && detectResult && (
        <div className="space-y-4">
          <div className="rounded-lg border border-mcm-warm-gray-border bg-white p-4">
            <h3 className="font-semibold text-mcm-charcoal mb-3">Récapitulatif</h3>
            <ul className="text-sm space-y-1 text-mcm-warm-gray">
              <li>
                Projet : <strong>{projectName}</strong>
              </li>
              <li>Feuille : {detectResult.selectedSheet}</li>
              <li>
                Corps EMIS sélectionnés ({emisCorps.size}) :{" "}
                <span className="font-mono">{[...emisCorps].sort().join(", ")}</span>
              </li>
              <li>Codes corps non sélectionnés (NC) : {corpsList.length - emisCorps.size}</li>
            </ul>
          </div>

          {hasExistingLut ? (
            <div className="rounded-lg border border-blue-200 bg-blue-50 p-3 text-sm text-blue-900">
              La LUT actuelle ne sera <strong>pas modifiée</strong>. Tu obtiens uniquement le
              fichier <code>.xlsx</code> en téléchargement.
            </div>
          ) : (
            <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-900">
              Les items vont être <strong>importés directement</strong> dans le projet et le fichier{" "}
              <code>.xlsx</code> sera téléchargé.
            </div>
          )}

          <div className="flex gap-3">
            <button
              onClick={() => setStep("mapping")}
              disabled={loading}
              className="px-4 py-2 border border-mcm-warm-gray-border text-mcm-warm-gray rounded-lg font-medium hover:bg-mcm-warm-gray-bg disabled:opacity-50"
            >
              Retour
            </button>
            <button
              onClick={handleConfirm}
              disabled={loading}
              className="px-4 py-2 bg-mcm-mustard text-white rounded-lg font-medium disabled:opacity-50 hover:bg-mcm-mustard/90"
            >
              {loading
                ? hasExistingLut
                  ? "Génération en cours…"
                  : "Construction en cours…"
                : hasExistingLut
                  ? "Télécharger le fichier"
                  : "Construire la LUT"}
            </button>
          </div>
        </div>
      )}

      {/* === Étape 4 — Done === */}
      {step === "done" && result && (
        <div className="space-y-4">
          <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-4">
            <h3 className="font-semibold text-emerald-900 mb-2">
              {result.mode === "build"
                ? "LUT construite avec succès"
                : "Fichier généré avec succès"}
            </h3>
            <ul className="text-sm space-y-1 text-emerald-800">
              {result.mode === "build" ? (
                <li>
                  Items insérés : <strong>{result.inserted}</strong> / {result.stats.totalItems}
                </li>
              ) : (
                <li>
                  Items dans le fichier : <strong>{result.stats.totalItems}</strong> (LUT du projet
                  inchangée)
                </li>
              )}
              <li>Concernés EMIS : {result.stats.concernedCount}</li>
              <li>Marqués NC : {result.stats.ncCount}</li>
            </ul>
            <p className="text-sm text-emerald-800 mt-3">
              Le fichier <code>{result.filename}</code> a été téléchargé.
            </p>
          </div>
          <div className="flex gap-3">
            {result.mode === "build" && (
              <button
                onClick={() => router.push(`/projets/${projectId}/lut`)}
                className="px-4 py-2 bg-mcm-mustard text-white rounded-lg font-medium hover:bg-mcm-mustard/90"
              >
                Voir la LUT
              </button>
            )}
            <button
              onClick={() => router.push(`/projets/${projectId}`)}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                result.mode === "export"
                  ? "bg-mcm-mustard text-white hover:bg-mcm-mustard/90"
                  : "border border-mcm-warm-gray-border text-mcm-warm-gray hover:bg-mcm-warm-gray-bg"
              }`}
            >
              Retour au projet
            </button>
          </div>
        </div>
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

interface StepBadgeProps {
  label: string;
  active: boolean;
  done: boolean;
}

function StepBadge({ label, active, done }: StepBadgeProps) {
  const cls = done
    ? "bg-emerald-100 text-emerald-800"
    : active
      ? "bg-mcm-mustard text-white"
      : "bg-mcm-warm-gray-bg text-mcm-warm-gray";
  return <span className={`px-3 py-1.5 rounded-full font-medium ${cls}`}>{label}</span>;
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
