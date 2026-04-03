"use client";

import { createContext, useContext, type ReactNode } from "react";
import { useOfflineSession, useOnlineStatus } from "./hooks";
import type { OfflineSession } from "./db";

interface SessionContextValue {
  session: OfflineSession | null;
  sessionLoading: boolean;
  isOnline: boolean;
}

const SessionContext = createContext<SessionContextValue>({
  session: null,
  sessionLoading: true,
  isOnline: true,
});

export function SessionProvider({
  sessionId,
  children,
}: {
  sessionId: string;
  children: ReactNode;
}) {
  const { session, loading } = useOfflineSession(sessionId);
  const isOnline = useOnlineStatus();

  return (
    <SessionContext.Provider value={{ session, sessionLoading: loading, isOnline }}>
      {children}
    </SessionContext.Provider>
  );
}

export function useSessionContext() {
  return useContext(SessionContext);
}
