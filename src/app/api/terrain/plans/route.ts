import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin as supabase } from "@/lib/db/supabase-server";
import { getUser } from "@/lib/auth/get-user";

const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50 MB

/** POST: upload a PDF plan for an equipment */
export async function POST(request: NextRequest) {
  const user = await getUser(request);
  if (!user) {
    return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  }

  const formData = await request.formData();
  const file = formData.get("file") as File | null;
  const projectId = formData.get("projectId") as string | null;
  const otItemId = formData.get("otItemId") as string | null;

  if (!file || !projectId) {
    return NextResponse.json({ error: "file et projectId requis" }, { status: 400 });
  }

  // HIGH-04 : limite de taille
  if (file.size > MAX_FILE_SIZE) {
    return NextResponse.json({ error: "Fichier trop volumineux (max 50 Mo)" }, { status: 413 });
  }

  if (!file.name.toLowerCase().endsWith(".pdf") || file.type !== "application/pdf") {
    return NextResponse.json({ error: "Seuls les fichiers PDF sont acceptés" }, { status: 400 });
  }

  // HIGH-04 : check ownership du projet (service-role bypass RLS)
  const { data: project } = await supabase
    .from("projects")
    .select("id")
    .eq("id", projectId)
    .eq("owner_id", user.id)
    .single();
  if (!project) {
    return NextResponse.json({ error: "Projet introuvable" }, { status: 404 });
  }

  // HIGH-04 : check ownership de l'OT (s'il est fourni)
  if (otItemId) {
    const { data: ot } = await supabase
      .from("ot_items")
      .select("id")
      .eq("id", otItemId)
      .eq("project_id", projectId)
      .single();
    if (!ot) {
      return NextResponse.json({ error: "OT introuvable" }, { status: 404 });
    }
  }

  // HIGH-04 : sanitize file name (path traversal + caracteres reserves)
  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_").slice(0, 100);
  const storagePath = `${projectId}/${otItemId ?? "general"}/${Date.now()}_${safeName}`;

  const { error: uploadErr } = await supabase.storage
    .from("plans")
    .upload(storagePath, file, { contentType: "application/pdf" });

  if (uploadErr) {
    return NextResponse.json({ error: uploadErr.message }, { status: 500 });
  }

  // Create DB entry
  const { data, error } = await supabase
    .from("equipment_plans")
    .insert({
      project_id: projectId,
      ot_item_id: otItemId,
      filename: file.name,
      storage_path: storagePath,
    })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data, { status: 201 });
}
