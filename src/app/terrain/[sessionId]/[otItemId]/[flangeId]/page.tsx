"use client";

import { use, useEffect, useState } from "react";
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
        onComplete={() => router.push(`/terrain/${sessionId}/${otItemId}`)}
        onBack={() => router.push(`/terrain/${sessionId}/${otItemId}`)}
      />
    </TerrainLayout>
  );
}
