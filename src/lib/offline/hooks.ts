"use client";

import { useState, useEffect, useCallback, useSyncExternalStore } from "react";
import { offlineDb, type OfflineSession, type OfflineOtItem, type OfflineFlange } from "./db";
import { predictBoltSpec } from "./predictions";
import type { OfflineBoltSpec } from "./db";

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
    },
    [sessionId, flangeId],
  );

  return mutate;
}

// ---- useSyncEngine ----

export function useSyncEngine(sessionId: string) {
  const [pendingCount, setPendingCount] = useState(0);
  const [syncing, setSyncing] = useState(false);
  const isOnline = useOnlineStatus();

  const refreshCount = useCallback(async () => {
    const count = await offlineDb.mutations
      .where("session_id")
      .equals(sessionId)
      .filter((m) => !m.synced)
      .count();
    setPendingCount(count);
  }, [sessionId]);

  useEffect(() => {
    refreshCount();
    // Refresh count periodically
    const interval = setInterval(refreshCount, 5000);
    return () => clearInterval(interval);
  }, [refreshCount]);

  const pushSync = useCallback(
    async (token: string) => {
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

  return { pendingCount, syncing, isOnline, pushSync, refreshCount };
}
