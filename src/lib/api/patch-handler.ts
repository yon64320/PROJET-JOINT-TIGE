import { NextResponse } from "next/server";
import { supabase } from "@/lib/db/supabase";
import { PatchBodySchema } from "@/lib/validation/schemas";
import { ZodError } from "zod";

interface PatchConfig {
  table: "ot_items" | "flanges";
  allowedFields: Set<string>;
  selectAfterUpdate?: string;
}

export async function handlePatch(request: Request, config: PatchConfig): Promise<NextResponse> {
  try {
    const body = await request.json();
    const { id, field, extra_field, value } = PatchBodySchema.parse(body);

    // Extra column → atomic JSONB merge via RPC
    if (extra_field) {
      const { error: rpcError } = await supabase.rpc("merge_extra_column", {
        p_table: config.table,
        p_id: id,
        p_key: extra_field,
        p_value: JSON.stringify(value),
      });

      if (rpcError) {
        return NextResponse.json({ error: rpcError.message }, { status: 500 });
      }

      const { data, error } = await supabase
        .from(config.table)
        .select(config.selectAfterUpdate ?? "*")
        .eq("id", id)
        .single();

      if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
      }
      return NextResponse.json(data);
    }

    // Regular field → check whitelist
    if (!field || !config.allowedFields.has(field)) {
      return NextResponse.json({ error: `Champ non autorisé: ${field}` }, { status: 400 });
    }

    const { data, error } = await supabase
      .from(config.table)
      .update({ [field]: value })
      .eq("id", id)
      .select(config.selectAfterUpdate ?? "*")
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(data);
  } catch (err) {
    if (err instanceof ZodError) {
      return NextResponse.json({ error: err.issues[0].message }, { status: 400 });
    }
    throw err;
  }
}
