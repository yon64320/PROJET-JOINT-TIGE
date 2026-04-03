"use client";

import { use, useEffect, useState } from "react";
import { TerrainLayout } from "@/components/terrain/TerrainLayout";
import { PlanViewer } from "@/components/terrain/PlanViewer";
import { offlineDb } from "@/lib/offline/db";

export default function PlanPage({
  params,
}: {
  params: Promise<{ sessionId: string; otItemId: string }>;
}) {
  const { sessionId, otItemId } = use(params);
  const [plan, setPlan] = useState<{ blob: Blob; filename: string } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    offlineDb.plans
      .where({ session_id: sessionId, ot_item_id: otItemId })
      .first()
      .then((p) => {
        if (p) setPlan({ blob: p.blob, filename: p.filename });
        setLoading(false);
      });
  }, [sessionId, otItemId]);

  return (
    <TerrainLayout title="Plan" backHref={`/terrain/${sessionId}/${otItemId}`} backLabel="Brides">
      {loading ? (
        <div className="flex items-center justify-center py-12 text-mcm-warm-gray">
          Chargement...
        </div>
      ) : (
        <PlanViewer pdfBlob={plan?.blob ?? null} filename={plan?.filename ?? ""} />
      )}
    </TerrainLayout>
  );
}
