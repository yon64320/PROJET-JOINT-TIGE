import { NextResponse } from "next/server";
import { z } from "zod";
import { createServerSupabase } from "@/lib/db/supabase-ssr";
import { serverError } from "@/lib/api/errors";
import { PatchBodySchema } from "@/lib/validation/schemas";

interface PatchConfig {
  table: "ot_items" | "flanges";
  allowedFields: Set<string>;
  selectAfterUpdate?: string;
}

export async function handlePatch(request: Request, config: PatchConfig): Promise<NextResponse> {
  const supabase = await createServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });

  const body = await request.json();
  const parsed = PatchBodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Payload invalide", details: z.flattenError(parsed.error) },
      { status: 400 },
    );
  }

  const data = parsed.data;
  const id = data.id;

  // FEB field → merge JSONB via RPC merge_echaf_feb (uniquement table flanges)
  if ("feb_field" in data) {
    if (config.table !== "flanges") {
      return NextResponse.json({ error: "feb_field réservé à la table flanges" }, { status: 400 });
    }
    const { error: rpcError } = await supabase.rpc("merge_echaf_feb", {
      p_flange_id: id,
      p_key: data.feb_field,
      p_value: data.value as never,
    });
    if (rpcError) {
      return serverError(`[PATCH ${config.table}] merge_echaf_feb`, rpcError);
    }
    const { data: row, error } = await supabase
      .from(config.table)
      .select(config.selectAfterUpdate ?? "*")
      .eq("id", id)
      .single();
    if (error) {
      return serverError(`[PATCH ${config.table}] select after merge_echaf_feb`, error);
    }
    return NextResponse.json(row);
  }

  const { field, extra_field, value } = data;

  // Extra column → atomic JSONB merge via RPC
  if (extra_field) {
    const { error: rpcError } = await supabase.rpc("merge_extra_column", {
      p_table: config.table,
      p_id: id,
      p_key: extra_field,
      p_value: JSON.stringify(value),
    });

    if (rpcError) {
      return serverError(`[PATCH ${config.table}] merge_extra_column`, rpcError);
    }

    const { data: row, error } = await supabase
      .from(config.table)
      .select(config.selectAfterUpdate ?? "*")
      .eq("id", id)
      .single();

    if (error) {
      return serverError(`[PATCH ${config.table}] select after merge`, error);
    }
    return NextResponse.json(row);
  }

  // Regular field → check whitelist
  if (!field || !config.allowedFields.has(field)) {
    return NextResponse.json({ error: `Champ non autorisé: ${field}` }, { status: 400 });
  }

  const { data: row, error } = await supabase
    .from(config.table)
    .update({ [field]: value })
    .eq("id", id)
    .select(config.selectAfterUpdate ?? "*")
    .single();

  if (error) {
    return serverError(`[PATCH ${config.table}] update`, error);
  }

  return NextResponse.json(row);
}
