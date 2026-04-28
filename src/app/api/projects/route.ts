import { NextRequest, NextResponse } from "next/server";
import { createServerSupabase } from "@/lib/db/supabase-ssr";

export async function GET() {
  const supabase = await createServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });

  // RLS filtre déjà sur owner_id, mais on double-check côté code pour cohérence/lisibilité
  const { data, error } = await supabase
    .from("projects")
    .select("id, name, client")
    .eq("owner_id", user.id)
    .order("created_at", { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data);
}

export async function DELETE(request: NextRequest) {
  const supabase = await createServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });

  const projectId = request.nextUrl.searchParams.get("id");
  if (!projectId) {
    return NextResponse.json({ error: "id requis" }, { status: 400 });
  }

  // Verify ownership avant la cascade
  const { data: project } = await supabase
    .from("projects")
    .select("id")
    .eq("id", projectId)
    .eq("owner_id", user.id)
    .single();

  if (!project) {
    return NextResponse.json({ error: "Projet introuvable" }, { status: 404 });
  }

  // Cascade atomique via RPC SECURITY DEFINER — supprime field_sessions, equipment_plans,
  // flanges (+ archive), ot_items (+ archive) puis le projet lui-même dans une seule transaction.
  const { error } = await supabase.rpc("delete_project_cascade", { p_project_id: projectId });

  if (error) {
    console.error("Delete project error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
