"use client";

import { useEffect, useState } from "react";
import { useSessionContext } from "@/lib/offline/context";

export function AutoSyncToast() {
  const { autoSyncResult, clearAutoSyncResult } = useSessionContext();
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!autoSyncResult) {
      setVisible(false);
      return;
    }

    setVisible(true);
    const timer = setTimeout(() => {
      setVisible(false);
      clearAutoSyncResult();
    }, 5000);

    return () => clearTimeout(timer);
  }, [autoSyncResult, clearAutoSyncResult]);

  if (!visible || !autoSyncResult) return null;

  const appliedCount = autoSyncResult.applied.length;
  const errorCount = autoSyncResult.errors.length;
  const hasErrors = errorCount > 0;

  return (
    <div
      className={`fixed bottom-4 left-4 right-4 z-50 rounded-lg px-4 py-3 text-sm font-medium shadow-lg transition-opacity ${
        hasErrors ? "bg-red-600 text-white" : "bg-emerald-600 text-white"
      }`}
    >
      {hasErrors
        ? `${errorCount} erreur${errorCount > 1 ? "s" : ""} de synchronisation`
        : `${appliedCount} modification${appliedCount > 1 ? "s" : ""} synchronisée${appliedCount > 1 ? "s" : ""}`}
    </div>
  );
}
