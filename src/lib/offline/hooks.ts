"use client";

import { useState, useEffect, useCallback, useRef, useSyncExternalStore } from "react";
import { offlineDb, type OfflineSession, type OfflineOtItem, type OfflineFlange } from "./db";
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
      await offlineDb.mutations.add({
        session_id: sessionId,
        flange_id: flangeId,
        field,
        value,
        timestamp: now,
        synced: false,
      });

      // Register Background Sync (Couche 5 — Android)
      // navigator.serviceWorker.ready hangs forever if no SW is registered — never await it directly
      try {
        const sw = navigator.serviceWorker;
        if (sw?.controller) {
          const reg = await sw.ready;
          await (reg as any)?.sync?.register("terrain-sync");
        }
      } catch {
        // Not supported (Safari) — silent fail
      }
    },
    [sessionId, flangeId],
  );

  return mutate;
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
        const { pushMutations } = await import("./sync");
        const result = await pushMutations(sessionId, token);
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
