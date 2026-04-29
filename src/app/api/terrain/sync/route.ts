import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { supabaseAdmin as supabase } from "@/lib/db/supabase-server";
import { getUser } from "@/lib/auth/get-user";
import { SyncTerrainBodySchema, type SyncMutation } from "@/lib/validation/schemas";
import { FLANGES_ALLOWED } from "@/lib/db/flanges-allowed";

const SYNC_ALLOWED_FIELDS = new Set([
  "dn_emis",
  "pn_emis",
  "face_bride_emis",
  "nb_tiges_emis",
  "dimension_tige_emis",
  "cle",
  "matiere_joint_emis",
  "matiere_tiges_emis",
  "rondelle_emis",
  "nb_joints_prov_emis",
  "nb_joints_def_emis",
  "commentaires",
  "calorifuge",
  "echafaudage",
  "field_status",
  "repere_emis",
  "operation",
  "echaf_longueur",
  "echaf_largeur",
  "echaf_hauteur",
  "num_rob",
  "amiante_plomb",
]);

type UpdateMut = {
  type: "update";
  flangeId: string;
  field: string;
  value: unknown;
  timestamp: string;
};
type CreateMut = {
  type: "create";
  flangeId: string;
  otItemId: string;
  initialFields: Record<string, unknown>;
  timestamp: string;
};
type DeleteMut = { type: "delete"; flangeId: string; timestamp: string };

/** Normalise une mutation legacy (sans `type`) en update. */
function normalizeMutation(m: SyncMutation): UpdateMut | CreateMut | DeleteMut {
  if ("type" in m) return m;
  return {
    type: "update",
    flangeId: m.flangeId,
    field: m.field,
    value: m.value,
    timestamp: m.timestamp,
  };
}

export async function POST(request: NextRequest) {
  const user = await getUser(request);
  if (!user) {
    return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  }

  const raw = await request.json();
  const parsed = SyncTerrainBodySchema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Payload invalide", details: z.flattenError(parsed.error) },
      { status: 400 },
    );
  }
  const { sessionId, mutations } = parsed.data;

  // Verify session ownership
  const { data: session, error: sessionErr } = await supabase
    .from("field_sessions")
    .select("id, project_id, downloaded_at")
    .eq("id", sessionId)
    .eq("owner_id", user.id)
    .single();

  if (sessionErr || !session) {
    return NextResponse.json({ error: "Session introuvable" }, { status: 404 });
  }

  // Update session status
  await supabase.from("field_sessions").update({ status: "syncing" }).eq("id", sessionId);

  const applied: { flangeId: string; field: string; value: unknown }[] = [];
  const conflicts: { flangeId: string; field: string; value: unknown; serverValue: unknown }[] = [];
  const created: { tempId: string; serverId: string }[] = [];
  const deleted: string[] = [];
  const errors: { mutation: unknown; error: string }[] = [];

  // Normalise + sépare par type. Ordre d'exécution : CREATE → UPDATE → DELETE.
  const allowedOtIdsRes = await supabase
    .from("field_session_items")
    .select("ot_item_id")
    .eq("session_id", sessionId);
  const allowedOtIds = new Set((allowedOtIdsRes.data ?? []).map((s) => s.ot_item_id as string));

  const creates: CreateMut[] = [];
  const updates: UpdateMut[] = [];
  const deletes: DeleteMut[] = [];
  for (const m of mutations) {
    const norm = normalizeMutation(m);
    if (norm.type === "create") creates.push(norm);
    else if (norm.type === "delete") deletes.push(norm);
    else updates.push(norm);
  }

  // Mapping tempId → serverId pour résoudre les UPDATE qui suivent un CREATE
  // dans la même requête sync.
  const tempToServer = new Map<string, string>();

  // ============ 1. CREATE ============
  for (const mut of creates) {
    if (!allowedOtIds.has(mut.otItemId)) {
      errors.push({ mutation: mut, error: "OT hors session" });
      continue;
    }

    // Filter initialFields sur la whitelist générale (FLANGES_ALLOWED)
    const filteredFields: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(mut.initialFields)) {
      if (FLANGES_ALLOWED.has(k)) filteredFields[k] = v;
    }

    const { data: inserted, error: insertErr } = await supabase
      .from("flanges")
      .insert({
        project_id: session.project_id,
        ot_item_id: mut.otItemId,
        ...filteredFields,
        extra_columns: {},
        cell_metadata: {},
      })
      .select("id")
      .single();

    if (insertErr || !inserted) {
      errors.push({ mutation: mut, error: insertErr?.message ?? "Insert failed" });
      continue;
    }

    tempToServer.set(mut.flangeId, inserted.id as string);
    created.push({ tempId: mut.flangeId, serverId: inserted.id as string });
  }

  // ============ 2. UPDATE ============
  // Filtre champ + résolution tempId → serverId
  const validUpdates: UpdateMut[] = [];
  for (const mut of updates) {
    if (!SYNC_ALLOWED_FIELDS.has(mut.field)) {
      errors.push({ mutation: mut, error: `Champ non autorisé: ${mut.field}` });
      continue;
    }
    // Résoudre tempId si la bride a été créée juste avant
    const resolvedId = tempToServer.get(mut.flangeId) ?? mut.flangeId;
    validUpdates.push({ ...mut, flangeId: resolvedId });
  }

  if (validUpdates.length > 0) {
    const flangeIds = Array.from(new Set(validUpdates.map((m) => m.flangeId)));
    const { data: currentRows } = await supabase.from("flanges").select("*").in("id", flangeIds);

    const currentById = new Map<string, Record<string, unknown>>();
    (currentRows as Record<string, unknown>[] | null)?.forEach((row) => {
      currentById.set(row.id as string, row);
    });

    const mutsByFlange = new Map<string, UpdateMut[]>();
    for (const mut of validUpdates) {
      const current = currentById.get(mut.flangeId);
      if (!current) {
        errors.push({ mutation: mut, error: "Bride introuvable" });
        continue;
      }
      if (!allowedOtIds.has(current.ot_item_id as string)) {
        errors.push({ mutation: mut, error: "Bride hors session" });
        continue;
      }

      const serverUpdatedAt = new Date(current.updated_at as string).getTime();
      const downloadedAt = session.downloaded_at ? new Date(session.downloaded_at).getTime() : 0;
      const mutationTime = new Date(mut.timestamp).getTime();
      if (serverUpdatedAt > downloadedAt && serverUpdatedAt > mutationTime) {
        conflicts.push({
          flangeId: mut.flangeId,
          field: mut.field,
          value: mut.value,
          serverValue: current[mut.field],
        });
      }

      const existing = mutsByFlange.get(mut.flangeId);
      if (existing) existing.push(mut);
      else mutsByFlange.set(mut.flangeId, [mut]);
    }

    const updatePromises = Array.from(mutsByFlange.entries()).map(async ([flangeId, muts]) => {
      const patch: Record<string, unknown> = {};
      for (const mut of muts) patch[mut.field] = mut.value;
      const { error: updateErr } = await supabase.from("flanges").update(patch).eq("id", flangeId);
      return { flangeId, muts, error: updateErr };
    });

    const results = await Promise.all(updatePromises);
    for (const { muts, error: updateErr } of results) {
      if (updateErr) {
        for (const mut of muts) errors.push({ mutation: mut, error: updateErr.message });
      } else {
        for (const mut of muts) {
          applied.push({ flangeId: mut.flangeId, field: mut.field, value: mut.value });
        }
      }
    }
  }

  // ============ 3. DELETE ============
  for (const mut of deletes) {
    // Vérifier ownership via join sur ot_items → projects
    const { data: row } = await supabase
      .from("flanges")
      .select("id, ot_item_id")
      .eq("id", mut.flangeId)
      .maybeSingle();

    if (!row) {
      // Idempotent : déjà supprimée → on confirme.
      deleted.push(mut.flangeId);
      continue;
    }
    if (!allowedOtIds.has(row.ot_item_id as string)) {
      errors.push({ mutation: mut, error: "Bride hors session" });
      continue;
    }
    const { error: deleteErr } = await supabase.from("flanges").delete().eq("id", mut.flangeId);
    if (deleteErr) {
      errors.push({ mutation: mut, error: deleteErr.message });
    } else {
      deleted.push(mut.flangeId);
    }
  }

  // Mark session as synced
  await supabase
    .from("field_sessions")
    .update({ status: "synced", synced_at: new Date().toISOString() })
    .eq("id", sessionId);

  return NextResponse.json({ applied, conflicts, created, deleted, errors });
}
