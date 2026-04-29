"use client";

import { useState, useRef, useEffect, Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import MappingPreview from "@/components/import/MappingPreview";
import type { DetectionResult, ConfirmedMappingUI } from "@/components/import/MappingPreview";

type ImportStep = "choose" | "lut-upload" | "lut-mapping" | "jt-upload" | "jt-mapping" | "done";

interface ImportResult {
  type: string;
  projectId: string;
  parsed: number;
  inserted: number;
  skipped?: number;
  archived?: number;
  errors: string[];
}

interface Project {
  id: string;
  name: string;
  client: string;
}

function ImportPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const lockedProjectId = searchParams.get("projectId");

  const [step, setStep] = useState<ImportStep>(lockedProjectId ? "lut-upload" : "choose");
  const [mode, setMode] = useState<"new" | "existing">(lockedProjectId ? "existing" : "new");
  const [projectName, setProjectName] = useState("");
  const [client, setClient] = useState("");
  const [projectId, setProjectId] = useState<string | null>(lockedProjectId);
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(false);
  const [lutResult, setLutResult] = useState<ImportResult | null>(null);
  const [jtResult, setJtResult] = useState<ImportResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [detection, setDetection] = useState<DetectionResult | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  // Store the file for the mapping step (detect → confirm uses the same file)
  const [pendingFile, setPendingFile] = useState<File | null>(null);

  useEffect(() => {
    const loadProjects = async () => {
      try {
        const res = await fetch("/api/projects");
        if (res.ok) {
          const data = await res.json();
          setProjects(data);
        }
      } catch {
        /* ignore */
      }
    };
    loadProjects();
  }, []);

  /** Étape 1: Upload → Détection automatique */
  async function handleDetect(fileType: "lut" | "jt") {
    const file = fileInputRef.current?.files?.[0];
    if (!file) {
      setError("Sélectionnez un fichier Excel");
      return;
    }

    if (fileType === "lut" && mode === "new" && (!projectName.trim() || !client.trim())) {
      setError("Nom du projet et client requis");
      return;
    }

    setLoading(true);
    setError(null);

    const formData = new FormData();
    formData.append("file", file);
    formData.append("fileType", fileType);

    try {
      const res = await fetch("/api/import/detect", { method: "POST", body: formData });
      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Erreur détection");
        return;
      }

      setDetection(data);
      setPendingFile(file);
      setStep(fileType === "lut" ? "lut-mapping" : "jt-mapping");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur réseau");
    } finally {
      setLoading(false);
    }
  }

  /** Étape 2: Confirmation du mapping → Import */
  async function handleConfirmMapping(mapping: ConfirmedMappingUI) {
    if (!pendingFile) {
      setError("Fichier perdu, veuillez recommencer");
      return;
    }

    setLoading(true);
    setError(null);

    const formData = new FormData();
    formData.append("file", pendingFile);
    formData.append(
      "confirmedMapping",
      JSON.stringify({
        fileType: mapping.fileType,
        headerRow: mapping.headerRow,
        columnMap: mapping.columnMap,
        extraColumns: mapping.extraColumns,
        primaryKeyField: mapping.primaryKeyField,
        headers: mapping.headers,
      }),
    );
    formData.append("fingerprint", mapping.fingerprint);

    if (mapping.templateName) {
      formData.append("templateName", mapping.templateName);
    }

    if (mapping.fileType === "lut") {
      if (mode === "existing" && projectId) {
        formData.append("projectId", projectId);
      } else if (mode === "new") {
        formData.append("projectName", projectName.trim());
        formData.append("client", client.trim());
      }
    } else if (mapping.fileType === "jt" && projectId) {
      formData.append("projectId", projectId);
      formData.append("reimport", "true");
    }

    // Phase B — Avertissement photos terrain avant ré-import J&T
    if (mapping.fileType === "jt" && projectId) {
      try {
        const previewFd = new FormData();
        previewFd.append("file", pendingFile);
        previewFd.append("confirmedMapping", formData.get("confirmedMapping") as string);
        previewFd.append("projectId", projectId);
        const previewRes = await fetch("/api/import/jt-reimport-preview", {
          method: "POST",
          body: previewFd,
        });
        if (previewRes.ok) {
          const preview = (await previewRes.json()) as {
            will_reattach: number;
            will_orphan: number;
            total_photos: number;
          };
          if (preview.total_photos > 0) {
            const msg =
              `Ce ré-import affecte ${preview.total_photos} photo${preview.total_photos > 1 ? "s" : ""} terrain :\n\n` +
              `• ${preview.will_reattach} sera/seront ré-attachée${preview.will_reattach > 1 ? "s" : ""} aux nouvelles brides correspondantes (clé naturelle item + repère)\n` +
              `• ${preview.will_orphan} restera/resteront orphelin${preview.will_orphan > 1 ? "es" : "e"} (bride absente du nouveau J&T)\n\n` +
              `Confirmer le ré-import ?`;
            if (!confirm(msg)) {
              setLoading(false);
              return;
            }
          }
        }
      } catch {
        // Preview en best-effort — si elle plante, on laisse passer
      }
    }

    try {
      const res = await fetch("/api/import/confirm", { method: "POST", body: formData });
      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Erreur import");
        return;
      }

      if (mapping.fileType === "lut") {
        setLutResult(data);
        setProjectId(data.projectId);
        setDetection(null);
        setPendingFile(null);
        setStep("jt-upload");
        if (fileInputRef.current) fileInputRef.current.value = "";
      } else {
        setJtResult(data);
        setStep("done");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur réseau");
    } finally {
      setLoading(false);
    }
  }

  const steps = [
    { key: "choose", label: "Mode" },
    { key: "lut", label: "LUT" },
    { key: "jt", label: "J&T" },
    { key: "done", label: "Terminé" },
  ];

  // Map internal steps to stepper position
  const stepperIdx =
    step === "choose"
      ? 0
      : step === "lut-upload" || step === "lut-mapping"
        ? 1
        : step === "jt-upload" || step === "jt-mapping"
          ? 2
          : 3;

  return (
    <main className="min-h-screen bg-gradient-to-br from-mcm-cream to-mcm-mustard-50">
      <div className="max-w-3xl mx-auto px-6 py-10 animate-fade-in">
        <div className="flex items-center gap-3 animate-slide-in">
          <a href="/projets" className="flex items-center gap-2">
            <div className="w-7 h-7 bg-mcm-mustard rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-xs">E</span>
            </div>
          </a>
          <Link
            href="/projets"
            className="inline-flex items-center gap-1 text-sm text-mcm-mustard hover:text-mcm-mustard-hover transition-colors"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M15 19l-7-7 7-7"
              />
            </svg>
            Projets
          </Link>
        </div>

        <h1 className="text-3xl font-bold mt-4 mb-2 text-mcm-charcoal">Importer un arrêt</h1>
        <p className="text-mcm-warm-gray mb-8">
          Importez la LUT puis le J&amp;T. L&apos;app détecte automatiquement la structure de vos
          fichiers.
        </p>

        {/* Stepper */}
        <div className="flex items-center gap-1 mb-10">
          {steps.map((s, i) => {
            const isActive = i === stepperIdx;
            const isPast = i < stepperIdx;
            return (
              <div key={s.key} className="flex items-center gap-1 flex-1">
                {i > 0 && (
                  <div
                    className={`flex-1 h-0.5 rounded ${isPast ? "bg-mcm-teal" : "bg-mcm-warm-gray-border"}`}
                  />
                )}
                <div className="flex flex-col items-center gap-1">
                  <div
                    className={`w-9 h-9 rounded-full flex items-center justify-center text-sm font-semibold transition-all ${
                      isActive
                        ? "bg-mcm-mustard text-white shadow-lg shadow-mcm-mustard/30"
                        : isPast
                          ? "bg-mcm-teal text-white"
                          : "bg-mcm-warm-gray-bg text-mcm-warm-gray-light"
                    }`}
                  >
                    {isPast ? (
                      <svg
                        className="w-4 h-4"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={3}
                          d="M5 13l4 4L19 7"
                        />
                      </svg>
                    ) : (
                      i + 1
                    )}
                  </div>
                  <span
                    className={`text-xs ${isActive ? "text-mcm-mustard font-semibold" : "text-mcm-warm-gray-light"}`}
                  >
                    {s.label}
                  </span>
                </div>
              </div>
            );
          })}
        </div>

        {/* Card */}
        <div className="bg-mcm-warm-white rounded-2xl shadow-sm border border-mcm-warm-gray-border p-8">
          {/* Step: Choose mode */}
          {step === "choose" && (
            <div className="space-y-6">
              <h2 className="text-xl font-semibold text-mcm-charcoal">
                Comment souhaitez-vous importer ?
              </h2>

              <div className="grid grid-cols-2 gap-4">
                <button
                  onClick={() => {
                    setMode("new");
                    setStep("lut-upload");
                  }}
                  className="p-6 border-2 border-mcm-warm-gray-border rounded-xl hover:border-mcm-mustard hover:bg-mcm-mustard-50 transition-all text-left group"
                >
                  <div className="w-10 h-10 bg-mcm-mustard-light rounded-lg flex items-center justify-center mb-3 group-hover:bg-mcm-mustard/20 transition-colors">
                    <svg
                      className="w-5 h-5 text-mcm-mustard"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M12 4v16m8-8H4"
                      />
                    </svg>
                  </div>
                  <p className="font-semibold text-mcm-charcoal">Nouveau projet</p>
                  <p className="text-sm text-mcm-warm-gray mt-1">Créer un arrêt depuis zéro</p>
                </button>

                <button
                  onClick={() => {
                    setMode("existing");
                    setStep("lut-upload");
                  }}
                  disabled={projects.length === 0}
                  className="p-6 border-2 border-mcm-warm-gray-border rounded-xl hover:border-mcm-burnt-orange hover:bg-mcm-burnt-orange-light/50 transition-all text-left group disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  <div className="w-10 h-10 bg-mcm-burnt-orange-light rounded-lg flex items-center justify-center mb-3 group-hover:bg-mcm-burnt-orange/20 transition-colors">
                    <svg
                      className="w-5 h-5 text-mcm-burnt-orange"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                      />
                    </svg>
                  </div>
                  <p className="font-semibold text-mcm-charcoal">Ré-importer</p>
                  <p className="text-sm text-mcm-warm-gray mt-1">
                    Mettre à jour un projet existant
                  </p>
                </button>
              </div>
            </div>
          )}

          {/* Step: LUT Upload */}
          {step === "lut-upload" && (
            <div className="space-y-5">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-mcm-mustard-light rounded-lg flex items-center justify-center">
                  <span className="text-mcm-mustard font-bold text-sm">1</span>
                </div>
                <h2 className="text-xl font-semibold text-mcm-charcoal">
                  {mode === "existing" ? "Ré-importer la LUT" : "Importer la LUT"}
                </h2>
              </div>

              {mode === "existing" && !lockedProjectId && (
                <div>
                  <label className="block text-sm font-medium text-mcm-charcoal mb-1.5">
                    Projet existant
                  </label>
                  <select
                    value={projectId ?? ""}
                    onChange={(e) => setProjectId(e.target.value)}
                    className="w-full px-3 py-2.5 border border-mcm-warm-gray-border rounded-lg focus:outline-none focus:ring-2 focus:ring-mcm-mustard bg-white"
                  >
                    <option value="">Sélectionner un projet...</option>
                    {projects.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name} — {p.client}
                      </option>
                    ))}
                  </select>
                  <p className="text-xs text-mcm-burnt-orange mt-1.5">
                    Les anciennes données LUT et J&amp;T seront archivées automatiquement.
                  </p>
                </div>
              )}

              {mode === "existing" && lockedProjectId && (
                <div className="p-3 bg-mcm-burnt-orange-light/40 border border-mcm-burnt-orange/20 rounded-lg">
                  <p className="text-sm text-mcm-burnt-orange">
                    Les anciennes données LUT et J&amp;T de ce projet seront archivées
                    automatiquement.
                  </p>
                </div>
              )}

              {mode === "new" && (
                <>
                  <div>
                    <label className="block text-sm font-medium text-mcm-charcoal mb-1.5">
                      Nom du projet
                    </label>
                    <input
                      type="text"
                      value={projectName}
                      onChange={(e) => setProjectName(e.target.value)}
                      placeholder="ex: Butachimie 2026"
                      className="w-full px-3 py-2.5 border border-mcm-warm-gray-border rounded-lg focus:outline-none focus:ring-2 focus:ring-mcm-mustard"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-mcm-charcoal mb-1.5">
                      Client
                    </label>
                    <input
                      type="text"
                      value={client}
                      onChange={(e) => setClient(e.target.value)}
                      placeholder="ex: Butachimie"
                      className="w-full px-3 py-2.5 border border-mcm-warm-gray-border rounded-lg focus:outline-none focus:ring-2 focus:ring-mcm-mustard"
                    />
                  </div>
                </>
              )}

              <div>
                <label className="block text-sm font-medium text-mcm-charcoal mb-1.5">
                  Fichier LUT
                </label>
                <div className="border-2 border-dashed border-mcm-warm-gray-border rounded-xl p-6 text-center hover:border-mcm-mustard transition-colors">
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".xlsm,.xlsx"
                    className="w-full text-sm text-mcm-warm-gray file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:bg-mcm-mustard file:text-white file:cursor-pointer file:hover:bg-mcm-mustard-hover file:transition-colors"
                  />
                  <p className="text-xs text-mcm-warm-gray-light mt-2">.xlsm ou .xlsx</p>
                </div>
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  onClick={() => {
                    if (lockedProjectId) {
                      router.push(`/projets/${lockedProjectId}`);
                    } else {
                      setStep("choose");
                    }
                  }}
                  className="px-5 py-2.5 border border-mcm-warm-gray-border text-mcm-warm-gray rounded-lg hover:bg-mcm-warm-gray-bg transition-colors"
                >
                  Retour
                </button>
                <button
                  onClick={() => handleDetect("lut")}
                  disabled={loading || (mode === "existing" && !projectId)}
                  className="flex-1 px-5 py-2.5 bg-mcm-mustard text-white rounded-lg hover:bg-mcm-mustard-hover disabled:opacity-50 disabled:cursor-not-allowed font-medium transition-colors"
                >
                  {loading ? (
                    <span className="flex items-center justify-center gap-2">
                      <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
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
                      Analyse en cours...
                    </span>
                  ) : (
                    "Analyser le fichier"
                  )}
                </button>
              </div>
            </div>
          )}

          {/* Step: LUT Mapping */}
          {step === "lut-mapping" && detection && (
            <div className="space-y-5">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-mcm-mustard-light rounded-lg flex items-center justify-center">
                  <span className="text-mcm-mustard font-bold text-sm">1</span>
                </div>
                <h2 className="text-xl font-semibold text-mcm-charcoal">Vérifier le mapping LUT</h2>
              </div>
              <MappingPreview
                fileType="lut"
                detection={detection}
                onConfirm={handleConfirmMapping}
                importing={loading}
                onBack={() => {
                  setStep("lut-upload");
                  setDetection(null);
                }}
              />
            </div>
          )}

          {/* Step: J&T Upload */}
          {step === "jt-upload" && (
            <div className="space-y-5">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-mcm-mustard-light rounded-lg flex items-center justify-center">
                  <span className="text-mcm-mustard font-bold text-sm">2</span>
                </div>
                <h2 className="text-xl font-semibold text-mcm-charcoal">Importer le J&amp;T</h2>
              </div>

              {lutResult && (
                <div className="p-4 bg-mcm-teal-light border border-mcm-teal/20 rounded-xl">
                  <p className="font-medium text-mcm-teal-dark">
                    LUT : {lutResult.inserted} OTs importés
                    {lutResult.archived ? ` — ${lutResult.archived} archivés` : ""}
                  </p>
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-mcm-charcoal mb-1.5">
                  Fichier J&amp;T
                </label>
                <div className="border-2 border-dashed border-mcm-warm-gray-border rounded-xl p-6 text-center hover:border-mcm-mustard transition-colors">
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".xlsm,.xlsx"
                    className="w-full text-sm text-mcm-warm-gray file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:bg-mcm-mustard file:text-white file:cursor-pointer file:hover:bg-mcm-mustard-hover file:transition-colors"
                  />
                  <p className="text-xs text-mcm-warm-gray-light mt-2">.xlsm ou .xlsx</p>
                </div>
              </div>

              <button
                onClick={() => handleDetect("jt")}
                disabled={loading}
                className="w-full px-5 py-2.5 bg-mcm-mustard text-white rounded-lg hover:bg-mcm-mustard-hover disabled:opacity-50 disabled:cursor-not-allowed font-medium transition-colors"
              >
                {loading ? (
                  <span className="flex items-center justify-center gap-2">
                    <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
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
                    Analyse en cours...
                  </span>
                ) : (
                  "Analyser le fichier"
                )}
              </button>
            </div>
          )}

          {/* Step: J&T Mapping */}
          {step === "jt-mapping" && detection && (
            <div className="space-y-5">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-mcm-mustard-light rounded-lg flex items-center justify-center">
                  <span className="text-mcm-mustard font-bold text-sm">2</span>
                </div>
                <h2 className="text-xl font-semibold text-mcm-charcoal">
                  Vérifier le mapping J&amp;T
                </h2>
              </div>
              <MappingPreview
                fileType="jt"
                detection={detection}
                onConfirm={handleConfirmMapping}
                importing={loading}
                onBack={() => {
                  setStep("jt-upload");
                  setDetection(null);
                }}
              />
            </div>
          )}

          {/* Step: Done */}
          {step === "done" && (
            <div className="text-center space-y-6 py-4">
              <div className="w-16 h-16 bg-mcm-teal-light rounded-full flex items-center justify-center mx-auto">
                <svg
                  className="w-8 h-8 text-mcm-teal"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M5 13l4 4L19 7"
                  />
                </svg>
              </div>
              <div>
                <h2 className="text-xl font-semibold text-mcm-charcoal">Import terminé</h2>
                {lutResult && (
                  <p className="text-mcm-warm-gray mt-1">LUT : {lutResult.inserted} OTs importés</p>
                )}
                {jtResult && (
                  <p className="text-mcm-warm-gray mt-1">
                    J&amp;T : {jtResult.inserted} brides importées
                    {jtResult.skipped ? ` — ${jtResult.skipped} ignorées` : ""}
                    {jtResult.archived ? ` — ${jtResult.archived} archivées` : ""}
                  </p>
                )}
              </div>
              <button
                onClick={() => router.push(`/projets/${projectId}`)}
                className="px-8 py-3 bg-mcm-teal text-white rounded-lg hover:bg-mcm-teal-dark font-medium transition-colors"
              >
                Voir le projet
              </button>
            </div>
          )}

          {/* Erreur */}
          {error && (
            <div className="mt-6 p-4 bg-mcm-terracotta-light border border-mcm-terracotta/20 rounded-xl">
              <p className="text-mcm-terracotta text-sm">{error}</p>
            </div>
          )}

          {/* Avertissements */}
          {lutResult && lutResult.errors.length > 0 && (
            <div className="mt-4 p-4 bg-mcm-burnt-orange-light border border-mcm-burnt-orange/20 rounded-xl">
              <p className="font-medium text-mcm-burnt-orange text-sm mb-2">Avertissements LUT :</p>
              <ul className="text-xs text-mcm-burnt-orange/80 space-y-1">
                {lutResult.errors.map((e, i) => (
                  <li key={i}>{e}</li>
                ))}
              </ul>
            </div>
          )}
          {jtResult && jtResult.errors.length > 0 && (
            <div className="mt-4 p-4 bg-mcm-burnt-orange-light border border-mcm-burnt-orange/20 rounded-xl">
              <p className="font-medium text-mcm-burnt-orange text-sm mb-2">
                Avertissements J&amp;T :
              </p>
              <ul className="text-xs text-mcm-burnt-orange/80 space-y-1">
                {jtResult.errors.map((e, i) => (
                  <li key={i}>{e}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}

export default function ImportPage() {
  return (
    <Suspense>
      <ImportPageContent />
    </Suspense>
  );
}
