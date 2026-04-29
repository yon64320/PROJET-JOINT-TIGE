"use client";

import { use, useCallback } from "react";
import { useRouter } from "next/navigation";
import { TerrainLayout } from "@/components/terrain/TerrainLayout";
import { BrideCard } from "@/components/terrain/BrideCard";
import { useOfflineFlanges, addLocalFlange, deleteLocalFlange } from "@/lib/offline/hooks";
import { offlineDb, type OfflineMutation } from "@/lib/offline/db";
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
        "face_bride_emis",
        "nb_tiges_emis",
        "dimension_tige_emis",
        "matiere_joint_emis",
        "rondelle_emis",
        "calorifuge",
        "echafaudage",
        "echaf_longueur",
        "echaf_largeur",
        "echaf_hauteur",
        "commentaires",
      ];

      const now = new Date().toISOString();

      const updates: Record<string, unknown> = {
        field_status: "pending",
        dirty: true,
        last_modified_local: now,
      };
      for (const field of fieldsToReset) {
        updates[field] = null;
      }
      await offlineDb.flanges.update(flangeId, updates);

      for (const field of [...fieldsToReset, "field_status"]) {
        const mutation: OfflineMutation = {
          type: "update",
          session_id: sessionId,
          flange_id: flangeId,
          field,
          value: field === "field_status" ? "pending" : null,
          timestamp: now,
          synced: false,
        };
        await offlineDb.mutations.add(mutation);
      }

      refresh();
    },
    [sessionId, refresh],
  );

  const handleAddFlange = useCallback(async () => {
    const tempId = await addLocalFlange(sessionId, otItemId);
    refresh();
    router.push(`/terrain/${sessionId}/${otItemId}/${tempId}`);
  }, [sessionId, otItemId, router, refresh]);

  const handleDeleteFlange = useCallback(
    async (flangeId: string) => {
      if (!confirm("Supprimer définitivement cette bride ? La ligne disparaîtra du J&T au sync.")) {
        return;
      }
      await deleteLocalFlange(flangeId);
      refresh();
    },
    [refresh],
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
              isLocal={f._local === true}
              onClick={() =>
                router.push(
                  `/terrain/${sessionId}/${otItemId}/${f.id}${f.field_status === "completed" ? "?recap=1" : ""}`,
                )
              }
              onReset={f.field_status !== "pending" ? () => handleResetFlange(f.id) : undefined}
              onDelete={() => handleDeleteFlange(f.id)}
            />
          ))
        )}

        <button
          type="button"
          onClick={handleAddFlange}
          className="w-full mt-2 p-4 rounded-xl border-2 border-dashed border-mcm-warm-gray-border
                     text-mcm-warm-gray hover:border-mcm-mustard hover:text-mcm-mustard
                     active:bg-mcm-warm-gray-bg transition-colors min-h-[56px] flex items-center
                     justify-center gap-2 text-sm font-medium"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 20 20"
            fill="currentColor"
            className="w-5 h-5"
            aria-hidden="true"
          >
            <path
              fillRule="evenodd"
              d="M10 5a.75.75 0 01.75.75v3.5h3.5a.75.75 0 010 1.5h-3.5v3.5a.75.75 0 01-1.5 0v-3.5h-3.5a.75.75 0 010-1.5h3.5v-3.5A.75.75 0 0110 5z"
              clipRule="evenodd"
            />
          </svg>
          Ajouter une bride
        </button>
      </div>
    </TerrainLayout>
  );
}
