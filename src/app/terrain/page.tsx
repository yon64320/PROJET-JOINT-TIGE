"use client";

import { Suspense, useEffect, useState, useCallback, useMemo } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { TerrainLayout } from "@/components/terrain/TerrainLayout";
import { SessionCard } from "@/components/terrain/SessionCard";
import { createBrowserSupabase } from "@/lib/db/supabase-browser";
import { downloadSession } from "@/lib/offline/sync";
import { offlineDb } from "@/lib/offline/db";
import { TERRAIN_FIELDS, ALL_FIELD_KEYS, type TerrainFieldKey } from "@/lib/terrain/fields";

interface ServerSession {
  id: string;
  name: string;
  status: string;
  downloaded_at: string | null;
  field_session_items: { ot_item_id: string }[];
}

function TerrainHomeContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const projectId = searchParams.get("projectId");

  const [sessions, setSessions] = useState<ServerSession[]>([]);
  const [offlineMap, setOfflineMap] = useState<Map<string, { downloaded_at: string | null }>>(
    () => new Map(),
  );
  const [loading, setLoading] = useState(true);
  const [downloading, setDownloading] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);

  // Redirect if no projectId
  useEffect(() => {
    if (!projectId) {
      router.replace("/projets");
    }
  }, [projectId, router]);

  // Load sessions for this project only
  const loadSessions = useCallback(async () => {
    if (!projectId) return;
    try {
      const supabase = createBrowserSupabase();
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session) return;

      // RLS filtre via owner_id = auth.uid() OR is_admin() — admin voit toutes les sessions.
      const { data } = await supabase
        .from("field_sessions")
        .select("*, field_session_items(ot_item_id)")
        .eq("project_id", projectId)
        .order("created_at", { ascending: false });

      setSessions((data as ServerSession[]) ?? []);

      // Check which ones are available offline (device-local IndexedDB).
      // On stocke aussi le `downloaded_at` LOCAL pour éviter d'afficher la date
      // de download d'un autre device (le serveur la met à jour globalement).
      const localSessions = await offlineDb.sessions.toArray();
      const localMap = new Map<string, { downloaded_at: string | null }>(
        localSessions.map((s) => [s.id, { downloaded_at: s.downloaded_at }]),
      );
      setOfflineMap(localMap);
    } catch (err) {
      console.error("Failed to load sessions:", err);
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    loadSessions();
  }, [loadSessions]);

  const handleDownload = async (sessionId: string) => {
    if (!navigator.onLine) {
      alert("Pas de connexion internet. Le téléchargement nécessite d'être en ligne.");
      return;
    }
    setDownloading(sessionId);
    try {
      const supabase = createBrowserSupabase();
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session) return;
      await downloadSession(sessionId, session.access_token);
      await loadSessions();
    } catch (err) {
      console.error("Download failed:", err);
      const isNetwork =
        !navigator.onLine || (err instanceof TypeError && /fetch/i.test(err.message));
      alert(
        isNetwork
          ? "Téléchargement impossible : connexion internet requise."
          : "Erreur lors du téléchargement",
      );
    } finally {
      setDownloading(null);
    }
  };

  const handleDelete = async (sessionId: string, sessionName: string) => {
    if (!confirm(`Supprimer la session "${sessionName}" ?`)) return;
    try {
      const supabase = createBrowserSupabase();
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session) return;

      const res = await fetch(`/api/terrain/sessions?sessionId=${sessionId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${session.access_token}` },
      });

      if (!res.ok) {
        const body = await res.json().catch(() => null);
        alert(body?.error ?? "Erreur suppression");
        return;
      }

      // Clean IndexedDB too
      await offlineDb.sessions.delete(sessionId);
      await offlineDb.otItems.where("session_id").equals(sessionId).delete();
      await offlineDb.flanges.where("session_id").equals(sessionId).delete();
      await offlineDb.mutations.where("session_id").equals(sessionId).delete();
      await offlineDb.plans.where("session_id").equals(sessionId).delete();

      await loadSessions();
    } catch (err) {
      console.error("Delete failed:", err);
      alert("Erreur lors de la suppression");
    }
  };

  const handleClick = (sessionId: string) => {
    if (offlineMap.has(sessionId)) {
      router.push(`/terrain/${sessionId}`);
    } else if (!navigator.onLine) {
      alert(
        "Cette session n'est pas téléchargée sur cet appareil. Connectez-vous à internet pour la télécharger.",
      );
    } else {
      handleDownload(sessionId);
    }
  };

  if (!projectId) return null;

  return (
    <TerrainLayout title="Sessions terrain" backHref={`/projets/${projectId}`} backLabel="Projet">
      <div className="p-4 space-y-3">
        {/* Bouton créer — toujours visible */}
        <button
          onClick={() => setShowCreate(true)}
          className="w-full h-14 rounded-xl bg-mcm-mustard text-white text-lg font-semibold
                     active:bg-mcm-mustard-hover transition-colors"
        >
          + Nouvelle session
        </button>

        {loading ? (
          <div className="flex items-center justify-center py-12 text-mcm-warm-gray">
            Chargement...
          </div>
        ) : sessions.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-mcm-warm-gray">Aucune session terrain.</p>
          </div>
        ) : (
          <>
            {sessions.map((s) => {
              const local = offlineMap.get(s.id);
              const isLocal = local !== undefined;
              return (
                <div key={s.id} className="relative">
                  <SessionCard
                    id={s.id}
                    name={s.name}
                    status={isLocal ? s.status : "preparing"}
                    itemCount={s.field_session_items?.length ?? 0}
                    downloadedAt={local?.downloaded_at ?? null}
                    isOffline={isLocal}
                    onClick={() => handleClick(s.id)}
                    onDownload={() => handleDownload(s.id)}
                    onDelete={() => handleDelete(s.id, s.name)}
                  />
                  {downloading === s.id && (
                    <div className="absolute inset-0 bg-white/80 rounded-xl flex items-center justify-center">
                      <div className="flex items-center gap-2 text-mcm-mustard">
                        <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
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
                        <span className="font-semibold">Téléchargement...</span>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </>
        )}

        {showCreate && (
          <CreateSessionModal
            projectId={projectId}
            onClose={() => {
              setShowCreate(false);
              loadSessions();
            }}
          />
        )}
      </div>
    </TerrainLayout>
  );
}

export default function TerrainHome() {
  return (
    <Suspense>
      <TerrainHomeContent />
    </Suspense>
  );
}

// ---- Create Session Modal ----

interface OtItemRow {
  id: string;
  item: string;
  famille_item: string | null;
  type_item: string | null;
  selected: boolean;
}

function CreateSessionModal({ projectId, onClose }: { projectId: string; onClose: () => void }) {
  const [name, setName] = useState("");
  const [otItems, setOtItems] = useState<OtItemRow[]>([]);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Field selection
  const [selectedFieldKeys, setSelectedFieldKeys] = useState<Set<TerrainFieldKey>>(
    () => new Set(ALL_FIELD_KEYS),
  );
  const [showFieldPicker, setShowFieldPicker] = useState(false);

  // Filters
  const [search, setSearch] = useState("");
  const [familleFilter, setFamilleFilter] = useState("");
  const [typeFilter, setTypeFilter] = useState("");

  // Load OT items for this project
  useEffect(() => {
    const supabase = createBrowserSupabase();
    supabase
      .from("ot_items")
      .select("id, item, famille_item, type_item")
      .eq("project_id", projectId)
      .order("item")
      .then(({ data }) => setOtItems((data ?? []).map((ot) => ({ ...ot, selected: false }))));
  }, [projectId]);

  // Extract unique famille_item values for primary filter
  const familleOptions = useMemo(() => {
    const familles = new Set(otItems.map((o) => o.famille_item).filter((f): f is string => !!f));
    return [...familles].sort();
  }, [otItems]);

  // Extract type_item values scoped to the selected famille (secondary filter)
  const typeOptions = useMemo(() => {
    const scope = familleFilter ? otItems.filter((o) => o.famille_item === familleFilter) : otItems;
    const types = new Set(scope.map((o) => o.type_item).filter((t): t is string => !!t));
    return [...types].sort();
  }, [otItems, familleFilter]);

  // Filtered items for display (selection state is independent of filter)
  const filteredItems = useMemo(() => {
    return otItems.filter((ot) => {
      const matchesSearch = !search || ot.item.toLowerCase().includes(search.toLowerCase());
      const matchesFamille = !familleFilter || ot.famille_item === familleFilter;
      const matchesType = !typeFilter || ot.type_item === typeFilter;
      return matchesSearch && matchesFamille && matchesType;
    });
  }, [otItems, search, familleFilter, typeFilter]);

  const selectedCount = otItems.filter((o) => o.selected).length;

  const handleCreate = async () => {
    const selectedIds = otItems.filter((o) => o.selected).map((o) => o.id);
    if (!name || selectedIds.length === 0) return;

    setCreating(true);
    setError(null);
    try {
      const supabase = createBrowserSupabase();
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session) {
        setError("Session expirée. Reconnectez-vous.");
        return;
      }

      const res = await fetch("/api/terrain/sessions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          projectId,
          name,
          otItemIds: selectedIds,
          // Toujours envoyer l'array (jamais null) pour que les sous-options
          // opt-in (ex. echafaudage_feb) restent explicites côté wizard.
          // Le wizard ne sait pas distinguer "null = legacy tous champs" de
          // "null = nouveau session avec tous champs" — donc on est explicite.
          selectedFields: [...selectedFieldKeys],
        }),
      });

      if (!res.ok) {
        const body = await res.json().catch(() => null);
        setError(body?.error ?? `Erreur serveur (${res.status})`);
        return;
      }

      onClose();
    } catch (err) {
      console.error("Create failed:", err);
      setError("Erreur réseau. Vérifiez votre connexion.");
    } finally {
      setCreating(false);
    }
  };

  // Toggle all VISIBLE (filtered) items
  const toggleFiltered = () => {
    const visibleIds = new Set(filteredItems.map((o) => o.id));
    const allVisibleSelected = filteredItems.every((o) => o.selected);
    setOtItems((items) =>
      items.map((o) => (visibleIds.has(o.id) ? { ...o, selected: !allVisibleSelected } : o)),
    );
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-end sm:items-center justify-center">
      <div className="bg-mcm-cream w-full max-w-lg rounded-t-2xl sm:rounded-2xl max-h-[85vh] flex flex-col">
        {/* Header */}
        <div className="p-4 border-b border-mcm-warm-gray-border flex items-center justify-between">
          <h2 className="text-lg font-bold text-mcm-charcoal">Nouvelle session</h2>
          <button
            onClick={onClose}
            className="w-10 h-10 flex items-center justify-center text-mcm-warm-gray"
          >
            &times;
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {/* Session name */}
          <div>
            <label className="text-sm text-mcm-warm-gray">Nom de la session</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ex: Ronde mardi matin"
              className="mt-1 w-full h-12 px-3 rounded-xl border border-mcm-warm-gray-border bg-white text-lg"
            />
          </div>

          {/* Equipment section */}
          {otItems.length > 0 && (
            <div className="space-y-3">
              {/* Header with count */}
              <div className="flex items-center justify-between">
                <label className="text-sm text-mcm-warm-gray">
                  Equipements ({selectedCount}/{otItems.length} sélectionnés)
                </label>
                <button onClick={toggleFiltered} className="text-sm text-mcm-mustard font-medium">
                  {filteredItems.length > 0 && filteredItems.every((o) => o.selected)
                    ? "Désélectionner"
                    : "Tout sélectionner"}
                </button>
              </div>

              {/* Search input */}
              <div className="relative">
                <svg
                  className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-mcm-warm-gray"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                  />
                </svg>
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Rechercher un item..."
                  className="w-full h-10 pl-9 pr-3 rounded-lg border border-mcm-warm-gray-border bg-white text-sm"
                />
              </div>

              {/* Famille / Type filters — listes déroulantes */}
              {(familleOptions.length > 1 || typeOptions.length > 1) && (
                <div className="grid grid-cols-2 gap-2">
                  {familleOptions.length > 1 && (
                    <select
                      value={familleFilter}
                      onChange={(e) => {
                        setFamilleFilter(e.target.value);
                        setTypeFilter("");
                      }}
                      className="h-10 px-3 rounded-lg border border-mcm-warm-gray-border bg-white text-sm text-mcm-charcoal"
                    >
                      <option value="">Toutes familles</option>
                      {familleOptions.map((f) => (
                        <option key={f} value={f}>
                          {f}
                        </option>
                      ))}
                    </select>
                  )}
                  {typeOptions.length > 1 && (
                    <select
                      value={typeFilter}
                      onChange={(e) => setTypeFilter(e.target.value)}
                      className={`h-10 px-3 rounded-lg border border-mcm-warm-gray-border bg-white text-sm text-mcm-charcoal ${
                        familleOptions.length > 1 ? "" : "col-span-2"
                      }`}
                    >
                      <option value="">Tous types</option>
                      {typeOptions.map((type) => (
                        <option key={type} value={type}>
                          {type}
                        </option>
                      ))}
                    </select>
                  )}
                </div>
              )}

              {/* Equipment list */}
              <div className="space-y-1 max-h-56 overflow-y-auto">
                {filteredItems.length === 0 ? (
                  <p className="text-sm text-mcm-warm-gray text-center py-4">
                    Aucun item correspondant.
                  </p>
                ) : (
                  filteredItems.map((ot) => (
                    <label
                      key={ot.id}
                      className="flex items-center gap-3 p-2 rounded-lg hover:bg-white cursor-pointer"
                    >
                      <input
                        type="checkbox"
                        checked={ot.selected}
                        onChange={() =>
                          setOtItems((items) =>
                            items.map((o) =>
                              o.id === ot.id ? { ...o, selected: !o.selected } : o,
                            ),
                          )
                        }
                        className="w-5 h-5 accent-mcm-mustard shrink-0"
                      />
                      <span className="text-base text-mcm-charcoal flex-1 truncate">{ot.item}</span>
                      <span className="flex gap-1 shrink-0">
                        {ot.famille_item && (
                          <span className="text-xs text-mcm-warm-gray bg-mcm-warm-gray-bg px-2 py-0.5 rounded-full">
                            {ot.famille_item}
                          </span>
                        )}
                        {ot.type_item && (
                          <span className="text-xs text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full">
                            {ot.type_item}
                          </span>
                        )}
                      </span>
                    </label>
                  ))
                )}
              </div>
            </div>
          )}

          {/* Field selection */}
          <div className="space-y-2">
            <button
              onClick={() => setShowFieldPicker((v) => !v)}
              className="flex items-center justify-between w-full text-sm text-mcm-warm-gray"
            >
              <span>
                Données à relever ({selectedFieldKeys.size}/{TERRAIN_FIELDS.length})
              </span>
              <span className="text-mcm-mustard font-medium">
                {showFieldPicker ? "Masquer" : "Personnaliser"}
              </span>
            </button>

            {showFieldPicker && (
              <div className="space-y-2 bg-white rounded-xl p-3 border border-mcm-warm-gray-border">
                {/* Toggle all */}
                <button
                  onClick={() =>
                    setSelectedFieldKeys(
                      selectedFieldKeys.size === ALL_FIELD_KEYS.length
                        ? new Set()
                        : new Set(ALL_FIELD_KEYS),
                    )
                  }
                  className="text-sm text-mcm-mustard font-medium"
                >
                  {selectedFieldKeys.size === ALL_FIELD_KEYS.length
                    ? "Tout désélectionner"
                    : "Tout sélectionner"}
                </button>

                {TERRAIN_FIELDS.map((f) => {
                  const parentDisabled = !!f.parent && !selectedFieldKeys.has(f.parent);
                  const checked = selectedFieldKeys.has(f.key) && !parentDisabled;
                  return (
                    <label
                      key={f.key}
                      className={`flex items-center gap-3 py-1.5 cursor-pointer ${
                        f.parent ? "pl-6" : ""
                      } ${parentDisabled ? "opacity-40 pointer-events-none" : ""}`}
                    >
                      <input
                        type="checkbox"
                        checked={checked}
                        disabled={parentDisabled}
                        onChange={() =>
                          setSelectedFieldKeys((prev) => {
                            const next = new Set(prev);
                            if (next.has(f.key)) {
                              next.delete(f.key);
                            } else {
                              next.add(f.key);
                            }
                            // Si on décoche un parent : retirer aussi ses enfants
                            if (!next.has(f.key)) {
                              for (const child of TERRAIN_FIELDS) {
                                if (child.parent === f.key) next.delete(child.key);
                              }
                            }
                            return next;
                          })
                        }
                        className="w-5 h-5 accent-mcm-mustard shrink-0"
                      />
                      <span className="text-base text-mcm-charcoal">{f.label}</span>
                    </label>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-mcm-warm-gray-border space-y-2">
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-xl">
              <p className="text-sm text-red-700">{error}</p>
            </div>
          )}
          <button
            onClick={handleCreate}
            disabled={creating || !name || selectedCount === 0 || selectedFieldKeys.size === 0}
            className="w-full h-14 rounded-xl bg-mcm-mustard text-white text-lg font-semibold
                       active:bg-mcm-mustard-hover disabled:opacity-40 transition-colors"
          >
            {creating ? "Création..." : "Créer la session"}
          </button>
        </div>
      </div>
    </div>
  );
}
