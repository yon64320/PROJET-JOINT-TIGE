import { offlineDb } from "./db";
import { createBrowserSupabase } from "@/lib/db/supabase-browser";

export type SyncResult = {
  applied: { flangeId: string; field: string; value: unknown }[];
  conflicts: unknown[];
  errors: { mutation: unknown; error: string }[];
};

/**
 * Get the current auth token, or null if not authenticated.
 */
export async function getAuthToken(): Promise<string | null> {
  const supabase = createBrowserSupabase();
  const {
    data: { session },
  } = await supabase.auth.getSession();
  return session?.access_token ?? null;
}

/**
 * Download a session's data from the server and store in IndexedDB.
 */
export async function downloadSession(sessionId: string, token: string): Promise<void> {
  const res = await fetch(`/api/terrain/download?sessionId=${sessionId}`, {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!res.ok) {
    throw new Error(`Download failed: ${res.status}`);
  }

  const data = await res.json();

  await offlineDb.transaction(
    "rw",
    [
      offlineDb.sessions,
      offlineDb.otItems,
      offlineDb.flanges,
      offlineDb.mutations,
      offlineDb.boltSpecs,
      offlineDb.dropdownLists,
    ],
    async () => {
      // Clear previous data for this session
      await offlineDb.otItems.where("session_id").equals(sessionId).delete();
      await offlineDb.flanges.where("session_id").equals(sessionId).delete();
      await offlineDb.mutations.where("session_id").equals(sessionId).delete();

      // Store session
      await offlineDb.sessions.put({
        id: data.session.id,
        project_id: data.session.project_id,
        name: data.session.name,
        status: data.session.status,
        downloaded_at: data.session.downloaded_at,
        selected_fields: data.session.selected_fields ?? null,
      });

      // Store OT items with flange count
      const flangeCounts = new Map<string, number>();
      for (const f of data.flanges) {
        flangeCounts.set(f.ot_item_id, (flangeCounts.get(f.ot_item_id) ?? 0) + 1);
      }

      for (const ot of data.otItems) {
        await offlineDb.otItems.put({
          id: ot.id,
          session_id: sessionId,
          item: ot.item,
          unite: ot.unite,
          titre_gamme: ot.titre_gamme,
          flange_count: flangeCounts.get(ot.id) ?? 0,
        });
      }

      // Store flanges
      for (const f of data.flanges) {
        await offlineDb.flanges.put({
          id: f.id,
          session_id: sessionId,
          ot_item_id: f.ot_item_id,
          nom: f.nom,
          repere_buta: f.repere_buta,
          repere_emis: f.repere_emis,
          dn_emis: f.dn_emis,
          dn_buta: f.dn_buta,
          pn_emis: f.pn_emis,
          pn_buta: f.pn_buta,
          operation: f.operation,
          face_bride: f.face_bride,
          nb_tiges_emis: f.nb_tiges_emis,
          nb_tiges_buta: f.nb_tiges_buta,
          diametre_tige: f.diametre_tige,
          longueur_tige: f.longueur_tige,
          designation_tige: f.designation_tige ?? null,
          cle: f.cle,
          matiere_tiges_emis: f.matiere_tiges_emis,
          matiere_joint_emis: f.matiere_joint_emis,
          rondelle: f.rondelle,
          commentaires: f.commentaires,
          calorifuge: f.calorifuge ?? false,
          echafaudage: f.echafaudage ?? false,
          echaf_longueur: f.echaf_longueur ?? null,
          echaf_largeur: f.echaf_largeur ?? null,
          echaf_hauteur: f.echaf_hauteur ?? null,
          field_status: f.field_status ?? "pending",
          dirty: false,
          last_modified_local: null,
        });
      }

      // Store bolt specs (replace all — reference data)
      await offlineDb.boltSpecs.clear();
      for (const bs of data.boltSpecs) {
        await offlineDb.boltSpecs.put(bs);
      }

      // Store dropdown lists (replace all)
      await offlineDb.dropdownLists.clear();
      for (const dl of data.dropdownLists) {
        await offlineDb.dropdownLists.put(dl);
      }
    },
  );

  // Download plans as blobs
  for (const plan of data.plans ?? []) {
    if (plan.signedUrl) {
      try {
        const pdfRes = await fetch(plan.signedUrl);
        const blob = await pdfRes.blob();
        await offlineDb.plans.put({
          id: plan.id,
          session_id: sessionId,
          ot_item_id: plan.otItemId,
          filename: plan.filename,
          blob,
        });
      } catch {
        console.warn(`Failed to download plan: ${plan.filename}`);
      }
    }
  }
}

/**
 * Push local mutations to the server.
 */
export async function pushMutations(sessionId: string, token: string): Promise<SyncResult> {
  const unsyncedMutations = await offlineDb.mutations
    .where("session_id")
    .equals(sessionId)
    .filter((m) => !m.synced)
    .toArray();

  if (unsyncedMutations.length === 0) {
    return { applied: [], conflicts: [], errors: [] };
  }

  const mutations = unsyncedMutations.map((m) => ({
    flangeId: m.flange_id,
    field: m.field,
    value: m.value,
    timestamp: m.timestamp,
  }));

  const res = await fetch("/api/terrain/sync", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ sessionId, mutations }),
  });

  if (!res.ok) {
    throw new Error(`Sync failed: ${res.status}`);
  }

  const result = await res.json();

  // Only mark mutations that were actually applied by the server
  const appliedKeys = new Set(
    result.applied.map((a: { flangeId: string; field: string }) => `${a.flangeId}:${a.field}`),
  );
  const appliedIds = unsyncedMutations
    .filter((m) => appliedKeys.has(`${m.flange_id}:${m.field}`))
    .map((m) => m.id!);
  if (appliedIds.length > 0) {
    await offlineDb.mutations.where("id").anyOf(appliedIds).modify({ synced: true });
  }

  return result;
}
