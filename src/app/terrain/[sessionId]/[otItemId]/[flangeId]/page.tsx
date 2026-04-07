"use client";

import { use, useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { TerrainLayout } from "@/components/terrain/TerrainLayout";
import { DataEntryWizard } from "@/components/terrain/DataEntryWizard";
import { offlineDb, type OfflineFlange } from "@/lib/offline/db";

export default function WizardPage({
  params,
}: {
  params: Promise<{ sessionId: string; otItemId: string; flangeId: string }>;
}) {
  const { sessionId, otItemId, flangeId } = use(params);
  const router = useRouter();
  const [flange, setFlange] = useState<OfflineFlange | null>(null);

  useEffect(() => {
    offlineDb.flanges.get(flangeId).then((f) => setFlange(f ?? null));
  }, [flangeId]);

  const handleComplete = useCallback(() => {
    router.push(`/terrain/${sessionId}/${otItemId}`);
  }, [router, sessionId, otItemId]);

  const handleBack = useCallback(() => {
    router.push(`/terrain/${sessionId}/${otItemId}`);
  }, [router, sessionId, otItemId]);

  if (!flange) {
    return (
      <TerrainLayout title="Chargement..." backHref={`/terrain/${sessionId}/${otItemId}`}>
        <div className="flex items-center justify-center py-12 text-mcm-warm-gray">
          Chargement...
        </div>
      </TerrainLayout>
    );
  }

  return (
    <TerrainLayout
      title={flange.repere_buta ?? flange.nom ?? "Bride"}
      backHref={`/terrain/${sessionId}/${otItemId}`}
      backLabel="Brides"
    >
      <DataEntryWizard
        sessionId={sessionId}
        flange={flange}
        onComplete={handleComplete}
        onBack={handleBack}
      />
    </TerrainLayout>
  );
}
