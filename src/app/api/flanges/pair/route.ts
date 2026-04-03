import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

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
    const body = await request.json();
    const { flangeIdA, flangeIdB, sideA } = body as {
      flangeIdA?: string;
      flangeIdB?: string;
      sideA?: "ADM" | "REF";
    };

    if (!flangeIdA || !flangeIdB) {
      return NextResponse.json({ error: "flangeIdA et flangeIdB requis" }, { status: 400 });
    }

    if (flangeIdA === flangeIdB) {
      return NextResponse.json(
        { error: "Impossible d'apparier une bride avec elle-même" },
        { status: 400 },
      );
    }

    const resolvedSideA = sideA ?? "ADM";
    const resolvedSideB = resolvedSideA === "ADM" ? "REF" : "ADM";
    const pairId = crypto.randomUUID();

    // Update both flanges atomically
    const { error: errA } = await supabase
      .from("flanges")
      .update({ rob_pair_id: pairId, rob_side: resolvedSideA })
      .eq("id", flangeIdA);

    if (errA) {
      return NextResponse.json({ error: errA.message }, { status: 500 });
    }

    const { error: errB } = await supabase
      .from("flanges")
      .update({ rob_pair_id: pairId, rob_side: resolvedSideB })
      .eq("id", flangeIdB);

    if (errB) {
      // Rollback A
      await supabase
        .from("flanges")
        .update({ rob_pair_id: null, rob_side: null })
        .eq("id", flangeIdA);
      return NextResponse.json({ error: errB.message }, { status: 500 });
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
    const body = await request.json();
    const { pairId } = body as { pairId?: string };

    if (!pairId) {
      return NextResponse.json({ error: "pairId requis" }, { status: 400 });
    }

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
