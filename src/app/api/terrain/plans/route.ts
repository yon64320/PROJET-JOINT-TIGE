import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin as supabase } from "@/lib/db/supabase-server";
import { getUser } from "@/lib/auth/get-user";
import { checkIsAdmin } from "@/lib/auth/permissions";
import { serverError } from "@/lib/api/errors";

const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50 MB

/**
 * POST /api/terrain/plans — upload d'un plan PDF d'équipement.
 *
 * - `otItemId` optionnel : null/absent = plan "projet général" (visible sur
 *   tous les équipements en session terrain).
 * - Re-upload : si un plan existe déjà avec même (project_id, ot_item_id, filename)
 *   → l'ancien (storage + DB) est supprimé avant l'INSERT du nouveau.
 * - Rollback Storage si l'INSERT DB échoue (pas de fichier orphelin).
 */
export async function POST(request: NextRequest) {
  const user = await getUser(request);
  if (!user) {
    return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  }

  const formData = await request.formData();
  const file = formData.get("file") as File | null;
  const projectId = formData.get("projectId") as string | null;
  const otItemIdRaw = formData.get("otItemId") as string | null;
  const otItemId = otItemIdRaw && otItemIdRaw.trim() !== "" ? otItemIdRaw : null;

  if (!file || !projectId) {
    return NextResponse.json({ error: "file et projectId requis" }, { status: 400 });
  }

  if (file.size > MAX_FILE_SIZE) {
    return NextResponse.json({ error: "Fichier trop volumineux (max 50 Mo)" }, { status: 413 });
  }

  if (!file.name.toLowerCase().endsWith(".pdf") || file.type !== "application/pdf") {
    return NextResponse.json({ error: "Seuls les fichiers PDF sont acceptés" }, { status: 400 });
  }

  // Ownership projet (service-role bypass RLS, admin bypass owner)
  const isAdmin = await checkIsAdmin(supabase, user.id);
  const projectQuery = supabase.from("projects").select("id").eq("id", projectId);
  if (!isAdmin) projectQuery.eq("owner_id", user.id);
  const { data: project } = await projectQuery.single();
  if (!project) {
    return NextResponse.json({ error: "Projet introuvable" }, { status: 404 });
  }

  // Ownership OT (s'il est fourni)
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

  // Écrasement : repérer les anciens plans (même projet+OT+filename) et les supprimer
  const existingQuery = supabase
    .from("equipment_plans")
    .select("id, storage_path")
    .eq("project_id", projectId)
    .eq("filename", file.name);
  if (otItemId === null) {
    existingQuery.is("ot_item_id", null);
  } else {
    existingQuery.eq("ot_item_id", otItemId);
  }
  const { data: existing } = await existingQuery;

  if (existing && existing.length > 0) {
    const paths = existing.map((p) => p.storage_path);
    await supabase.storage.from("plans").remove(paths);
    await supabase
      .from("equipment_plans")
      .delete()
      .in(
        "id",
        existing.map((p) => p.id),
      );
  }

  // Sanitize file name (path traversal + caractères réservés)
  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_").slice(0, 100);
  const storagePath = `${projectId}/${otItemId ?? "general"}/${Date.now()}_${safeName}`;

  const { error: uploadErr } = await supabase.storage
    .from("plans")
    .upload(storagePath, file, { contentType: "application/pdf" });

  if (uploadErr) {
    return serverError("[POST /api/terrain/plans] storage upload", uploadErr);
  }

  const { data, error: insertErr } = await supabase
    .from("equipment_plans")
    .insert({
      project_id: projectId,
      ot_item_id: otItemId,
      filename: file.name,
      storage_path: storagePath,
    })
    .select()
    .single();

  // Rollback Storage si l'INSERT DB échoue → évite les fichiers orphelins
  if (insertErr) {
    await supabase.storage.from("plans").remove([storagePath]);
    return serverError("[POST /api/terrain/plans] insert (rolled back)", insertErr);
  }

  return NextResponse.json({ ...data, replaced: existing?.length ?? 0 }, { status: 201 });
}
