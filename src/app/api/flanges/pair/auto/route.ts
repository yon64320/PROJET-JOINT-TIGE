import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { z } from "zod";
import { AutoPairFlangesBodySchema } from "@/lib/validation/schemas";

export async function POST(request: NextRequest) {
  try {
    const cookieStore = await cookies();
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return cookieStore.getAll();
          },
          setAll() {},
        },
      },
    );

    const raw = await request.json();
    const parsed = AutoPairFlangesBodySchema.safeParse(raw);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Payload invalide", details: z.flattenError(parsed.error) },
        { status: 400 },
      );
    }
    const { projectId } = parsed.data;

    // Fetch all rob flanges without pair, grouped by ot_item_id
    const { data: flanges, error } = await supabase
      .from("flanges")
      .select("id, ot_item_id, repere_buta, repere_emis")
      .eq("project_id", projectId)
      .eq("rob", true)
      .is("rob_pair_id", null)
      .order("ot_item_id");

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Group by ot_item_id
    const grouped = new Map<string, typeof flanges>();
    for (const f of flanges ?? []) {
      const key = f.ot_item_id;
      if (!grouped.has(key)) grouped.set(key, []);
      grouped.get(key)!.push(f);
    }

    // Auto-pair: only ITEMs with exactly 2 unpaired rob flanges
    let pairedCount = 0;
    for (const [, group] of grouped) {
      if (group.length !== 2) continue;

      const pairId = crypto.randomUUID();
      const [a, b] = group;

      const { error } = await supabase.rpc("pair_flanges", {
        p_flange_a: a.id,
        p_flange_b: b.id,
        p_pair_id: pairId,
        p_side_a: "ADM",
        p_side_b: "REF",
      });

      if (error) continue;

      pairedCount++;
    }

    return NextResponse.json({ pairedCount });
  } catch (err) {
    console.error("Auto-pair error:", err);
    return NextResponse.json({ error: "Erreur auto-appariement" }, { status: 500 });
  }
}
