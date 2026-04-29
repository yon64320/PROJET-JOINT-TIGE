import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin as supabase } from "@/lib/db/supabase-server";
import { getUser } from "@/lib/auth/get-user";

const MAX_FILE_SIZE = 5 * 1024 * 1024;
const VALID_TYPES = new Set(["bride", "echafaudage", "calorifuge"]);
const FOLDER_MAP: Record<string, string> = {
  bride: "brides",
  echafaudage: "echafaudage",
  calorifuge: "calorifuge",
};
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const SIGNED_URL_TTL = 15 * 60; // 15 min

/**
 * POST /api/terrain/photos — upload d'une photo terrain.
 * - MIME : WebP uniquement (la compression client sort toujours du WebP).
 * - photoId UUID v4 fourni par le client → utilisé comme basename storage.
 * - Pas de race condition sur sequence (l'ordre est dérivé à la lecture).
 * - Rollback Storage si l'INSERT DB échoue (pas de fichier orphelin).
 */
export async function POST(request: NextRequest) {
  const user = await getUser(request);
  if (!user) {
    return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  }

  const formData = await request.formData();
  const file = formData.get("file") as File | null;
  const photoId = formData.get("photoId") as string | null;
  const flangeId = formData.get("flangeId") as string | null;
  const type = formData.get("type") as string | null;
  const displayName = (formData.get("displayName") as string | null) ?? null;
  const naturalItem = formData.get("naturalItem") as string | null;
  const naturalRepere = (formData.get("naturalRepere") as string | null) ?? null;
  const naturalCote = (formData.get("naturalCote") as string | null) ?? null;
  const takenAt = formData.get("takenAt") as string | null;

  if (!file || !photoId || !flangeId || !type || !naturalItem || !takenAt) {
    return NextResponse.json({ error: "Paramètres manquants" }, { status: 400 });
  }
  if (file.size > MAX_FILE_SIZE) {
    return NextResponse.json({ error: "Fichier trop volumineux (max 5 Mo)" }, { status: 413 });
  }
  if (file.type !== "image/webp") {
    return NextResponse.json({ error: "Seul WebP est accepté" }, { status: 400 });
  }
  if (!VALID_TYPES.has(type)) {
    return NextResponse.json({ error: "Type photo invalide" }, { status: 400 });
  }
  if (!UUID_RE.test(photoId)) {
    return NextResponse.json({ error: "photoId invalide" }, { status: 400 });
  }

  // Ownership check : la bride appartient à un projet du user
  const { data: flange } = await supabase
    .from("flanges")
    .select("id, project_id")
    .eq("id", flangeId)
    .single();
  if (!flange) {
    return NextResponse.json({ error: "Bride introuvable" }, { status: 404 });
  }

  const { data: project } = await supabase
    .from("projects")
    .select("id")
    .eq("id", flange.project_id)
    .eq("owner_id", user.id)
    .single();
  if (!project) {
    return NextResponse.json({ error: "Projet introuvable" }, { status: 404 });
  }

  const storagePath = `${FOLDER_MAP[type]}/${flange.project_id}/${photoId}.webp`;

  const { error: uploadErr } = await supabase.storage
    .from("photos")
    .upload(storagePath, file, { contentType: "image/webp", upsert: false });
  if (uploadErr) {
    return NextResponse.json({ error: uploadErr.message }, { status: 500 });
  }

  const { data: row, error: insertErr } = await supabase
    .from("flange_photos")
    .insert({
      id: photoId,
      flange_id: flangeId,
      project_id: flange.project_id,
      type,
      natural_item: naturalItem,
      natural_repere: naturalRepere,
      natural_cote: naturalCote,
      storage_path: storagePath,
      display_name: displayName,
      size_bytes: file.size,
      taken_at: takenAt,
    })
    .select("id, storage_path, taken_at")
    .single();

  // Rollback Storage si l'INSERT DB échoue → évite les fichiers orphelins
  if (insertErr) {
    await supabase.storage.from("photos").remove([storagePath]);
    return NextResponse.json({ error: insertErr.message }, { status: 500 });
  }

  return NextResponse.json(
    { id: row.id, storagePath: row.storage_path, takenAt: row.taken_at },
    { status: 201 },
  );
}

/**
 * GET /api/terrain/photos?flangeId=...&type=bride
 * Retourne les signed URLs (TTL 15 min) avec ordinal dérivé par taken_at.
 */
export async function GET(request: NextRequest) {
  const user = await getUser(request);
  if (!user) {
    return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const flangeId = searchParams.get("flangeId");
  const type = searchParams.get("type");

  if (!flangeId) {
    return NextResponse.json({ error: "flangeId requis" }, { status: 400 });
  }
  if (type && !VALID_TYPES.has(type)) {
    return NextResponse.json({ error: "Type photo invalide" }, { status: 400 });
  }

  // Ownership check via project_id
  const { data: flange } = await supabase
    .from("flanges")
    .select("id, project_id")
    .eq("id", flangeId)
    .single();
  if (!flange) {
    return NextResponse.json({ error: "Bride introuvable" }, { status: 404 });
  }

  const { data: project } = await supabase
    .from("projects")
    .select("id")
    .eq("id", flange.project_id)
    .eq("owner_id", user.id)
    .single();
  if (!project) {
    return NextResponse.json({ error: "Projet introuvable" }, { status: 404 });
  }

  let query = supabase
    .from("flange_photos")
    .select("id, storage_path, taken_at, display_name, type")
    .eq("flange_id", flangeId)
    .order("taken_at", { ascending: true });
  if (type) query = query.eq("type", type);

  const { data: rows } = await query;
  const list = rows ?? [];

  const photos = await Promise.all(
    list.map(async (p, idx) => {
      const { data: signed } = await supabase.storage
        .from("photos")
        .createSignedUrl(p.storage_path, SIGNED_URL_TTL);
      return {
        id: p.id,
        ordinal: idx + 1,
        type: p.type,
        signedUrl: signed?.signedUrl ?? null,
        takenAt: p.taken_at,
        displayName: p.display_name,
      };
    }),
  );

  return NextResponse.json({ photos });
}
