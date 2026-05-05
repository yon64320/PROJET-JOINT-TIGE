"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createBrowserSupabase } from "@/lib/db/supabase-browser";
import { matchFolderToItem, type ItemRef } from "@/lib/import/match-folder-to-item";

const GENERAL_ITEM_VALUE = "__general__";

type ExistingPlan = {
  id: string;
  filename: string;
  storage_path: string;
  created_at: string;
  ot_item_id: string | null;
  ot_items: {
    id: string;
    item: string;
    numero_ligne: number | null;
    titre_gamme: string | null;
  } | null;
};

type OtItem = {
  id: string;
  item: string;
  numero_ligne: number | null;
  titre_gamme: string | null;
};

/**
 * Représente un dossier-source détecté dans la sélection. Le matching s'opère
 * pendant le staging (avant upload) ; l'utilisateur peut corriger les
 * orphelins via un dropdown ITEM ou cocher "projet général".
 */
type FolderGroup = {
  folderName: string;
  files: File[];
  // Match auto (null si pas trouvé)
  autoMatchId: string | null;
  autoMatchItem: string | null;
  autoConfidence: number;
  // Choix utilisateur (initialisé au match auto, modifiable). GENERAL_ITEM_VALUE
  // pour "projet général", id ITEM sinon, null = ignorer ce dossier.
  selectedTarget: string | null;
};

type UploadProgress = {
  total: number;
  done: number;
  currentFile: string;
  errors: { file: string; error: string }[];
  replaced: number;
};

export function PlansClient({ projectId }: { projectId: string }) {
  const [existing, setExisting] = useState<ExistingPlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [otItems, setOtItems] = useState<OtItem[]>([]);
  const [staging, setStaging] = useState<FolderGroup[] | null>(null);
  const [progress, setProgress] = useState<UploadProgress | null>(null);
  const [summary, setSummary] = useState<UploadProgress | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const refreshExisting = useCallback(async () => {
    setLoading(true);
    const res = await fetch(`/api/projects/${projectId}/plans`);
    if (res.ok) {
      const data = (await res.json()) as ExistingPlan[];
      setExisting(data);
    }
    setLoading(false);
  }, [projectId]);

  useEffect(() => {
    refreshExisting();
    fetch(`/api/ot-items?projectId=${projectId}`)
      .then((r) => (r.ok ? r.json() : []))
      .then((data: OtItem[]) => setOtItems(data));
  }, [projectId, refreshExisting]);

  const itemRefs: ItemRef[] = useMemo(
    () => otItems.map((o) => ({ id: o.id, item: o.item })),
    [otItems],
  );

  // Préparation : group selected files by top-level folder, match each folder
  const handleFolderPick = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = e.target.files;
      if (!files || files.length === 0) return;

      const groups = new Map<string, File[]>();
      const rootLevelPdfs: File[] = [];
      for (const f of Array.from(files)) {
        if (!f.name.toLowerCase().endsWith(".pdf")) continue;
        const path = f.webkitRelativePath || f.name;
        const segments = path.split("/").filter(Boolean);
        if (segments.length <= 2) {
          // racine/<file> ou <file> → projet général
          rootLevelPdfs.push(f);
          continue;
        }
        // racine/<folder>/<...>/<file> → groupe par <folder>
        const folder = segments[1];
        const existingArr = groups.get(folder) ?? [];
        existingArr.push(f);
        groups.set(folder, existingArr);
      }

      const stagingGroups: FolderGroup[] = [];

      // Groupes par dossier
      for (const [folderName, folderFiles] of groups) {
        const match = matchFolderToItem(folderName, itemRefs);
        stagingGroups.push({
          folderName,
          files: folderFiles,
          autoMatchId: match.matchId,
          autoMatchItem: match.matchItem,
          autoConfidence: match.confidence,
          selectedTarget: match.matchId,
        });
      }

      // PDF racine = projet général par défaut
      if (rootLevelPdfs.length > 0) {
        stagingGroups.push({
          folderName: "(racine)",
          files: rootLevelPdfs,
          autoMatchId: null,
          autoMatchItem: null,
          autoConfidence: 0,
          selectedTarget: GENERAL_ITEM_VALUE,
        });
      }

      // Tri : matchés d'abord, puis orphelins
      stagingGroups.sort((a, b) => {
        const aHasMatch = a.autoMatchId !== null ? 0 : 1;
        const bHasMatch = b.autoMatchId !== null ? 0 : 1;
        if (aHasMatch !== bHasMatch) return aHasMatch - bHasMatch;
        return a.folderName.localeCompare(b.folderName);
      });

      setStaging(stagingGroups);
      setSummary(null);
      // Reset l'input pour pouvoir re-choisir le même dossier
      if (inputRef.current) inputRef.current.value = "";
    },
    [itemRefs],
  );

  const setStagingTarget = useCallback((idx: number, target: string | null) => {
    setStaging((prev) => {
      if (!prev) return prev;
      const next = [...prev];
      next[idx] = { ...next[idx], selectedTarget: target };
      return next;
    });
  }, []);

  const cancelStaging = useCallback(() => {
    setStaging(null);
  }, []);

  const confirmUpload = useCallback(async () => {
    if (!staging) return;

    const flatFiles: { file: File; otItemId: string | null }[] = [];
    for (const g of staging) {
      if (g.selectedTarget === null) continue; // ignoré
      const otItemId = g.selectedTarget === GENERAL_ITEM_VALUE ? null : g.selectedTarget;
      for (const f of g.files) flatFiles.push({ file: f, otItemId });
    }

    if (flatFiles.length === 0) {
      setStaging(null);
      return;
    }

    // Récupère le token Bearer pour la route /api/terrain/plans
    const supabase = createBrowserSupabase();
    const {
      data: { session },
    } = await supabase.auth.getSession();
    const token = session?.access_token;
    if (!token) {
      alert("Session expirée. Reconnectez-vous.");
      return;
    }

    const prog: UploadProgress = {
      total: flatFiles.length,
      done: 0,
      currentFile: "",
      errors: [],
      replaced: 0,
    };
    setProgress({ ...prog });
    setStaging(null);

    for (const { file, otItemId } of flatFiles) {
      prog.currentFile = file.name;
      setProgress({ ...prog });

      const formData = new FormData();
      formData.append("file", file);
      formData.append("projectId", projectId);
      if (otItemId) formData.append("otItemId", otItemId);

      try {
        const res = await fetch("/api/terrain/plans", {
          method: "POST",
          headers: { Authorization: `Bearer ${token}` },
          body: formData,
        });
        if (!res.ok) {
          const errBody = await res.json().catch(() => ({ error: `HTTP ${res.status}` }));
          prog.errors.push({ file: file.name, error: errBody.error ?? "Erreur inconnue" });
        } else {
          const body = await res.json().catch(() => ({}));
          if (typeof body.replaced === "number") prog.replaced += body.replaced;
        }
      } catch (err) {
        prog.errors.push({
          file: file.name,
          error: err instanceof Error ? err.message : "Erreur réseau",
        });
      }

      prog.done += 1;
      setProgress({ ...prog });
    }

    setSummary({ ...prog });
    setProgress(null);
    refreshExisting();
  }, [staging, projectId, refreshExisting]);

  const handleDelete = useCallback(
    async (planId: string, filename: string) => {
      if (!confirm(`Supprimer "${filename}" ?`)) return;
      const res = await fetch(`/api/projects/${projectId}/plans/${planId}`, { method: "DELETE" });
      if (!res.ok) {
        const errBody = await res.json().catch(() => ({ error: `HTTP ${res.status}` }));
        alert(`Suppression impossible : ${errBody.error}`);
        return;
      }
      refreshExisting();
    },
    [projectId, refreshExisting],
  );

  // Groupement par ITEM (null = projet général au-dessus)
  const groupedExisting = useMemo(() => {
    const map = new Map<string | null, ExistingPlan[]>();
    for (const p of existing) {
      const key = p.ot_item_id;
      const arr = map.get(key) ?? [];
      arr.push(p);
      map.set(key, arr);
    }
    return Array.from(map.entries()).sort(([a], [b]) => {
      if (a === null) return -1;
      if (b === null) return 1;
      return 0;
    });
  }, [existing]);

  const sortedOts = useMemo(
    () =>
      [...otItems].sort((a, b) => {
        const an = a.numero_ligne ?? 999999;
        const bn = b.numero_ligne ?? 999999;
        if (an !== bn) return an - bn;
        return a.item.localeCompare(b.item);
      }),
    [otItems],
  );

  return (
    <div className="max-w-5xl mx-auto px-6 py-6">
      {/* Bouton import */}
      {!staging && !progress && (
        <div className="mb-6 flex items-center justify-between">
          <p className="text-sm text-slate-600">
            {loading
              ? "Chargement…"
              : `${existing.length} plan${existing.length > 1 ? "s" : ""} importé${existing.length > 1 ? "s" : ""}`}
          </p>
          <label className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 cursor-pointer text-sm font-medium">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3"
              />
            </svg>
            Importer un dossier
            <input
              ref={inputRef}
              type="file"
              multiple
              // @ts-expect-error — webkitdirectory est non-standard mais largement supporté
              webkitdirectory=""
              directory=""
              className="hidden"
              onChange={handleFolderPick}
            />
          </label>
        </div>
      )}

      {/* Récap import (staging) */}
      {staging && (
        <StagingPanel
          groups={staging}
          otItems={sortedOts}
          onChangeTarget={setStagingTarget}
          onCancel={cancelStaging}
          onConfirm={confirmUpload}
        />
      )}

      {/* Progression upload */}
      {progress && <ProgressPanel progress={progress} />}

      {/* Summary post-upload */}
      {summary && !progress && (
        <SummaryPanel summary={summary} onDismiss={() => setSummary(null)} />
      )}

      {/* Liste existante */}
      {!staging && !progress && (
        <div className="space-y-4">
          {groupedExisting.length === 0 && !loading && (
            <p className="text-center py-12 text-slate-500 text-sm">
              Aucun plan importé pour le moment.
            </p>
          )}
          {groupedExisting.map(([otItemId, plans]) => {
            const ot = plans[0]?.ot_items;
            const label = otItemId === null ? "Projet général (visible partout)" : ot?.item;
            const subtitle = otItemId === null ? null : ot?.titre_gamme;
            return (
              <div
                key={otItemId ?? "__general"}
                className="border border-slate-200 rounded-lg overflow-hidden"
              >
                <div className="px-4 py-2 bg-slate-50 border-b border-slate-200 flex items-baseline gap-2">
                  <span
                    className={`px-2 py-0.5 rounded text-xs font-semibold ${
                      otItemId === null
                        ? "bg-slate-200 text-slate-700"
                        : "bg-indigo-100 text-indigo-700"
                    }`}
                  >
                    {label}
                  </span>
                  {subtitle && <span className="text-xs text-slate-500">{subtitle}</span>}
                  <span className="ml-auto text-xs text-slate-400">
                    {plans.length} fichier{plans.length > 1 ? "s" : ""}
                  </span>
                </div>
                <ul className="divide-y divide-slate-100">
                  {plans.map((p) => (
                    <li key={p.id} className="px-4 py-2 flex items-center justify-between gap-3">
                      <span className="text-sm text-slate-800 truncate">{p.filename}</span>
                      <button
                        type="button"
                        onClick={() => handleDelete(p.id, p.filename)}
                        className="text-xs text-red-600 hover:text-red-800 hover:underline shrink-0"
                      >
                        Supprimer
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function StagingPanel({
  groups,
  otItems,
  onChangeTarget,
  onCancel,
  onConfirm,
}: {
  groups: FolderGroup[];
  otItems: OtItem[];
  onChangeTarget: (idx: number, target: string | null) => void;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  const totalFiles = groups.reduce((s, g) => s + g.files.length, 0);
  const matched = groups.filter((g) => g.autoMatchId !== null).length;
  const orphan = groups.length - matched;
  const willUpload = groups
    .filter((g) => g.selectedTarget !== null)
    .reduce((s, g) => s + g.files.length, 0);

  return (
    <div className="border border-indigo-200 rounded-lg bg-indigo-50/40 p-5 mb-6">
      <h2 className="text-lg font-semibold text-slate-900">Récapitulatif</h2>
      <p className="text-sm text-slate-600 mt-1 mb-4">
        {groups.length} dossier{groups.length > 1 ? "s" : ""} détecté{groups.length > 1 ? "s" : ""},{" "}
        {totalFiles} PDF — <span className="text-emerald-700">{matched} reconnu(s)</span>,{" "}
        <span className="text-amber-700">{orphan} à associer</span>.
      </p>

      <ul className="space-y-2 mb-5 max-h-[50vh] overflow-y-auto">
        {groups.map((g, idx) => {
          const isMatched = g.autoMatchId !== null;
          return (
            <li
              key={g.folderName + idx}
              className="bg-white border border-slate-200 rounded p-3 flex flex-col sm:flex-row sm:items-center gap-2"
            >
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-slate-900 truncate">{g.folderName}</p>
                <p className="text-xs text-slate-500">
                  {g.files.length} fichier{g.files.length > 1 ? "s" : ""}
                  {isMatched && (
                    <>
                      {" — "}
                      <span className="text-emerald-700">
                        match : {g.autoMatchItem}
                        {g.autoConfidence < 1 && ` (${Math.round(g.autoConfidence * 100)}%)`}
                      </span>
                    </>
                  )}
                </p>
              </div>
              <select
                value={g.selectedTarget ?? ""}
                onChange={(e) => onChangeTarget(idx, e.target.value === "" ? null : e.target.value)}
                className="min-w-[200px] sm:max-w-[280px] px-2 py-1.5 text-sm rounded border border-slate-300 bg-white"
              >
                <option value="">— Ignorer —</option>
                <option value={GENERAL_ITEM_VALUE}>Projet général</option>
                <optgroup label="Équipements">
                  {otItems.map((ot) => (
                    <option key={ot.id} value={ot.id}>
                      {ot.item}
                      {ot.titre_gamme ? ` — ${ot.titre_gamme}` : ""}
                    </option>
                  ))}
                </optgroup>
              </select>
            </li>
          );
        })}
      </ul>

      <div className="flex items-center justify-between gap-3 pt-3 border-t border-indigo-100">
        <button
          type="button"
          onClick={onCancel}
          className="px-4 py-2 text-sm text-slate-600 hover:text-slate-900"
        >
          Annuler
        </button>
        <button
          type="button"
          onClick={onConfirm}
          disabled={willUpload === 0}
          className="px-4 py-2 text-sm bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:bg-slate-300 disabled:cursor-not-allowed"
        >
          Importer {willUpload} fichier{willUpload > 1 ? "s" : ""}
        </button>
      </div>
    </div>
  );
}

function ProgressPanel({ progress }: { progress: UploadProgress }) {
  const pct = Math.round((progress.done / progress.total) * 100);
  return (
    <div className="border border-indigo-200 rounded-lg bg-white p-5 mb-6">
      <p className="text-sm text-slate-700 mb-2">
        Import en cours… {progress.done} / {progress.total}
      </p>
      <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
        <div
          className="h-full bg-indigo-600 transition-all duration-200"
          style={{ width: `${pct}%` }}
        />
      </div>
      {progress.currentFile && (
        <p className="text-xs text-slate-500 mt-2 truncate">{progress.currentFile}</p>
      )}
    </div>
  );
}

function SummaryPanel({ summary, onDismiss }: { summary: UploadProgress; onDismiss: () => void }) {
  const ok = summary.done - summary.errors.length;
  return (
    <div className="border border-emerald-200 rounded-lg bg-emerald-50/40 p-5 mb-6">
      <div className="flex items-center justify-between gap-3 mb-2">
        <h2 className="text-base font-semibold text-emerald-900">
          Import terminé : {ok} / {summary.total}
          {summary.replaced > 0 && (
            <span className="text-slate-600 font-normal text-sm ml-1">
              ({summary.replaced} remplacé{summary.replaced > 1 ? "s" : ""})
            </span>
          )}
        </h2>
        <button
          type="button"
          onClick={onDismiss}
          className="text-sm text-slate-500 hover:text-slate-800"
        >
          Fermer
        </button>
      </div>
      {summary.errors.length > 0 && (
        <details className="mt-2">
          <summary className="text-sm text-red-700 cursor-pointer">
            {summary.errors.length} erreur{summary.errors.length > 1 ? "s" : ""}
          </summary>
          <ul className="mt-2 space-y-1 text-xs text-red-700">
            {summary.errors.map((e, i) => (
              <li key={i}>
                <span className="font-medium">{e.file}</span> — {e.error}
              </li>
            ))}
          </ul>
        </details>
      )}
    </div>
  );
}
