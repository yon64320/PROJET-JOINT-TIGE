"use client";

import { useState, useEffect, useCallback, useRef, useSyncExternalStore } from "react";
import {
  offlineDb,
  type OfflineSession,
  type OfflineOtItem,
  type OfflineFlange,
  type OfflineMutation,
  type PendingPhoto,
} from "./db";
import { predictBoltSpec } from "./predictions";
import type { OfflineBoltSpec } from "./db";
import type { SyncResult } from "./sync";

// ---- useOnlineStatus ----

function subscribeOnline(cb: () => void) {
  window.addEventListener("online", cb);
  window.addEventListener("offline", cb);
  return () => {
    window.removeEventListener("online", cb);
    window.removeEventListener("offline", cb);
  };
}

function getOnlineSnapshot() {
  return navigator.onLine;
}

function getOnlineServerSnapshot() {
  return true; // SSR assumes online
}

export function useOnlineStatus(): boolean {
  return useSyncExternalStore(subscribeOnline, getOnlineSnapshot, getOnlineServerSnapshot);
}

// ---- useOfflineSession ----

export function useOfflineSession(sessionId: string) {
  const [session, setSession] = useState<OfflineSession | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    offlineDb.sessions
      .get(sessionId)
      .then((s) => setSession(s ?? null))
      .finally(() => setLoading(false));
  }, [sessionId]);

  return { session, loading };
}

// ---- useOfflineEquipment ----

export function useOfflineEquipment(sessionId: string) {
  const [items, setItems] = useState<(OfflineOtItem & { completedCount: number })[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    const otItems = await offlineDb.otItems.where("session_id").equals(sessionId).toArray();

    const withProgress = await Promise.all(
      otItems.map(async (ot) => {
        const completedCount = await offlineDb.flanges
          .where({ ot_item_id: ot.id, field_status: "completed" })
          .filter((f) => !f._deleted)
          .count();
        return { ...ot, completedCount };
      }),
    );

    setItems(withProgress);
    setLoading(false);
  }, [sessionId]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return { items, loading, refresh };
}

// ---- useOfflineFlanges ----

export function useOfflineFlanges(sessionId: string, otItemId: string) {
  const [flanges, setFlanges] = useState<OfflineFlange[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    const data = await offlineDb.flanges
      .where({ session_id: sessionId, ot_item_id: otItemId })
      .filter((f) => !f._deleted)
      .toArray();
    setFlanges(data);
    setLoading(false);
  }, [sessionId, otItemId]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return { flanges, loading, refresh };
}

// ---- useBoltPrediction ----

export function useBoltPrediction(dn: number | null, pn: string | null, faceType: string | null) {
  const [prediction, setPrediction] = useState<OfflineBoltSpec | null>(null);

  useEffect(() => {
    if (dn == null || pn == null || !faceType || !["RF", "RTJ"].includes(faceType)) {
      setPrediction(null);
      return;
    }
    predictBoltSpec(dn, pn, faceType as "RF" | "RTJ").then((spec) => setPrediction(spec ?? null));
  }, [dn, pn, faceType]);

  return prediction;
}

// ---- useOfflineMutate ----

export function useOfflineMutate(sessionId: string, flangeId: string) {
  const mutate = useCallback(
    async (field: string, value: string | number | boolean | null) => {
      const now = new Date().toISOString();

      // Update the flange locally
      await offlineDb.flanges.update(flangeId, {
        [field]: value,
        dirty: true,
        last_modified_local: now,
      });

      // Append to mutations queue
      const mutation: OfflineMutation = {
        type: "update",
        session_id: sessionId,
        flange_id: flangeId,
        field,
        value,
        timestamp: now,
        synced: false,
      };
      await offlineDb.mutations.add(mutation);

      // Register Background Sync (Couche 5 — Android)
      // navigator.serviceWorker.ready hangs forever if no SW is registered — never await it directly
      try {
        const sw = navigator.serviceWorker;
        if (sw?.controller) {
          const reg = await sw.ready;
          await (
            reg as ServiceWorkerRegistration & {
              sync?: { register: (tag: string) => Promise<void> };
            }
          )?.sync?.register("terrain-sync");
        }
      } catch {
        // Not supported (Safari) — silent fail
      }
    },
    [sessionId, flangeId],
  );

  return mutate;
}

// ---- addLocalFlange / deleteLocalFlange ----

/**
 * Crée une bride locale dans une session terrain hors-ligne.
 * Renvoie l'id temporaire `temp_<uuid>` que l'UI utilise tant que la
 * bride n'a pas été synchronisée. Au sync, l'id est remplacé par celui
 * généré côté serveur (mapping renvoyé par /api/terrain/sync).
 */
export async function addLocalFlange(
  sessionId: string,
  otItemId: string,
  initialFields: Record<string, string | number | boolean | null> = {},
): Promise<string> {
  const tempId = `temp_${crypto.randomUUID()}`;
  const now = new Date().toISOString();

  // Insert dans le store local (les champs absents prennent null/false par défaut).
  await offlineDb.flanges.add({
    id: tempId,
    session_id: sessionId,
    ot_item_id: otItemId,
    nom: (initialFields.nom as string | null | undefined) ?? null,
    repere_buta: (initialFields.repere_buta as string | null | undefined) ?? null,
    repere_emis: (initialFields.repere_emis as string | null | undefined) ?? null,
    dn_emis: null,
    dn_buta: null,
    pn_emis: null,
    pn_buta: null,
    operation: null,
    face_bride_emis: null,
    face_bride_buta: null,
    nb_tiges_emis: null,
    nb_tiges_buta: null,
    dimension_tige_emis: null,
    dimension_tige_buta: null,
    cle: null,
    matiere_tiges_emis: null,
    matiere_joint_emis: null,
    rondelle_emis: null,
    rondelle_buta: null,
    nb_joints_prov_emis: null,
    nb_joints_prov_buta: null,
    nb_joints_def_emis: null,
    nb_joints_def_buta: null,
    commentaires: null,
    calorifuge: false,
    echafaudage: false,
    echaf_longueur: null,
    echaf_largeur: null,
    echaf_hauteur: null,
    field_status: "pending",
    dirty: true,
    last_modified_local: now,
    _local: true,
  });

  const createMut: OfflineMutation = {
    type: "create",
    session_id: sessionId,
    flange_id: tempId,
    ot_item_id: otItemId,
    initial_fields: initialFields,
    timestamp: now,
    synced: false,
  };
  await offlineDb.mutations.add(createMut);

  return tempId;
}

/**
 * Supprime une bride d'une session terrain.
 * - Bride locale (`temp_<uuid>`) : retrait pur du store + retrait des
 *   mutations en attente (annulation).
 * - Bride existante en base : marquée `_deleted=true` localement (pour
 *   masquer en UI) + push d'une mutation `delete`.
 */
export async function deleteLocalFlange(flangeId: string): Promise<void> {
  const flange = await offlineDb.flanges.get(flangeId);
  if (!flange) return;

  if (flangeId.startsWith("temp_")) {
    // Annulation pure — la bride n'a jamais été en base.
    await offlineDb.flanges.delete(flangeId);
    await offlineDb.mutations.where({ flange_id: flangeId }).delete();
    return;
  }

  // Bride existante : marque suppression + queue mutation.
  await offlineDb.flanges.update(flangeId, { _deleted: true, dirty: true });
  const deleteMut: OfflineMutation = {
    type: "delete",
    session_id: flange.session_id,
    flange_id: flangeId,
    timestamp: new Date().toISOString(),
    synced: false,
  };
  await offlineDb.mutations.add(deleteMut);
}

// ---- Photos terrain (pendingPhotos) ----

export type PhotoType = "bride" | "echafaudage" | "calorifuge";

/**
 * Ajoute une photo en attente d'upload dans la file locale.
 * Génère un UUID utilisé comme basename de storage path côté serveur.
 * La clé naturelle (item, repere) est capturée pour permettre le
 * re-rattachement après un éventuel ré-import J&T.
 */
export async function addPendingPhoto(
  sessionId: string,
  flangeId: string,
  type: PhotoType,
  blob: Blob,
  flangeName: string | null,
  flangeRepere: string | null,
  naturalItem: string,
  naturalCote: string | null = null,
): Promise<string> {
  const cleanName = (flangeName ?? "X").replace(/[^A-Za-z0-9_-]/g, "");
  const cleanRepere = (flangeRepere ?? "").replace(/[^A-Za-z0-9_-]/g, "");
  const displayName = cleanRepere ? `${cleanName}_${cleanRepere}` : cleanName;

  const photoId = crypto.randomUUID();
  await offlineDb.pendingPhotos.add({
    id: photoId,
    session_id: sessionId,
    flange_id: flangeId,
    type,
    blob,
    display_name: displayName,
    natural_item: naturalItem,
    natural_repere: flangeRepere,
    natural_cote: naturalCote,
    size_bytes: blob.size,
    taken_at: new Date().toISOString(),
    uploaded: false,
  });
  return photoId;
}

/**
 * Supprime une photo en attente (avant ou après upload).
 * Si la photo a déjà été uploadée, la suppression locale ne supprime PAS
 * le fichier serveur — un /api/terrain/photos DELETE serait nécessaire
 * (hors-scope V1).
 */
export async function deletePendingPhoto(photoId: string): Promise<void> {
  await offlineDb.pendingPhotos.delete(photoId);
}

/**
 * Hook : photos liées à une bride pour un type donné, ordre par taken_at.
 */
export function usePendingPhotos(flangeId: string, type: PhotoType) {
  const [photos, setPhotos] = useState<PendingPhoto[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    const data = await offlineDb.pendingPhotos
      .where("[flange_id+type]")
      .equals([flangeId, type])
      .toArray();
    data.sort((a, b) => a.taken_at.localeCompare(b.taken_at));
    setPhotos(data);
    setLoading(false);
  }, [flangeId, type]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return { photos, loading, refresh };
}

// ---- useBeforeUnloadWarning ----

export function useBeforeUnloadWarning(pendingCount: number) {
  useEffect(() => {
    if (pendingCount <= 0) return;

    const handler = (e: BeforeUnloadEvent) => {
      e.preventDefault();
    };

    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [pendingCount]);
}

// ---- useSyncEngine ----

export function useSyncEngine(sessionId: string) {
  const [pendingCount, setPendingCount] = useState(0);
  const [syncing, setSyncing] = useState(false);
  const [autoSyncResult, setAutoSyncResult] = useState<SyncResult | null>(null);
  const isOnline = useOnlineStatus();
  const prevOnlineRef = useRef(isOnline);
  const didInitialSyncRef = useRef(false);
  const syncingRef = useRef(false);

  // Keep syncingRef in sync with state
  useEffect(() => {
    syncingRef.current = syncing;
  }, [syncing]);

  const refreshCount = useCallback(async () => {
    const count = await offlineDb.mutations
      .where("session_id")
      .equals(sessionId)
      .filter((m) => !m.synced)
      .count();
    setPendingCount(count);
    return count;
  }, [sessionId]);

  const pushSync = useCallback(
    async (token: string): Promise<SyncResult> => {
      setSyncing(true);
      try {
        const { pushMutations, pushPendingPhotos } = await import("./sync");
        const result = await pushMutations(sessionId, token);
        // Photos après mutations : les remap temp_→serverId sont déjà faits
        // par pushMutations (transaction Dexie). Erreurs photos non bloquantes.
        try {
          await pushPendingPhotos(sessionId, token);
        } catch {
          // Network/HTTP error — réessai au prochain sync
        }
        await refreshCount();
        return result;
      } finally {
        setSyncing(false);
      }
    },
    [sessionId, refreshCount],
  );

  // Auto-sync helper: get token and push
  const autoSync = useCallback(async () => {
    if (syncingRef.current) return;
    const count = await offlineDb.mutations
      .where("session_id")
      .equals(sessionId)
      .filter((m) => !m.synced)
      .count();
    if (count === 0) return;

    const { getAuthToken } = await import("./sync");
    const token = await getAuthToken();
    if (!token) return; // Not authenticated — skip silently

    try {
      const result = await pushSync(token);
      setAutoSyncResult(result);
    } catch {
      // Network error — will retry later
    }
  }, [sessionId, pushSync]);

  // Couche 2: Auto-sync on reconnect (offline → online)
  useEffect(() => {
    const wasOffline = !prevOnlineRef.current;
    prevOnlineRef.current = isOnline;

    if (wasOffline && isOnline) {
      const timer = setTimeout(autoSync, 2000);
      return () => clearTimeout(timer);
    }
  }, [isOnline, autoSync]);

  // Couche 3: Periodic sync every 30s
  useEffect(() => {
    const interval = setInterval(() => {
      if (isOnline && !syncingRef.current) {
        autoSync();
      }
    }, 120_000);
    return () => clearInterval(interval);
  }, [isOnline, autoSync]);

  // Refresh pending count every 5s (UI only)
  useEffect(() => {
    refreshCount();
    const interval = setInterval(refreshCount, 5000);
    return () => clearInterval(interval);
  }, [refreshCount]);

  // Couche 5: Listen for Service Worker TRIGGER_SYNC messages
  useEffect(() => {
    const handler = (event: MessageEvent) => {
      if (event.data?.type === "TRIGGER_SYNC") {
        autoSync();
      }
    };
    navigator.serviceWorker?.addEventListener("message", handler);
    return () => navigator.serviceWorker?.removeEventListener("message", handler);
  }, [autoSync]);

  // Bonus: Initial sync on mount if online with pending mutations
  useEffect(() => {
    if (didInitialSyncRef.current) return;
    didInitialSyncRef.current = true;

    if (isOnline) {
      // Small delay to let the page settle
      const timer = setTimeout(autoSync, 1000);
      return () => clearTimeout(timer);
    }
  }, [isOnline, autoSync]);

  const clearAutoSyncResult = useCallback(() => setAutoSyncResult(null), []);

  return {
    pendingCount,
    syncing,
    isOnline,
    pushSync,
    refreshCount,
    autoSyncResult,
    clearAutoSyncResult,
  };
}
