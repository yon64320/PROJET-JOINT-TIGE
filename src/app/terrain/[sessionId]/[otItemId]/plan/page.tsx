"use client";

import { use, useEffect, useState } from "react";
import { TerrainLayout } from "@/components/terrain/TerrainLayout";
import { PlanViewer } from "@/components/terrain/PlanViewer";
import { offlineDb, type OfflinePlan } from "@/lib/offline/db";

export default function PlanPage({
  params,
}: {
  params: Promise<{ sessionId: string; otItemId: string }>;
}) {
  const { sessionId, otItemId } = use(params);
  const [plans, setPlans] = useState<OfflinePlan[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Plans : spécifiques à l'OT OU projet général (ot_item_id null).
    // Dexie n'indexe pas null → filtrage côté JS après where(session_id).
    offlineDb.plans
      .where("session_id")
      .equals(sessionId)
      .toArray()
      .then((all) => {
        const relevant = all
          .filter((p) => p.ot_item_id === otItemId || p.ot_item_id === null)
          // Plans spécifiques en premier, puis projet général
          .sort((a, b) => {
            if (a.ot_item_id === b.ot_item_id) return a.filename.localeCompare(b.filename);
            return a.ot_item_id === null ? 1 : -1;
          });
        setPlans(relevant);
        setSelectedId(relevant[0]?.id ?? null);
        setLoading(false);
      });
  }, [sessionId, otItemId]);

  const selected = plans.find((p) => p.id === selectedId) ?? null;

  return (
    <TerrainLayout title="Plan" backHref={`/terrain/${sessionId}/${otItemId}`} backLabel="Brides">
      {loading ? (
        <div className="flex items-center justify-center py-12 text-mcm-warm-gray">
          Chargement...
        </div>
      ) : plans.length === 0 ? (
        <div className="flex items-center justify-center py-12 text-mcm-warm-gray">
          Aucun plan disponible.
        </div>
      ) : (
        <>
          {plans.length > 1 && (
            <div className="px-4 py-2 border-b border-slate-200 bg-white">
              <select
                value={selectedId ?? ""}
                onChange={(e) => setSelectedId(e.target.value)}
                className="w-full min-h-[44px] px-3 rounded-lg border border-slate-300 text-sm bg-white"
              >
                {plans.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.ot_item_id === null ? "[Projet] " : ""}
                    {p.filename}
                  </option>
                ))}
              </select>
            </div>
          )}
          <PlanViewer pdfBlob={selected?.blob ?? null} filename={selected?.filename ?? ""} />
        </>
      )}
    </TerrainLayout>
  );
}
