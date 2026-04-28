import { NextRequest, NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { createServerSupabase } from "@/lib/db/supabase-ssr";
import { DEFAULT_TEMPLATE, validateTemplate } from "@/lib/domain/fiche-rob-fields";
import { FicheTemplateSchema } from "@/lib/validation/schemas";
import { z } from "zod";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const supabase = await createServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });

  const { data, error } = await supabase
    .from("projects")
    .select("fiche_rob_template")
    .eq("id", id)
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data.fiche_rob_template ?? DEFAULT_TEMPLATE);
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const raw = await req.json();

  const parsed = FicheTemplateSchema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Format invalide", details: z.flattenError(parsed.error) },
      { status: 400 },
    );
  }
  const body = parsed.data;

  const result = validateTemplate(body);
  if (!result.valid) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }

  const supabase = await createServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });

  const { error } = await supabase
    .from("projects")
    .update({ fiche_rob_template: body })
    .eq("id", id);

  if (error) {
    if (error.message.includes("fiche_rob_template")) {
      return NextResponse.json(
        {
          error:
            "La colonne fiche_rob_template n'existe pas. Appliquez la migration 003 dans le dashboard Supabase.",
        },
        { status: 500 },
      );
    }

    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  revalidatePath(`/projets/${id}/robinetterie`);
  return NextResponse.json({ ok: true });
}
