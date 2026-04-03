"use client";

import { use, useState } from "react";
import { TerrainLayout } from "@/components/terrain/TerrainLayout";
import { SyncPanel } from "@/components/terrain/SyncPanel";
import { useSessionContext } from "@/lib/offline/context";
import { useSyncEngine } from "@/lib/offline/hooks";
import { createBrowserSupabase } from "@/lib/db/supabase-browser";

export default function SyncPage({ params }: { params: Promise<{ sessionId: string }> }) {
  const { sessionId } = use(params);
  const { session } = useSessionContext();
  const { pendingCount, syncing, isOnline, pushSync } = useSyncEngine(sessionId);
  const [lastResult, setLastResult] = useState<{
    applied: unknown[];
    conflicts: unknown[];
    errors: { mutation: unknown; error: string }[];
  } | null>(null);

  const handleSync = async () => {
    const supabase = createBrowserSupabase();
    const {
      data: { session: authSession },
    } = await supabase.auth.getSession();
    if (!authSession) {
      alert("Session expirée. Reconnectez-vous.");
      return;
    }
    const result = await pushSync(authSession.access_token);
    setLastResult(result);
  };

  return (
    <TerrainLayout
      title="Synchronisation"
      backHref={`/terrain/${sessionId}`}
      backLabel={session?.name ?? "Session"}
    >
      <SyncPanel
        pendingCount={pendingCount}
        syncing={syncing}
        isOnline={isOnline}
        onSync={handleSync}
        lastSyncResult={lastResult}
      />
    </TerrainLayout>
  );
}
