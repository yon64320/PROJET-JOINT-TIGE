import { NextRequest, NextResponse } from "next/server";
import { createServerSupabase } from "@/lib/db/supabase-ssr";
import { parseWithMapping } from "@/lib/excel/generic-parser";
import { ConfirmedMappingSchema } from "@/lib/validation/schemas";
import { getStr } from "@/lib/db/utils";
import { z } from "zod";

/**
 * POST /api/import/jt-reimport-preview
 * Avant un ré-import J&T, calcule combien de photos terrain vont être
 * re-rattachées (clé naturelle (item, repere)) vs orphelines selon les
 * items présents dans le nouveau fichier.
 *
 * Body multipart : file (Excel) + confirmedMapping (JSON) + projectId.
 * Réponse : { will_reattach: number, will_orphan: number, total_photos: number }.
 */
export async function POST(request: NextRequest) {
  const supabase = await createServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  }

  const formData = await request.formData();
  const file = formData.get("file") as File | null;
  const mappingJson = formData.get("confirmedMapping") as string | null;
  const projectId = formData.get("projectId") as string | null;

  if (!file || !mappingJson || !projectId) {
    return NextResponse.json(
      { error: "file, confirmedMapping et projectId requis" },
      { status: 400 },
    );
  }

  // Ownership check
  const { data: project } = await supabase
    .from("projects")
    .select("id")
    .eq("id", projectId)
    .eq("owner_id", user.id)
    .single();
  if (!project) {
    return NextResponse.json({ error: "Projet introuvable" }, { status: 404 });
  }

  const parsedMapping = ConfirmedMappingSchema.safeParse(JSON.parse(mappingJson));
  if (!parsedMapping.success) {
    return NextResponse.json(
      { error: "Mapping invalide", details: z.flattenError(parsedMapping.error) },
      { status: 400 },
    );
  }

  const buffer = await file.arrayBuffer();
  const { rows } = parseWithMapping(buffer, parsedMapping.data);

  // Extraire les items uniques du nouveau J&T (on ne garde que la valeur "nom"
  // qui correspond à ot_items.item dans le mapping J&T existant)
  const items = new Set<string>();
  for (const row of rows) {
    const nom = getStr(row, "nom");
    if (nom) items.add(nom);
  }
  const newItems = Array.from(items);

  // Compteur photos via RPC (n'écrit rien)
  const { data, error } = await supabase.rpc("preview_reattach_photos", {
    p_project_id: projectId,
    p_new_items: newItems,
  });
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const row0 = (Array.isArray(data) && data[0]) as
    | { will_reattach: number; will_orphan: number }
    | undefined;
  const willReattach = row0?.will_reattach ?? 0;
  const willOrphan = row0?.will_orphan ?? 0;

  return NextResponse.json({
    will_reattach: willReattach,
    will_orphan: willOrphan,
    total_photos: willReattach + willOrphan,
  });
}
