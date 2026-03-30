"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

type ImportStep = "choose" | "lut" | "jt" | "done";

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

export default function ImportPage() {
  const router = useRouter();
  const [step, setStep] = useState<ImportStep>("choose");
  const [mode, setMode] = useState<"new" | "existing">("new");
  const [projectName, setProjectName] = useState("");
  const [client, setClient] = useState("");
  const [projectId, setProjectId] = useState<string | null>(null);
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<ImportResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetch("/api/ot-items?projectId=_list_projects")
      .catch(() => null);
    // Charger les projets existants
    const loadProjects = async () => {
      try {
        const res = await fetch("/api/projects");
        if (res.ok) {
          const data = await res.json();
          setProjects(data);
        }
      } catch { /* ignore */ }
    };
    loadProjects();
  }, []);

  async function handleImport(type: "lut" | "jt") {
    const file = fileInputRef.current?.files?.[0];
    if (!file) {
      setError("Sélectionnez un fichier Excel");
      return;
    }

    if (type === "lut" && mode === "new" && (!projectName.trim() || !client.trim())) {
      setError("Nom du projet et client requis");
      return;
    }

    setLoading(true);
    setError(null);
    setResult(null);

    const formData = new FormData();
    formData.append("file", file);
    formData.append("type", type);

    if (type === "lut" && mode === "existing" && projectId) {
      formData.append("projectId", projectId);
    } else if (type === "lut" && mode === "new") {
      formData.append("projectName", projectName.trim());
      formData.append("client", client.trim());
    } else if (type === "jt" && projectId) {
      formData.append("projectId", projectId);
      formData.append("reimport", "true");
    }

    try {
      const res = await fetch("/api/import", { method: "POST", body: formData });
      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Erreur import");
        return;
      }

      setResult(data);
      if (type === "lut") {
        setProjectId(data.projectId);
        setStep("jt");
        if (fileInputRef.current) fileInputRef.current.value = "";
      } else {
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

  const currentIdx = steps.findIndex((s) => s.key === step);

  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
      <div className="max-w-2xl mx-auto px-6 py-10">
        <Link
          href="/projets"
          className="inline-flex items-center gap-1 text-sm text-blue-600 hover:text-blue-800 transition-colors"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Projets
        </Link>

        <h1 className="text-3xl font-bold mt-4 mb-2 text-slate-900">
          Importer un arrêt
        </h1>
        <p className="text-slate-500 mb-8">
          Importez la LUT puis le J&amp;T pour créer ou mettre à jour un projet.
        </p>

        {/* Stepper */}
        <div className="flex items-center gap-1 mb-10">
          {steps.map((s, i) => {
            const isActive = i === currentIdx;
            const isPast = i < currentIdx;
            return (
              <div key={s.key} className="flex items-center gap-1 flex-1">
                {i > 0 && (
                  <div className={`flex-1 h-0.5 rounded ${isPast ? "bg-emerald-400" : "bg-slate-200"}`} />
                )}
                <div className="flex flex-col items-center gap-1">
                  <div
                    className={`w-9 h-9 rounded-full flex items-center justify-center text-sm font-semibold transition-all ${
                      isActive
                        ? "bg-blue-600 text-white shadow-lg shadow-blue-200"
                        : isPast
                          ? "bg-emerald-500 text-white"
                          : "bg-slate-200 text-slate-400"
                    }`}
                  >
                    {isPast ? (
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                      </svg>
                    ) : (
                      i + 1
                    )}
                  </div>
                  <span className={`text-xs ${isActive ? "text-blue-600 font-semibold" : "text-slate-400"}`}>
                    {s.label}
                  </span>
                </div>
              </div>
            );
          })}
        </div>

        {/* Card */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-8">
          {/* Step: Choose mode */}
          {step === "choose" && (
            <div className="space-y-6">
              <h2 className="text-xl font-semibold text-slate-900">
                Comment souhaitez-vous importer ?
              </h2>

              <div className="grid grid-cols-2 gap-4">
                <button
                  onClick={() => { setMode("new"); setStep("lut"); }}
                  className="p-6 border-2 border-slate-200 rounded-xl hover:border-blue-400 hover:bg-blue-50 transition-all text-left group"
                >
                  <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center mb-3 group-hover:bg-blue-200 transition-colors">
                    <svg className="w-5 h-5 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                    </svg>
                  </div>
                  <p className="font-semibold text-slate-900">Nouveau projet</p>
                  <p className="text-sm text-slate-500 mt-1">Créer un arrêt depuis zéro</p>
                </button>

                <button
                  onClick={() => { setMode("existing"); setStep("lut"); }}
                  disabled={projects.length === 0}
                  className="p-6 border-2 border-slate-200 rounded-xl hover:border-amber-400 hover:bg-amber-50 transition-all text-left group disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  <div className="w-10 h-10 bg-amber-100 rounded-lg flex items-center justify-center mb-3 group-hover:bg-amber-200 transition-colors">
                    <svg className="w-5 h-5 text-amber-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                    </svg>
                  </div>
                  <p className="font-semibold text-slate-900">Ré-importer</p>
                  <p className="text-sm text-slate-500 mt-1">Mettre à jour un projet existant</p>
                </button>
              </div>
            </div>
          )}

          {/* Step: LUT */}
          {step === "lut" && (
            <div className="space-y-5">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                  <span className="text-blue-600 font-bold text-sm">1</span>
                </div>
                <h2 className="text-xl font-semibold text-slate-900">
                  {mode === "existing" ? "Ré-importer la LUT" : "Importer la LUT"}
                </h2>
              </div>

              {mode === "existing" && (
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">
                    Projet existant
                  </label>
                  <select
                    value={projectId ?? ""}
                    onChange={(e) => setProjectId(e.target.value)}
                    className="w-full px-3 py-2.5 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                  >
                    <option value="">Sélectionner un projet...</option>
                    {projects.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name} — {p.client}
                      </option>
                    ))}
                  </select>
                  <p className="text-xs text-amber-600 mt-1.5">
                    Les anciennes données LUT et J&amp;T seront archivées automatiquement.
                  </p>
                </div>
              )}

              {mode === "new" && (
                <>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1.5">
                      Nom du projet
                    </label>
                    <input
                      type="text"
                      value={projectName}
                      onChange={(e) => setProjectName(e.target.value)}
                      placeholder="ex: Butachimie 2026"
                      className="w-full px-3 py-2.5 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1.5">
                      Client
                    </label>
                    <input
                      type="text"
                      value={client}
                      onChange={(e) => setClient(e.target.value)}
                      placeholder="ex: Butachimie"
                      className="w-full px-3 py-2.5 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </>
              )}

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">
                  Fichier LUT
                </label>
                <div className="border-2 border-dashed border-slate-300 rounded-xl p-6 text-center hover:border-blue-400 transition-colors">
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".xlsm,.xlsx"
                    className="w-full text-sm text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:bg-blue-600 file:text-white file:cursor-pointer file:hover:bg-blue-700 file:transition-colors"
                  />
                  <p className="text-xs text-slate-400 mt-2">.xlsm ou .xlsx</p>
                </div>
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  onClick={() => setStep("choose")}
                  className="px-5 py-2.5 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 transition-colors"
                >
                  Retour
                </button>
                <button
                  onClick={() => handleImport("lut")}
                  disabled={loading || (mode === "existing" && !projectId)}
                  className="flex-1 px-5 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed font-medium transition-colors"
                >
                  {loading ? (
                    <span className="flex items-center justify-center gap-2">
                      <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                      </svg>
                      Import en cours...
                    </span>
                  ) : (
                    mode === "existing" ? "Ré-importer la LUT" : "Importer la LUT"
                  )}
                </button>
              </div>
            </div>
          )}

          {/* Step: J&T */}
          {step === "jt" && (
            <div className="space-y-5">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                  <span className="text-blue-600 font-bold text-sm">2</span>
                </div>
                <h2 className="text-xl font-semibold text-slate-900">
                  Importer le J&amp;T
                </h2>
              </div>

              {result && (
                <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl">
                  <p className="font-medium text-emerald-800">
                    LUT : {result.inserted} OTs importés
                    {result.archived ? ` — ${result.archived} archivés` : ""}
                  </p>
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">
                  Fichier J&amp;T
                </label>
                <div className="border-2 border-dashed border-slate-300 rounded-xl p-6 text-center hover:border-blue-400 transition-colors">
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".xlsm,.xlsx"
                    className="w-full text-sm text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:bg-blue-600 file:text-white file:cursor-pointer file:hover:bg-blue-700 file:transition-colors"
                  />
                  <p className="text-xs text-slate-400 mt-2">.xlsm ou .xlsx</p>
                </div>
              </div>

              <button
                onClick={() => handleImport("jt")}
                disabled={loading}
                className="w-full px-5 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed font-medium transition-colors"
              >
                {loading ? (
                  <span className="flex items-center justify-center gap-2">
                    <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                    Import en cours...
                  </span>
                ) : (
                  "Importer le J&T"
                )}
              </button>
            </div>
          )}

          {/* Step: Done */}
          {step === "done" && (
            <div className="text-center space-y-6 py-4">
              <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto">
                <svg className="w-8 h-8 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <div>
                <h2 className="text-xl font-semibold text-slate-900">Import terminé</h2>
                {result && (
                  <p className="text-slate-500 mt-2">
                    {result.inserted} brides importées
                    {result.skipped ? ` — ${result.skipped} ignorées` : ""}
                    {result.archived ? ` — ${result.archived} archivées` : ""}
                  </p>
                )}
              </div>
              <button
                onClick={() => router.push(`/projets/${projectId}`)}
                className="px-8 py-3 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 font-medium transition-colors"
              >
                Voir le projet
              </button>
            </div>
          )}

          {/* Erreur */}
          {error && (
            <div className="mt-6 p-4 bg-red-50 border border-red-200 rounded-xl">
              <p className="text-red-800 text-sm">{error}</p>
            </div>
          )}

          {/* Résultat intermédiaire (si erreurs) */}
          {result && result.errors.length > 0 && (
            <div className="mt-4 p-4 bg-amber-50 border border-amber-200 rounded-xl">
              <p className="font-medium text-amber-800 text-sm mb-2">Avertissements :</p>
              <ul className="text-xs text-amber-700 space-y-1">
                {result.errors.map((e, i) => (
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
