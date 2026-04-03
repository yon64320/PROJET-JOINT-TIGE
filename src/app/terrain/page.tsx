"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { TerrainLayout } from "@/components/terrain/TerrainLayout";
import { SessionCard } from "@/components/terrain/SessionCard";
import { createBrowserSupabase } from "@/lib/db/supabase-browser";
import { downloadSession } from "@/lib/offline/sync";
import { offlineDb } from "@/lib/offline/db";

interface ServerSession {
  id: string;
  name: string;
  status: string;
  downloaded_at: string | null;
  field_session_items: { ot_item_id: string }[];
}

export default function TerrainHome() {
  const router = useRouter();
  const [sessions, setSessions] = useState<ServerSession[]>([]);
  const [offlineSessions, setOfflineSessions] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [downloading, setDownloading] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);

  // Load sessions
  const loadSessions = useCallback(async () => {
    try {
      const supabase = createBrowserSupabase();
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session) return;

      // Get all projects for this user, then sessions
      const { data: projects } = await supabase
        .from("projects")
        .select("id")
        .eq("owner_id", session.user.id);

      if (!projects?.length) return;

      const { data } = await supabase
        .from("field_sessions")
        .select("*, field_session_items(ot_item_id)")
        .in(
          "project_id",
          projects.map((p) => p.id),
        )
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
  }, []);

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

  return (
    <TerrainLayout title="Sessions terrain" backHref="/projets" backLabel="Projets">
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

        {/* Quick create (simple modal) */}
        {showCreate && (
          <CreateSessionModal
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

function CreateSessionModal({ onClose }: { onClose: () => void }) {
  const [name, setName] = useState("");
  const [projectId, setProjectId] = useState("");
  const [projects, setProjects] = useState<{ id: string; name: string }[]>([]);
  const [otItems, setOtItems] = useState<{ id: string; item: string; selected: boolean }[]>([]);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const supabase = createBrowserSupabase();
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) return;
      supabase
        .from("projects")
        .select("id, name")
        .eq("owner_id", session.user.id)
        .then(({ data }) => setProjects(data ?? []));
    });
  }, []);

  useEffect(() => {
    if (!projectId) return;
    const supabase = createBrowserSupabase();
    supabase
      .from("ot_items")
      .select("id, item")
      .eq("project_id", projectId)
      .order("item")
      .then(({ data }) => setOtItems((data ?? []).map((ot) => ({ ...ot, selected: true }))));
  }, [projectId]);

  const handleCreate = async () => {
    const selectedIds = otItems.filter((o) => o.selected).map((o) => o.id);
    if (!name || !projectId || selectedIds.length === 0) return;

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
        body: JSON.stringify({ projectId, name, otItemIds: selectedIds }),
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

  const toggleAll = () => {
    const allSelected = otItems.every((o) => o.selected);
    setOtItems((items) => items.map((o) => ({ ...o, selected: !allSelected })));
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-end sm:items-center justify-center">
      <div className="bg-mcm-cream w-full max-w-lg rounded-t-2xl sm:rounded-2xl max-h-[85vh] flex flex-col">
        <div className="p-4 border-b border-mcm-warm-gray-border flex items-center justify-between">
          <h2 className="text-lg font-bold text-mcm-charcoal">Nouvelle session</h2>
          <button
            onClick={onClose}
            className="w-10 h-10 flex items-center justify-center text-mcm-warm-gray"
          >
            &times;
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
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
          <div>
            <label className="text-sm text-mcm-warm-gray">Projet</label>
            <select
              value={projectId}
              onChange={(e) => setProjectId(e.target.value)}
              className="mt-1 w-full h-12 px-3 rounded-xl border border-mcm-warm-gray-border bg-white text-lg"
            >
              <option value="">Sélectionner...</option>
              {projects.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </div>
          {otItems.length > 0 && (
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-sm text-mcm-warm-gray">
                  Équipements ({otItems.filter((o) => o.selected).length}/{otItems.length})
                </label>
                <button onClick={toggleAll} className="text-sm text-mcm-mustard font-medium">
                  Tout {otItems.every((o) => o.selected) ? "dé" : ""}sélectionner
                </button>
              </div>
              <div className="space-y-1 max-h-48 overflow-y-auto">
                {otItems.map((ot) => (
                  <label
                    key={ot.id}
                    className="flex items-center gap-3 p-2 rounded-lg hover:bg-white cursor-pointer"
                  >
                    <input
                      type="checkbox"
                      checked={ot.selected}
                      onChange={() =>
                        setOtItems((items) =>
                          items.map((o) => (o.id === ot.id ? { ...o, selected: !o.selected } : o)),
                        )
                      }
                      className="w-5 h-5 accent-mcm-mustard"
                    />
                    <span className="text-base text-mcm-charcoal">{ot.item}</span>
                  </label>
                ))}
              </div>
            </div>
          )}
        </div>
        <div className="p-4 border-t border-mcm-warm-gray-border space-y-2">
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-xl">
              <p className="text-sm text-red-700">{error}</p>
            </div>
          )}
          <button
            onClick={handleCreate}
            disabled={
              creating || !name || !projectId || otItems.filter((o) => o.selected).length === 0
            }
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
