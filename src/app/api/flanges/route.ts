import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createServerSupabase } from "@/lib/db/supabase-ssr";
import { serverError } from "@/lib/api/errors";
import { handlePatch } from "@/lib/api/patch-handler";
import { CreateFlangeBodySchema, DeleteFlangeBodySchema } from "@/lib/validation/schemas";
import { FLANGES_ALLOWED } from "@/lib/db/flanges-allowed";

const PAGE_SIZE = 1000;

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

  // Pagination .range() — pas de limite hard à 5000 (Supabase tronque silencieusement
  // sinon). Tiebreaker .order("id") nécessaire car `nom` n'est pas unique.
  const all: unknown[] = [];
  let from = 0;
  while (true) {
    const { data, error } = await supabase
      .from("flanges")
      .select("*, ot_items!inner(item, unite)")
      .eq("project_id", projectId)
      .order("nom", { ascending: true })
      .order("id", { ascending: true })
      .range(from, from + PAGE_SIZE - 1);

    if (error) return serverError("[GET /api/flanges]", error);
    if (!data || data.length === 0) break;
    all.push(...data);
    if (data.length < PAGE_SIZE) break;
    from += PAGE_SIZE;
  }

  return NextResponse.json(all);
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

  // Ownership : RLS (owner_id = auth.uid() OR is_admin()) filtre la requête.
  const { data: project } = await supabase
    .from("projects")
    .select("id")
    .eq("id", projectId)
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
    return serverError("[POST /api/flanges]", insertError);
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
    return serverError("[DELETE /api/flanges]", error);
  }

  return NextResponse.json({ success: true });
}
