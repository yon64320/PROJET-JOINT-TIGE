import { offlineDb } from "./db";
import { createBrowserSupabase } from "@/lib/db/supabase-browser";

export type SyncResult = {
  applied: { flangeId: string; field: string; value: unknown }[];
  conflicts: unknown[];
  errors: { mutation: unknown; error: string }[];
  /** Brides créées en session : tempId (côté client) → serverId (UUID Postgres). */
  created?: { tempId: string; serverId: string }[];
  /** Brides supprimées en session : ids confirmés côté serveur. */
  deleted?: string[];
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
          face_bride_emis: f.face_bride_emis ?? null,
          face_bride_buta: f.face_bride_buta ?? null,
          nb_tiges_emis: f.nb_tiges_emis,
          nb_tiges_buta: f.nb_tiges_buta,
          dimension_tige_emis: f.dimension_tige_emis ?? null,
          dimension_tige_buta: f.dimension_tige_buta ?? null,
          cle: f.cle,
          matiere_tiges_emis: f.matiere_tiges_emis,
          matiere_joint_emis: f.matiere_joint_emis,
          rondelle_emis: f.rondelle_emis ?? null,
          rondelle_buta: f.rondelle_buta ?? null,
          nb_joints_prov_emis: f.nb_joints_prov_emis ?? null,
          nb_joints_prov_buta: f.nb_joints_prov_buta ?? null,
          nb_joints_def_emis: f.nb_joints_def_emis ?? null,
          nb_joints_def_buta: f.nb_joints_def_buta ?? null,
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

  // Sérialise chaque mutation en gardant son `type` discriminant.
  // Rétro-compat : une mutation persistée sans `type` est traitée comme update
  // côté serveur.
  const mutations = unsyncedMutations.map((m) => {
    if (m.type === "create") {
      return {
        type: "create" as const,
        flangeId: m.flange_id,
        otItemId: m.ot_item_id,
        initialFields: m.initial_fields,
        timestamp: m.timestamp,
      };
    }
    if (m.type === "delete") {
      return {
        type: "delete" as const,
        flangeId: m.flange_id,
        timestamp: m.timestamp,
      };
    }
    return {
      type: "update" as const,
      flangeId: m.flange_id,
      field: m.field,
      value: m.value,
      timestamp: m.timestamp,
    };
  });

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

  const result = (await res.json()) as SyncResult;

  // 1. Mapping tempId → serverId : remplace les ids locaux par les ids
  //    générés côté serveur (pour les mutations update/delete subséquentes).
  //    Important : remap atomique sur flanges + pendingPhotos dans la même
  //    transaction Dexie — sinon une photo prise sur une bride locale
  //    pointerait encore vers temp_xxx au moment de pushPendingPhotos.
  const tempToServer = new Map<string, string>();
  for (const c of result.created ?? []) {
    tempToServer.set(c.tempId, c.serverId);
    await offlineDb.transaction("rw", [offlineDb.flanges, offlineDb.pendingPhotos], async () => {
      const local = await offlineDb.flanges.get(c.tempId);
      if (local) {
        await offlineDb.flanges.delete(c.tempId);
        await offlineDb.flanges.put({ ...local, id: c.serverId, _local: false, dirty: false });
      }
      await offlineDb.pendingPhotos
        .where("flange_id")
        .equals(c.tempId)
        .modify({ flange_id: c.serverId });
    });
  }

  // 2. DELETE : retrait définitif du store local.
  for (const deletedId of result.deleted ?? []) {
    await offlineDb.flanges.delete(deletedId);
  }

  // 3. Marquer comme synced les mutations effectivement appliquées côté serveur.
  const appliedKeys = new Set(result.applied.map((a) => `${a.flangeId}:${a.field}`));
  const createdTempIds = new Set((result.created ?? []).map((c) => c.tempId));
  const deletedIds = new Set(result.deleted ?? []);
  const appliedIds = unsyncedMutations
    .filter((m) => {
      if (m.type === "create") return createdTempIds.has(m.flange_id);
      if (m.type === "delete") return deletedIds.has(m.flange_id);
      // update — vérifier le couple flange:field. Si la bride a été créée
      // dans la même session sync, son flange_id est encore le tempId :
      // on le matche en échangeant éventuellement contre le serverId.
      const fid = tempToServer.get(m.flange_id) ?? m.flange_id;
      return appliedKeys.has(`${fid}:${m.field}`) || appliedKeys.has(`${m.flange_id}:${m.field}`);
    })
    .map((m) => m.id!)
    .filter((id) => id !== undefined);
  if (appliedIds.length > 0) {
    await offlineDb.mutations.where("id").anyOf(appliedIds).modify({ synced: true });
  }

  // 4. Pour les mutations update qui pointaient vers un tempId désormais
  //    remplacé : mettre à jour leur flange_id côté local pour les retries
  //    futurs.
  if (tempToServer.size > 0) {
    const pendingUpdates = unsyncedMutations.filter(
      (m) => m.type === "update" && tempToServer.has(m.flange_id) && !appliedIds.includes(m.id!),
    );
    for (const m of pendingUpdates) {
      await offlineDb.mutations
        .where("id")
        .equals(m.id!)
        .modify({ flange_id: tempToServer.get(m.flange_id)! });
    }
  }

  return result;
}

// ---- Photos terrain : upload différé après pushMutations ----

const UPLOAD_CONCURRENCY = 3;

export type PhotosSyncResult = {
  uploaded: string[];
  errors: { photoId: string; error: string }[];
};

/**
 * Upload des photos pendantes (offline → Supabase Storage).
 * À appeler APRÈS pushMutations — au moment où ce code tourne, les
 * `pendingPhotos.flange_id` qui étaient des `temp_<uuid>` ont déjà été
 * remappés vers les serverIds par pushMutations (transaction Dexie).
 *
 * Les photos qui pointent encore vers un `temp_` sont skippées : ça
 * signifie que le sync mutations a échoué pour la bride correspondante,
 * elles seront retentées au sync suivant.
 *
 * Concurrence limitée à 3 (Promise.allSettled) — équilibre entre vitesse
 * 4G et UX (un échec n'arrête pas les autres).
 */
export async function pushPendingPhotos(
  sessionId: string,
  token: string,
): Promise<PhotosSyncResult> {
  const pending = await offlineDb.pendingPhotos
    .where("session_id")
    .equals(sessionId)
    .filter((p) => !p.uploaded)
    .toArray();

  const uploaded: string[] = [];
  const errors: { photoId: string; error: string }[] = [];

  const ready = pending.filter((p) => !p.flange_id.startsWith("temp_"));
  for (const p of pending) {
    if (p.flange_id.startsWith("temp_")) {
      errors.push({ photoId: p.id, error: "Bride non synchronisée" });
    }
  }

  for (let i = 0; i < ready.length; i += UPLOAD_CONCURRENCY) {
    const batch = ready.slice(i, i + UPLOAD_CONCURRENCY);
    const results = await Promise.allSettled(batch.map((p) => uploadOnePhoto(p, token)));
    results.forEach((r, idx) => {
      const photo = batch[idx];
      if (r.status === "fulfilled") uploaded.push(photo.id);
      else errors.push({ photoId: photo.id, error: String(r.reason) });
    });
  }

  return { uploaded, errors };
}

async function uploadOnePhoto(photo: import("./db").PendingPhoto, token: string): Promise<void> {
  const fd = new FormData();
  fd.append("file", photo.blob, `${photo.id}.webp`);
  fd.append("photoId", photo.id);
  fd.append("flangeId", photo.flange_id);
  fd.append("type", photo.type);
  fd.append("displayName", photo.display_name);
  fd.append("naturalItem", photo.natural_item);
  if (photo.natural_repere) fd.append("naturalRepere", photo.natural_repere);
  if (photo.natural_cote) fd.append("naturalCote", photo.natural_cote);
  fd.append("takenAt", photo.taken_at);

  const res = await fetch("/api/terrain/photos", {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
    body: fd,
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`HTTP ${res.status}${text ? `: ${text}` : ""}`);
  }
  await offlineDb.pendingPhotos.update(photo.id, { uploaded: true });
}
