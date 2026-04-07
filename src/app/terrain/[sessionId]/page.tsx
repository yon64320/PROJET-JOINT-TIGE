"use client";

import { use } from "react";
import { useRouter } from "next/navigation";
import { TerrainLayout } from "@/components/terrain/TerrainLayout";
import { EquipmentCard } from "@/components/terrain/EquipmentCard";
import { useSessionContext } from "@/lib/offline/context";
import { useOfflineEquipment } from "@/lib/offline/hooks";

export default function EquipmentListPage({ params }: { params: Promise<{ sessionId: string }> }) {
  const { sessionId } = use(params);
  const router = useRouter();
  const { session } = useSessionContext();
  const { items, loading } = useOfflineEquipment(sessionId);

  return (
    <TerrainLayout title={session?.name ?? "Session"} backHref="/terrain" backLabel="Sessions">
      <div className="p-4 space-y-3">
        {loading ? (
          <div className="flex items-center justify-center py-12 text-mcm-warm-gray">
            Chargement...
          </div>
        ) : items.length === 0 ? (
          <p className="text-center py-12 text-mcm-warm-gray">
            Aucun équipement dans cette session.
          </p>
        ) : (
          items.map((ot) => (
            <EquipmentCard
              key={ot.id}
              item={ot.item}
              unite={ot.unite}
              flangeCount={ot.flange_count}
              completedCount={ot.completedCount}
              onClick={() => router.push(`/terrain/${sessionId}/${ot.id}`)}
            />
          ))
        )}
      </div>
    </TerrainLayout>
  );
}
