import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin as supabase } from "@/lib/db/supabase-server";
import { getUser } from "@/lib/auth/get-user";

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

  const { data, error } = await supabase
    .from("field_sessions")
    .select("*, field_session_items(ot_item_id)")
    .eq("project_id", projectId)
    .eq("owner_id", user.id)
    .order("created_at", { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data);
}

/** POST: create a new session with selected OT items */
export async function POST(request: NextRequest) {
  const user = await getUser(request);
  if (!user) {
    return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  }

  const body = await request.json();
  const { projectId, name, otItemIds } = body as {
    projectId: string;
    name: string;
    otItemIds: string[];
  };

  if (!projectId || !name || !Array.isArray(otItemIds) || otItemIds.length === 0) {
    return NextResponse.json({ error: "projectId, name et otItemIds requis" }, { status: 400 });
  }

  // Create session
  const { data: session, error: sessionErr } = await supabase
    .from("field_sessions")
    .insert({ project_id: projectId, owner_id: user.id, name })
    .select()
    .single();

  if (sessionErr || !session) {
    return NextResponse.json(
      { error: sessionErr?.message ?? "Erreur création session" },
      { status: 500 },
    );
  }

  // Insert session items
  const items = otItemIds.map((ot_item_id) => ({
    session_id: session.id,
    ot_item_id,
  }));

  const { error: itemsErr } = await supabase.from("field_session_items").insert(items);

  if (itemsErr) {
    return NextResponse.json({ error: itemsErr.message }, { status: 500 });
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
  const { data: session } = await supabase
    .from("field_sessions")
    .select("id")
    .eq("id", sessionId)
    .eq("owner_id", user.id)
    .single();

  if (!session) {
    return NextResponse.json({ error: "Session introuvable" }, { status: 404 });
  }

  // CASCADE handles field_session_items
  const { error } = await supabase.from("field_sessions").delete().eq("id", sessionId);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
