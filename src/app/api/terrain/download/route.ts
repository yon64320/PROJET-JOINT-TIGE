import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin as supabase } from "@/lib/db/supabase-server";
import { getUser } from "@/lib/auth/get-user";

export async function GET(request: NextRequest) {
  const user = await getUser(request);
  if (!user) {
    return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  }

  const sessionId = request.nextUrl.searchParams.get("sessionId");
  if (!sessionId) {
    return NextResponse.json({ error: "sessionId requis" }, { status: 400 });
  }

  // 1. Fetch session + session items en parallèle (bolt_specs/dropdown_lists indépendants → déjà possible)
  const [sessionRes, sessionItemsRes, boltSpecsRes, dropdownListsRes] = await Promise.all([
    supabase
      .from("field_sessions")
      .select("*")
      .eq("id", sessionId)
      .eq("owner_id", user.id)
      .single(),
    supabase.from("field_session_items").select("ot_item_id").eq("session_id", sessionId),
    supabase.from("bolt_specs").select("*").order("dn", { ascending: true }),
    supabase.from("dropdown_lists").select("*").order("sort_order", { ascending: true }),
  ]);

  const { data: session, error: sessionErr } = sessionRes;
  if (sessionErr || !session) {
    return NextResponse.json({ error: "Session introuvable" }, { status: 404 });
  }

  const otItemIds = (sessionItemsRes.data ?? []).map((si) => si.ot_item_id);

  if (otItemIds.length === 0) {
    return NextResponse.json({
      session,
      otItems: [],
      flanges: [],
      boltSpecs: boltSpecsRes.data ?? [],
      dropdownLists: dropdownListsRes.data ?? [],
      plans: [],
    });
  }

  // 2. Fetch OT items, flanges, plans en parallèle (tous dépendent d'otItemIds)
  // Defense en profondeur (HIGH-02 chemin d'exploitation) : filtrer aussi par
  // project_id de la session pour rejeter les sessions frauduleuses construites
  // avec un projectId different des otItemIds reels.
  const [otItemsRes, flangesRes, plansRawRes] = await Promise.all([
    supabase
      .from("ot_items")
      .select("id, item, unite, titre_gamme")
      .eq("project_id", session.project_id)
      .in("id", otItemIds)
      .order("item", { ascending: true }),
    supabase
      .from("flanges")
      .select("*")
      .eq("project_id", session.project_id)
      .in("ot_item_id", otItemIds)
      .order("nom", { ascending: true }),
    supabase
      .from("equipment_plans")
      .select("*")
      .eq("project_id", session.project_id)
      .in("ot_item_id", otItemIds),
  ]);

  // 3. Signed URLs pour les plans en parallèle
  const plans = await Promise.all(
    (plansRawRes.data ?? []).map(async (plan) => {
      const { data: signedData } = await supabase.storage
        .from("plans")
        .createSignedUrl(plan.storage_path, 3600); // 1h validity
      return {
        id: plan.id,
        otItemId: plan.ot_item_id,
        filename: plan.filename,
        signedUrl: signedData?.signedUrl ?? null,
      };
    }),
  );

  // 4. Mark session as active
  await supabase
    .from("field_sessions")
    .update({ status: "active", downloaded_at: new Date().toISOString() })
    .eq("id", sessionId);

  return NextResponse.json({
    session: { ...session, status: "active", downloaded_at: new Date().toISOString() },
    otItems: otItemsRes.data ?? [],
    flanges: flangesRes.data ?? [],
    boltSpecs: boltSpecsRes.data ?? [],
    dropdownLists: dropdownListsRes.data ?? [],
    plans,
  });
}
