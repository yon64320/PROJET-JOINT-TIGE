"use client";

import { SessionProvider, useSessionContext } from "@/lib/offline/context";
import { TerrainLayout } from "@/components/terrain/TerrainLayout";
import { use, type ReactNode } from "react";

export default function SessionLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<Record<string, string>>;
}) {
  const resolved = use(params);
  const sessionId = resolved.sessionId ?? "";

  return (
    <SessionProvider sessionId={sessionId}>
      <SessionGate>{children}</SessionGate>
    </SessionProvider>
  );
}

function SessionGate({ children }: { children: ReactNode }) {
  const { session, sessionLoading, isOnline } = useSessionContext();

  if (sessionLoading) {
    return (
      <TerrainLayout title="Session" backHref="/projets" backLabel="Projets">
        <div className="flex items-center justify-center py-12 text-mcm-warm-gray">
          Chargement...
        </div>
      </TerrainLayout>
    );
  }

  if (!session) {
    return (
      <TerrainLayout title="Session non disponible" backHref="/projets" backLabel="Projets">
        <div className="p-6 text-center space-y-3">
          <p className="text-mcm-charcoal">
            Cette session n&apos;est pas téléchargée sur cet appareil.
          </p>
          <p className="text-sm text-mcm-warm-gray">
            {isOnline
              ? "Retournez à la liste des sessions et téléchargez-la avant de l'ouvrir."
              : "Connectez-vous à internet pour télécharger la session."}
          </p>
        </div>
      </TerrainLayout>
    );
  }

  return <>{children}</>;
}
