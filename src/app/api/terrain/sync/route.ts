import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin as supabase } from "@/lib/db/supabase-server";
import { getUser } from "@/lib/auth/get-user";

interface Mutation {
  flangeId: string;
  field: string;
  value: string | number | boolean | null;
  timestamp: string;
}

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
]);

export async function POST(request: NextRequest) {
  const user = await getUser(request);
  if (!user) {
    return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  }

  const body = await request.json();
  const { sessionId, mutations } = body as { sessionId: string; mutations: Mutation[] };

  if (!sessionId || !Array.isArray(mutations)) {
    return NextResponse.json({ error: "sessionId et mutations requis" }, { status: 400 });
  }

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

  for (const mut of mutations) {
    if (!SYNC_ALLOWED_FIELDS.has(mut.field)) {
      errors.push({ mutation: mut, error: `Champ non autorisé: ${mut.field}` });
      continue;
    }

    // Check for conflicts: if the flange was updated server-side after download
    const { data: currentRaw } = await supabase
      .from("flanges")
      .select("*")
      .eq("id", mut.flangeId)
      .single();

    if (!currentRaw) {
      errors.push({ mutation: mut, error: "Bride introuvable" });
      continue;
    }

    const current = currentRaw as Record<string, unknown>;
    const serverUpdatedAt = new Date(current.updated_at as string).getTime();
    const downloadedAt = session.downloaded_at ? new Date(session.downloaded_at).getTime() : 0;
    const mutationTime = new Date(mut.timestamp).getTime();

    // Conflict detection: server changed after download AND before mutation
    if (serverUpdatedAt > downloadedAt && serverUpdatedAt > mutationTime) {
      // Le terrain gagne — apply anyway but report conflict
      conflicts.push({ ...mut, serverValue: current[mut.field] });
    }

    // Apply the mutation — terrain always wins
    const { error: updateErr } = await supabase
      .from("flanges")
      .update({ [mut.field]: mut.value })
      .eq("id", mut.flangeId);

    if (updateErr) {
      errors.push({ mutation: mut, error: updateErr.message });
    } else {
      applied.push(mut);
    }
  }

  // Mark session as synced
  await supabase
    .from("field_sessions")
    .update({ status: "synced", synced_at: new Date().toISOString() })
    .eq("id", sessionId);

  return NextResponse.json({ applied, conflicts, errors });
}
