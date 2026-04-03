"use client";

import { use } from "react";
import { useRouter } from "next/navigation";
import { TerrainLayout } from "@/components/terrain/TerrainLayout";
import { BrideCard } from "@/components/terrain/BrideCard";
import { useOfflineFlanges, useOfflineEquipment } from "@/lib/offline/hooks";
import { offlineDb } from "@/lib/offline/db";
import { useEffect, useState } from "react";

export default function FlangeListPage({
  params,
}: {
  params: Promise<{ sessionId: string; otItemId: string }>;
}) {
  const { sessionId, otItemId } = use(params);
  const router = useRouter();
  const { flanges, loading } = useOfflineFlanges(sessionId, otItemId);
  const [itemName, setItemName] = useState("");
  const [hasPlan, setHasPlan] = useState(false);

  useEffect(() => {
    offlineDb.otItems.get(otItemId).then((ot) => setItemName(ot?.item ?? ""));
    offlineDb.plans
      .where("ot_item_id")
      .equals(otItemId)
      .count()
      .then((c) => setHasPlan(c > 0));
  }, [otItemId]);

  return (
    <TerrainLayout
      title={itemName || "Brides"}
      backHref={`/terrain/${sessionId}`}
      backLabel="Équipements"
      actions={
        hasPlan ? (
          <a
            href={`/terrain/${sessionId}/${otItemId}/plan`}
            className="px-3 py-1.5 rounded-lg bg-blue-100 text-blue-700 text-xs font-semibold"
          >
            Plan
          </a>
        ) : undefined
      }
    >
      <div className="p-4 space-y-2">
        {loading ? (
          <div className="flex items-center justify-center py-12 text-mcm-warm-gray">
            Chargement...
          </div>
        ) : flanges.length === 0 ? (
          <p className="text-center py-12 text-mcm-warm-gray">Aucune bride pour cet équipement.</p>
        ) : (
          flanges.map((f) => (
            <BrideCard
              key={f.id}
              repere={f.repere_buta ?? f.repere_emis}
              nom={f.nom}
              dnButa={f.dn_buta}
              pnButa={f.pn_buta}
              fieldStatus={f.field_status}
              onClick={() => router.push(`/terrain/${sessionId}/${otItemId}/${f.id}`)}
            />
          ))
        )}
      </div>
    </TerrainLayout>
  );
}
