"use client";

import { useCallback, useEffect, useRef, useState } from "react";

export type SaveStatus = "idle" | "saving" | "saved" | "error";

interface UseSheetSyncOptions {
  apiEndpoint: string; // "/api/ot-items" or "/api/flanges"
  autoSaveDelay?: number; // ms, default 800
}

export function useSheetSync({ apiEndpoint, autoSaveDelay = 800 }: UseSheetSyncOptions) {
  const pendingChanges = useRef(new Map<string, Record<string, unknown>>());
  const [pendingCount, setPendingCount] = useState(0);
  const [saveStatus, setSaveStatus] = useState<SaveStatus>("idle");
  const timerRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  const flushChanges = useCallback(async () => {
    clearTimeout(timerRef.current);
    const changes = Array.from(pendingChanges.current.values());
    if (changes.length === 0) return;

    // Snapshot avant clear pour restauration en cas d'erreur
    const snapshot = new Map(pendingChanges.current);
    pendingChanges.current.clear();
    setPendingCount(0);
    setSaveStatus("saving");

    try {
      const results = await Promise.all(
        changes.map((change) =>
          fetch(apiEndpoint, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(change),
          }),
        ),
      );
      for (const res of results) {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
      }
      setSaveStatus("saved");
      setTimeout(() => setSaveStatus("idle"), 2000);
    } catch {
      // Restaurer les changements échoués pour retry
      for (const [k, v] of snapshot) {
        if (!pendingChanges.current.has(k)) {
          pendingChanges.current.set(k, v);
        }
      }
      setPendingCount(pendingChanges.current.size);
      setSaveStatus("error");
    }
  }, [apiEndpoint]);

  const trackChange = useCallback(
    (key: string, change: Record<string, unknown>) => {
      pendingChanges.current.set(key, change);
      setPendingCount(pendingChanges.current.size);
      // Auto-save debounce
      clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => flushChanges(), autoSaveDelay);
    },
    [flushChanges, autoSaveDelay],
  );

  // Cleanup timer on unmount
  useEffect(() => {
    return () => clearTimeout(timerRef.current);
  }, []);

  return { pendingChanges, pendingCount, saveStatus, trackChange, flushChanges };
}
