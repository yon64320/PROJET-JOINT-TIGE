import { NextRequest, NextResponse } from "next/server";
import { createServerSupabase } from "@/lib/db/supabase-ssr";
import { supabaseAdmin } from "@/lib/db/supabase-server";
import { serverError } from "@/lib/api/errors";

/**
 * DELETE /api/projects/[id]/plans/[planId] — supprime un plan (storage + DB).
 *
 * Ownership : check via SSR (RLS filtre owner OR admin). Si le SELECT renvoie
 * null, le user n'a pas accès → 404. Si OK, on bascule sur le client admin
 * pour la suppression Storage (bucket privé sans policy authenticated).
 */
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string; planId: string }> },
) {
  const { id: projectId, planId } = await params;
  const supabase = await createServerSupabase();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });

  // RLS filtre owner/admin — null si pas accès
  const { data: plan } = await supabase
    .from("equipment_plans")
    .select("id, storage_path")
    .eq("id", planId)
    .eq("project_id", projectId)
    .single();

  if (!plan) {
    return NextResponse.json({ error: "Plan introuvable" }, { status: 404 });
  }

  // Storage : service-role obligatoire (bucket privé sans policy authenticated)
  const { error: storageErr } = await supabaseAdmin.storage
    .from("plans")
    .remove([plan.storage_path]);
  if (storageErr) {
    return serverError("[DELETE /api/projects/[id]/plans/[planId]] storage", storageErr);
  }

  // DB : SSR client (RLS owner/admin) — l'ownership a déjà été validée par le SELECT
  const { error: dbErr } = await supabase.from("equipment_plans").delete().eq("id", planId);
  if (dbErr) {
    return serverError("[DELETE /api/projects/[id]/plans/[planId]] db", dbErr);
  }

  return NextResponse.json({ success: true });
}
