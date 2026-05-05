import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { supabaseAdmin as supabase } from "@/lib/db/supabase-server";
import { getUser } from "@/lib/auth/get-user";
import { checkIsAdmin } from "@/lib/auth/permissions";
import { ALL_FIELD_KEYS } from "@/lib/terrain/fields";
import { CreateFieldSessionBodySchema } from "@/lib/validation/schemas";
import { serverError } from "@/lib/api/errors";

/** GET: list sessions for a project */
export async function GET(request: NextRequest) {
  const user = await getUser(request);
  if (!user) {
    return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  }

  const projectId = request.nextUrl.searchParams.get("projectId");
  if (!projectId) {
    return NextResponse.json({ error: "projectId requis" }, { status: 400 });
  }

  const isAdmin = await checkIsAdmin(supabase, user.id);
  const query = supabase
    .from("field_sessions")
    .select("*, field_session_items(ot_item_id)")
    .eq("project_id", projectId)
    .order("created_at", { ascending: false });
  if (!isAdmin) query.eq("owner_id", user.id);
  const { data, error } = await query;

  if (error) {
    return serverError("[GET /api/terrain/sessions]", error);
  }

  return NextResponse.json(data);
}

/** POST: create a new session with selected OT items */
export async function POST(request: NextRequest) {
  const user = await getUser(request);
  if (!user) {
    return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  }

  const raw = await request.json();
  const parsedBody = CreateFieldSessionBodySchema.safeParse(raw);
  if (!parsedBody.success) {
    return NextResponse.json(
      { error: "Payload invalide", details: z.flattenError(parsedBody.error) },
      { status: 400 },
    );
  }
  const { projectId, name, otItemIds, selectedFields } = parsedBody.data;

  // HIGH-02 : verifier l'ownership du projet (route en service-role bypass RLS)
  const isAdmin = await checkIsAdmin(supabase, user.id);
  const projectQuery = supabase.from("projects").select("id").eq("id", projectId);
  if (!isAdmin) projectQuery.eq("owner_id", user.id);
  const { data: project } = await projectQuery.single();
  if (!project) {
    return NextResponse.json({ error: "Projet introuvable" }, { status: 404 });
  }

  // HIGH-02 : verifier que tous les OTs appartiennent au projet
  const { data: validOts } = await supabase
    .from("ot_items")
    .select("id")
    .eq("project_id", projectId)
    .in("id", otItemIds);
  const validIds = new Set((validOts ?? []).map((o) => o.id));
  if (validIds.size !== otItemIds.length) {
    return NextResponse.json(
      { error: "Certains OTs n'appartiennent pas au projet" },
      { status: 400 },
    );
  }

  // Validate selected fields against the known field keys
  let validatedFields: string[] | null = null;
  if (Array.isArray(selectedFields) && selectedFields.length > 0) {
    const validKeys = new Set(ALL_FIELD_KEYS);
    const invalid = selectedFields.filter(
      (k) => !validKeys.has(k as (typeof ALL_FIELD_KEYS)[number]),
    );
    if (invalid.length > 0) {
      return NextResponse.json(
        { error: `Champs invalides : ${invalid.join(", ")}` },
        { status: 400 },
      );
    }
    validatedFields = selectedFields;
  }

  // Create session
  const { data: session, error: sessionErr } = await supabase
    .from("field_sessions")
    .insert({
      project_id: projectId,
      owner_id: user.id,
      name,
      selected_fields: validatedFields,
    })
    .select()
    .single();

  if (sessionErr || !session) {
    return serverError("[POST /api/terrain/sessions] insert session", sessionErr);
  }

  // Insert session items
  const items = otItemIds.map((ot_item_id) => ({
    session_id: session.id,
    ot_item_id,
  }));

  const { error: itemsErr } = await supabase.from("field_session_items").insert(items);

  if (itemsErr) {
    return serverError("[POST /api/terrain/sessions] insert items", itemsErr);
  }

  return NextResponse.json(session, { status: 201 });
}

/** DELETE: delete a session */
export async function DELETE(request: NextRequest) {
  const user = await getUser(request);
  if (!user) {
    return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  }

  const sessionId = request.nextUrl.searchParams.get("sessionId");
  if (!sessionId) {
    return NextResponse.json({ error: "sessionId requis" }, { status: 400 });
  }

  // Verify ownership
  const isAdmin = await checkIsAdmin(supabase, user.id);
  const sessionQuery = supabase.from("field_sessions").select("id").eq("id", sessionId);
  if (!isAdmin) sessionQuery.eq("owner_id", user.id);
  const { data: session } = await sessionQuery.single();

  if (!session) {
    return NextResponse.json({ error: "Session introuvable" }, { status: 404 });
  }

  // CASCADE handles field_session_items
  const { error } = await supabase.from("field_sessions").delete().eq("id", sessionId);

  if (error) {
    return serverError("[DELETE /api/terrain/sessions]", error);
  }

  return NextResponse.json({ success: true });
}
