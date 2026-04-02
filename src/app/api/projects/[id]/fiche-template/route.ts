import { NextRequest, NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { supabase } from "@/lib/db/supabase";
import {
  DEFAULT_TEMPLATE,
  validateTemplate,
  type FicheRobTemplate,
} from "@/lib/domain/fiche-rob-fields";
import { FicheTemplateSchema } from "@/lib/validation/schemas";
import { ZodError } from "zod";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

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

  let body: FicheRobTemplate;
  try {
    body = FicheTemplateSchema.parse(raw) as FicheRobTemplate;
  } catch (err) {
    if (err instanceof ZodError) {
      return NextResponse.json({ error: err.issues[0].message }, { status: 400 });
    }
    return NextResponse.json({ error: "Format invalide" }, { status: 400 });
  }

  const result = validateTemplate(body);
  if (!result.valid) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }

  // Try adding the column if it doesn't exist yet (migration 003 not applied)
  const { error } = await supabase
    .from("projects")
    .update({ fiche_rob_template: body })
    .eq("id", id);

  if (error) {
    // If column doesn't exist, try to add it via RPC then retry
    if (error.message.includes("fiche_rob_template")) {
      const { error: rpcError } = await supabase
        .rpc("exec_sql", {
          sql: "ALTER TABLE projects ADD COLUMN IF NOT EXISTS fiche_rob_template JSONB DEFAULT NULL;",
        })
        .single();

      if (!rpcError) {
        // Retry after adding column
        const { error: retryError } = await supabase
          .from("projects")
          .update({ fiche_rob_template: body })
          .eq("id", id);

        if (!retryError) {
          revalidatePath(`/projets/${id}/robinetterie`);
          return NextResponse.json({ ok: true });
        }
        return NextResponse.json({ error: retryError.message }, { status: 500 });
      }

      return NextResponse.json(
        {
          error:
            "La colonne fiche_rob_template n'existe pas. Exécutez la migration 003 dans le dashboard Supabase : ALTER TABLE projects ADD COLUMN IF NOT EXISTS fiche_rob_template JSONB DEFAULT NULL;",
        },
        { status: 500 },
      );
    }

    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  revalidatePath(`/projets/${id}/robinetterie`);
  return NextResponse.json({ ok: true });
}
