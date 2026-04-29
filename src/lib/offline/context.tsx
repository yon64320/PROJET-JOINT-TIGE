"use client";

import { createContext, useContext, type ReactNode } from "react";
import { useOfflineSession, useSyncEngine } from "./hooks";
import type { OfflineSession } from "./db";
import type { SyncResult } from "./sync";

interface SessionContextValue {
  session: OfflineSession | null;
  sessionLoading: boolean;
  isOnline: boolean;
  pendingCount: number;
  syncing: boolean;
  pushSync: (token: string) => Promise<SyncResult>;
  autoSyncResult: SyncResult | null;
  clearAutoSyncResult: () => void;
}

const SessionContext = createContext<SessionContextValue>({
  session: null,
  sessionLoading: true,
  isOnline: true,
  pendingCount: 0,
  syncing: false,
  pushSync: async () => ({ applied: [], conflicts: [], errors: [] }),
  autoSyncResult: null,
  clearAutoSyncResult: () => {},
});

export function SessionProvider({
  sessionId,
  children,
}: {
  sessionId: string;
  children: ReactNode;
}) {
  const { session, loading } = useOfflineSession(sessionId);
  const { pendingCount, syncing, isOnline, pushSync, autoSyncResult, clearAutoSyncResult } =
    useSyncEngine(sessionId);

  return (
    <SessionContext.Provider
      value={{
        session,
        sessionLoading: loading,
        isOnline,
        pendingCount,
        syncing,
        pushSync,
        autoSyncResult,
        clearAutoSyncResult,
      }}
    >
      {children}
    </SessionContext.Provider>
  );
}

export function useSessionContext() {
  return useContext(SessionContext);
}
