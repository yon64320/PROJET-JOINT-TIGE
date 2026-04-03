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

  // 1. Fetch session (RLS ensures ownership)
  const { data: session, error: sessionErr } = await supabase
    .from("field_sessions")
    .select("*")
    .eq("id", sessionId)
    .eq("owner_id", user.id)
    .single();

  if (sessionErr || !session) {
    return NextResponse.json({ error: "Session introuvable" }, { status: 404 });
  }

  // 2. Fetch scoped OT items
  const { data: sessionItems } = await supabase
    .from("field_session_items")
    .select("ot_item_id")
    .eq("session_id", sessionId);

  const otItemIds = (sessionItems ?? []).map((si) => si.ot_item_id);

  if (otItemIds.length === 0) {
    return NextResponse.json({
      session,
      otItems: [],
      flanges: [],
      boltSpecs: [],
      dropdownLists: [],
      plans: [],
    });
  }

  // 3. Fetch OT items with flange count
  const { data: otItems } = await supabase
    .from("ot_items")
    .select("id, item, unite, titre_gamme")
    .in("id", otItemIds)
    .order("item", { ascending: true });

  // 4. Fetch flanges for those OT items
  const { data: flanges } = await supabase
    .from("flanges")
    .select("*")
    .in("ot_item_id", otItemIds)
    .order("nom", { ascending: true });

  // 5. Fetch bolt specs (entire reference table — small)
  const { data: boltSpecs } = await supabase
    .from("bolt_specs")
    .select("*")
    .order("dn", { ascending: true });

  // 6. Fetch dropdown lists
  const { data: dropdownLists } = await supabase
    .from("dropdown_lists")
    .select("*")
    .order("sort_order", { ascending: true });

  // 7. Fetch plans with signed URLs
  const { data: plansRaw } = await supabase
    .from("equipment_plans")
    .select("*")
    .in("ot_item_id", otItemIds);

  const plans = await Promise.all(
    (plansRaw ?? []).map(async (plan) => {
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

  // 8. Mark session as active
  await supabase
    .from("field_sessions")
    .update({ status: "active", downloaded_at: new Date().toISOString() })
    .eq("id", sessionId);

  return NextResponse.json({
    session: { ...session, status: "active", downloaded_at: new Date().toISOString() },
    otItems: otItems ?? [],
    flanges: flanges ?? [],
    boltSpecs: boltSpecs ?? [],
    dropdownLists: dropdownLists ?? [],
    plans,
  });
}
