import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin as supabase } from "@/lib/db/supabase-server";
import { getUser } from "@/lib/auth/get-user";
import { checkIsAdmin } from "@/lib/auth/permissions";

export async function GET(request: NextRequest) {
  const user = await getUser(request);
  if (!user) {
    return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  }

  const sessionId = request.nextUrl.searchParams.get("sessionId");
  if (!sessionId) {
    return NextResponse.json({ error: "sessionId requis" }, { status: 400 });
  }

  const isAdmin = await checkIsAdmin(supabase, user.id);
  const sessionSel = supabase.from("field_sessions").select("*").eq("id", sessionId);
  if (!isAdmin) sessionSel.eq("owner_id", user.id);

  // 1. Fetch session + session items en parallèle (bolt_specs/dropdown_lists indépendants → déjà possible)
  const [sessionRes, sessionItemsRes, boltSpecsRes, dropdownListsRes] = await Promise.all([
    sessionSel.single(),
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
    // Plans : inclut les plans spécifiques aux OTs de la session ET les plans
    // "projet général" (ot_item_id IS NULL) qui sont visibles depuis tous les
    // équipements de la session.
    supabase
      .from("equipment_plans")
      .select("*")
      .eq("project_id", session.project_id)
      .or(`ot_item_id.in.(${otItemIds.join(",")}),ot_item_id.is.null`),
  ]);

  // 3. Signed URLs pour les plans en batch (perf-audit 2026-05-04)
  const plansRaw = plansRawRes.data ?? [];
  const planPaths = plansRaw.map((p) => p.storage_path);
  const { data: signedList } = planPaths.length
    ? await supabase.storage.from("plans").createSignedUrls(planPaths, 3600)
    : { data: [] };
  const signedByPath = new Map<string, string>(
    (signedList ?? [])
      .filter((s): s is { path: string; signedUrl: string; error: null } =>
        Boolean(s.signedUrl && s.path),
      )
      .map((s) => [s.path, s.signedUrl]),
  );
  const plans = plansRaw.map((plan) => ({
    id: plan.id,
    otItemId: plan.ot_item_id,
    filename: plan.filename,
    signedUrl: signedByPath.get(plan.storage_path) ?? null,
  }));

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
