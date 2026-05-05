import { NextRequest, NextResponse } from "next/server";
import { createServerSupabase } from "@/lib/db/supabase-ssr";
import { serverError } from "@/lib/api/errors";

export async function GET() {
  const supabase = await createServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });

  // RLS filtre via owner_id = auth.uid() OR is_admin() → admin voit tous les projets.
  const { data, error } = await supabase
    .from("projects")
    .select("id, name, client, owner_id")
    .order("created_at", { ascending: false });

  if (error) {
    return serverError("[GET /api/projects]", error);
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

  // Pre-check via RLS (owner ou admin). La RPC delete_project_cascade refait
  // le check côté serveur (défense en profondeur).
  const { data: project } = await supabase
    .from("projects")
    .select("id")
    .eq("id", projectId)
    .single();

  if (!project) {
    return NextResponse.json({ error: "Projet introuvable" }, { status: 404 });
  }

  // Cascade atomique via RPC SECURITY DEFINER — supprime field_sessions, equipment_plans,
  // flanges (+ archive), ot_items (+ archive) puis le projet lui-même dans une seule transaction.
  const { error } = await supabase.rpc("delete_project_cascade", { p_project_id: projectId });

  if (error) {
    return serverError("[DELETE /api/projects]", error);
  }

  return NextResponse.json({ success: true });
}
