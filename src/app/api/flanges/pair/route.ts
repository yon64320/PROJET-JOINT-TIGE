import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { z } from "zod";
import { PairFlangesBodySchema, UnpairFlangesBodySchema } from "@/lib/validation/schemas";

async function getSupabase() {
  const cookieStore = await cookies();
  return createServerClient(
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
}

/** POST: Apparier 2 brides */
export async function POST(request: NextRequest) {
  try {
    const supabase = await getSupabase();
    const raw = await request.json();
    const parsed = PairFlangesBodySchema.safeParse(raw);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Payload invalide", details: z.flattenError(parsed.error) },
        { status: 400 },
      );
    }
    const { flangeIdA, flangeIdB, sideA } = parsed.data;

    const resolvedSideA = sideA ?? "ADM";
    const resolvedSideB = resolvedSideA === "ADM" ? "REF" : "ADM";
    const pairId = crypto.randomUUID();

    // Update both flanges atomically via RPC
    const { error } = await supabase.rpc("pair_flanges", {
      p_flange_a: flangeIdA,
      p_flange_b: flangeIdB,
      p_pair_id: pairId,
      p_side_a: resolvedSideA,
      p_side_b: resolvedSideB,
    });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ pairId, sideA: resolvedSideA, sideB: resolvedSideB });
  } catch (err) {
    console.error("Pair error:", err);
    return NextResponse.json({ error: "Erreur appariement" }, { status: 500 });
  }
}

/** DELETE: Désapparier une paire */
export async function DELETE(request: NextRequest) {
  try {
    const supabase = await getSupabase();
    const raw = await request.json();
    const parsed = UnpairFlangesBodySchema.safeParse(raw);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Payload invalide", details: z.flattenError(parsed.error) },
        { status: 400 },
      );
    }
    const { pairId } = parsed.data;

    const { error } = await supabase
      .from("flanges")
      .update({ rob_pair_id: null, rob_side: null })
      .eq("rob_pair_id", pairId);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("Unpair error:", err);
    return NextResponse.json({ error: "Erreur désappariement" }, { status: 500 });
  }
}
