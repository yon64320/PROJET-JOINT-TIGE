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
  const [offlineSessions, setOfflineSessions] = useState<string[]>([]);
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

      const { data } = await supabase
        .from("field_sessions")
        .select("*, field_session_items(ot_item_id)")
        .eq("project_id", projectId)
        .eq("owner_id", session.user.id)
        .order("created_at", { ascending: false });

      setSessions((data as ServerSession[]) ?? []);

      // Check which ones are available offline
      const offlineIds = await offlineDb.sessions.toCollection().primaryKeys();
      setOfflineSessions(offlineIds as string[]);
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
      alert("Erreur lors du téléchargement");
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

      await loadSessions();
    } catch (err) {
      console.error("Delete failed:", err);
      alert("Erreur lors de la suppression");
    }
  };

  const handleClick = (sessionId: string) => {
    if (offlineSessions.includes(sessionId)) {
      router.push(`/terrain/${sessionId}`);
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
            {sessions.map((s) => (
              <div key={s.id} className="relative group">
                <SessionCard
                  id={s.id}
                  name={s.name}
                  status={offlineSessions.includes(s.id) ? s.status : "preparing"}
                  itemCount={s.field_session_items?.length ?? 0}
                  downloadedAt={s.downloaded_at}
                  onClick={() => handleClick(s.id)}
                />
                {/* Bouton supprimer */}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDelete(s.id, s.name);
                  }}
                  className="absolute top-2 right-2 w-8 h-8 rounded-full bg-red-100 text-red-600
                             flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                  title="Supprimer"
                >
                  &times;
                </button>
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
            ))}
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
      .then(({ data }) => setOtItems((data ?? []).map((ot) => ({ ...ot, selected: true }))));
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
          selectedFields:
            selectedFieldKeys.size === ALL_FIELD_KEYS.length ? null : [...selectedFieldKeys],
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

              {/* Famille filter chips (primary) */}
              {familleOptions.length > 1 && (
                <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1">
                  <button
                    onClick={() => {
                      setFamilleFilter("");
                      setTypeFilter("");
                    }}
                    className={`shrink-0 px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
                      !familleFilter
                        ? "bg-mcm-mustard text-white"
                        : "bg-white border border-mcm-warm-gray-border text-mcm-warm-gray"
                    }`}
                  >
                    Toutes familles
                  </button>
                  {familleOptions.map((f) => (
                    <button
                      key={f}
                      onClick={() => {
                        setFamilleFilter(familleFilter === f ? "" : f);
                        setTypeFilter("");
                      }}
                      className={`shrink-0 px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
                        familleFilter === f
                          ? "bg-mcm-mustard text-white"
                          : "bg-white border border-mcm-warm-gray-border text-mcm-warm-gray"
                      }`}
                    >
                      {f}
                    </button>
                  ))}
                </div>
              )}

              {/* Type filter chips (secondary — visible when relevant) */}
              {typeOptions.length > 1 && (
                <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1">
                  <button
                    onClick={() => setTypeFilter("")}
                    className={`shrink-0 px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                      !typeFilter
                        ? "bg-amber-100 text-amber-700"
                        : "bg-white border border-mcm-warm-gray-border text-mcm-warm-gray"
                    }`}
                  >
                    Tous types
                  </button>
                  {typeOptions.map((type) => (
                    <button
                      key={type}
                      onClick={() => setTypeFilter(typeFilter === type ? "" : type)}
                      className={`shrink-0 px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                        typeFilter === type
                          ? "bg-amber-100 text-amber-700"
                          : "bg-white border border-mcm-warm-gray-border text-mcm-warm-gray"
                      }`}
                    >
                      {type}
                    </button>
                  ))}
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

                {TERRAIN_FIELDS.map((f) => (
                  <label key={f.key} className="flex items-center gap-3 py-1.5 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={selectedFieldKeys.has(f.key)}
                      onChange={() =>
                        setSelectedFieldKeys((prev) => {
                          const next = new Set(prev);
                          if (next.has(f.key)) next.delete(f.key);
                          else next.add(f.key);
                          return next;
                        })
                      }
                      className="w-5 h-5 accent-mcm-mustard shrink-0"
                    />
                    <span className="text-base text-mcm-charcoal">{f.label}</span>
                  </label>
                ))}
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
