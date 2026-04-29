import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createServerSupabase } from "@/lib/db/supabase-ssr";
import { handlePatch } from "@/lib/api/patch-handler";
import { CreateFlangeBodySchema, DeleteFlangeBodySchema } from "@/lib/validation/schemas";
import { FLANGES_ALLOWED } from "@/lib/db/flanges-allowed";

export async function GET(request: NextRequest) {
  const projectId = request.nextUrl.searchParams.get("projectId");
  if (!projectId) {
    return NextResponse.json({ error: "projectId requis" }, { status: 400 });
  }

  const supabase = await createServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });

  const { data, error } = await supabase
    .from("flanges")
    .select("*, ot_items!inner(item, unite)")
    .eq("project_id", projectId)
    .order("nom", { ascending: true })
    .limit(5000);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data);
}

export async function PATCH(request: NextRequest) {
  return handlePatch(request, { table: "flanges", allowedFields: FLANGES_ALLOWED });
}

/** POST — création d'une bride attachée à un OT existant. */
export async function POST(request: NextRequest) {
  const supabase = await createServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });

  const raw = await request.json();
  const parsed = CreateFlangeBodySchema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Payload invalide", details: z.flattenError(parsed.error) },
      { status: 400 },
    );
  }
  const { projectId, otItemId, fields } = parsed.data;

  // Ownership : le projet appartient à l'utilisateur
  const { data: project } = await supabase
    .from("projects")
    .select("id")
    .eq("id", projectId)
    .eq("owner_id", user.id)
    .maybeSingle();
  if (!project) {
    return NextResponse.json({ error: "Projet introuvable" }, { status: 404 });
  }

  // L'OT appartient bien à ce projet
  const { data: otItem } = await supabase
    .from("ot_items")
    .select("id")
    .eq("id", otItemId)
    .eq("project_id", projectId)
    .maybeSingle();
  if (!otItem) {
    return NextResponse.json({ error: "OT introuvable dans ce projet" }, { status: 404 });
  }

  // Filtrer les champs initiaux sur la whitelist
  const filteredFields: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(fields)) {
    if (FLANGES_ALLOWED.has(k)) filteredFields[k] = v;
  }

  const { data: inserted, error: insertError } = await supabase
    .from("flanges")
    .insert({
      project_id: projectId,
      ot_item_id: otItemId,
      ...filteredFields,
      extra_columns: {},
      cell_metadata: {},
    })
    .select("id")
    .single();

  if (insertError || !inserted) {
    return NextResponse.json(
      { error: insertError?.message ?? "Insertion échouée" },
      { status: 500 },
    );
  }

  return NextResponse.json({ id: inserted.id }, { status: 201 });
}

/** DELETE — suppression d'une bride existante (RLS valide l'ownership). */
export async function DELETE(request: NextRequest) {
  const supabase = await createServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });

  const raw = await request.json();
  const parsed = DeleteFlangeBodySchema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Payload invalide", details: z.flattenError(parsed.error) },
      { status: 400 },
    );
  }
  const { flangeId } = parsed.data;

  const { error } = await supabase.from("flanges").delete().eq("id", flangeId);
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
