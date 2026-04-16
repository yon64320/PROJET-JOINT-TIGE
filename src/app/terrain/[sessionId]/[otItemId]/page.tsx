"use client";

import { use, useCallback } from "react";
import { useRouter } from "next/navigation";
import { TerrainLayout } from "@/components/terrain/TerrainLayout";
import { BrideCard } from "@/components/terrain/BrideCard";
import { useOfflineFlanges } from "@/lib/offline/hooks";
import { offlineDb } from "@/lib/offline/db";
import { useEffect, useState } from "react";

export default function FlangeListPage({
  params,
}: {
  params: Promise<{ sessionId: string; otItemId: string }>;
}) {
  const { sessionId, otItemId } = use(params);
  const router = useRouter();
  const { flanges, loading, refresh } = useOfflineFlanges(sessionId, otItemId);
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

  const handleResetFlange = useCallback(
    async (flangeId: string) => {
      if (!confirm("Effacer toutes les données saisies sur cette bride ?")) return;

      const fieldsToReset = [
        "dn_emis",
        "pn_emis",
        "face_bride",
        "nb_tiges_emis",
        "diametre_tige",
        "longueur_tige",
        "matiere_joint_emis",
        "rondelle",
        "calorifuge",
        "echafaudage",
        "echaf_longueur",
        "echaf_largeur",
        "echaf_hauteur",
        "commentaires",
      ];

      const now = new Date().toISOString();

      // Reset all fields in IndexedDB
      const updates: Record<string, unknown> = {
        field_status: "pending",
        dirty: true,
        last_modified_local: now,
      };
      for (const field of fieldsToReset) {
        updates[field] = null;
      }
      await offlineDb.flanges.update(flangeId, updates);

      // Create mutations for server sync
      for (const field of [...fieldsToReset, "field_status"]) {
        await offlineDb.mutations.add({
          session_id: sessionId,
          flange_id: flangeId,
          field,
          value: field === "field_status" ? "pending" : null,
          timestamp: now,
          synced: false,
        });
      }

      refresh();
    },
    [sessionId, refresh],
  );

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
              dnEmis={f.dn_emis}
              dnButa={f.dn_buta}
              pnEmis={f.pn_emis}
              pnButa={f.pn_buta}
              fieldStatus={f.field_status}
              onClick={() =>
                router.push(
                  `/terrain/${sessionId}/${otItemId}/${f.id}${f.field_status === "completed" ? "?recap=1" : ""}`,
                )
              }
              onReset={f.field_status !== "pending" ? () => handleResetFlange(f.id) : undefined}
            />
          ))
        )}
      </div>
    </TerrainLayout>
  );
}
