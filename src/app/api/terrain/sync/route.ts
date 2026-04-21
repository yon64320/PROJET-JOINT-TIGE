import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { supabaseAdmin as supabase } from "@/lib/db/supabase-server";
import { getUser } from "@/lib/auth/get-user";
import {
  SyncTerrainBodySchema,
  type LegacyFieldMutation as Mutation,
} from "@/lib/validation/schemas";

const SYNC_ALLOWED_FIELDS = new Set([
  "dn_emis",
  "pn_emis",
  "face_bride",
  "nb_tiges_emis",
  "diametre_tige",
  "longueur_tige",
  "cle",
  "matiere_joint_emis",
  "matiere_tiges_emis",
  "rondelle",
  "commentaires",
  "calorifuge",
  "echafaudage",
  "field_status",
  "repere_emis",
  "operation",
  "echaf_longueur",
  "echaf_largeur",
  "echaf_hauteur",
  "designation_tige",
]);

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
    .select("id, downloaded_at")
    .eq("id", sessionId)
    .eq("owner_id", user.id)
    .single();

  if (sessionErr || !session) {
    return NextResponse.json({ error: "Session introuvable" }, { status: 404 });
  }

  // Update session status
  await supabase.from("field_sessions").update({ status: "syncing" }).eq("id", sessionId);

  const applied: Mutation[] = [];
  const conflicts: (Mutation & { serverValue: unknown })[] = [];
  const errors: { mutation: Mutation; error: string }[] = [];

  // 1. Filtrer les mutations dont le champ est autorisé
  const validMutations: Mutation[] = [];
  for (const mut of mutations) {
    if (!SYNC_ALLOWED_FIELDS.has(mut.field)) {
      errors.push({ mutation: mut, error: `Champ non autorisé: ${mut.field}` });
    } else {
      validMutations.push(mut);
    }
  }

  if (validMutations.length > 0) {
    // 2. Fetch toutes les brides concernées en 1 seule requête (IN clause)
    const flangeIds = Array.from(new Set(validMutations.map((m) => m.flangeId)));
    const { data: currentRows } = await supabase.from("flanges").select("*").in("id", flangeIds);

    const currentById = new Map<string, Record<string, unknown>>();
    (currentRows as Record<string, unknown>[] | null)?.forEach((row) => {
      currentById.set(row.id as string, row);
    });

    // 3. Grouper les mutations par flangeId pour un seul UPDATE par bride
    const mutsByFlange = new Map<string, Mutation[]>();
    for (const mut of validMutations) {
      const current = currentById.get(mut.flangeId);
      if (!current) {
        errors.push({ mutation: mut, error: "Bride introuvable" });
        continue;
      }

      // Conflict detection (terrain wins mais on rapporte)
      const serverUpdatedAt = new Date(current.updated_at as string).getTime();
      const downloadedAt = session.downloaded_at ? new Date(session.downloaded_at).getTime() : 0;
      const mutationTime = new Date(mut.timestamp).getTime();
      if (serverUpdatedAt > downloadedAt && serverUpdatedAt > mutationTime) {
        conflicts.push({ ...mut, serverValue: current[mut.field] });
      }

      const existing = mutsByFlange.get(mut.flangeId);
      if (existing) existing.push(mut);
      else mutsByFlange.set(mut.flangeId, [mut]);
    }

    // 4. UPDATEs en parallèle (1 par bride, tous les champs mergés)
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
        applied.push(...muts);
      }
    }
  }

  // Mark session as synced
  await supabase
    .from("field_sessions")
    .update({ status: "synced", synced_at: new Date().toISOString() })
    .eq("id", sessionId);

  return NextResponse.json({ applied, conflicts, errors });
}
