import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin as supabase } from "@/lib/db/supabase-server";
import { getUser } from "@/lib/auth/get-user";

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

  if (!file.name.toLowerCase().endsWith(".pdf") || file.type !== "application/pdf") {
    return NextResponse.json({ error: "Seuls les fichiers PDF sont acceptés" }, { status: 400 });
  }

  // Upload to Supabase Storage
  const storagePath = `${projectId}/${otItemId ?? "general"}/${Date.now()}_${file.name}`;

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
