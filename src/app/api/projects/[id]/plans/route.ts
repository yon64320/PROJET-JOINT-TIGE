import { NextRequest, NextResponse } from "next/server";
import { createServerSupabase } from "@/lib/db/supabase-ssr";
import { serverError } from "@/lib/api/errors";

/**
 * GET /api/projects/[id]/plans — liste les plans d'un projet (côté préparation).
 *
 * RLS gère l'ownership : un user qui demande un projet qui n'est pas le sien
 * (et n'est pas admin) reçoit une liste vide.
 *
 * Renvoie les plans triés par ITEM puis par created_at, avec les infos ITEM
 * jointes pour l'affichage groupé. Plans projet général (ot_item_id NULL) en
 * tête de la liste retournée.
 */
export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id: projectId } = await params;
  const supabase = await createServerSupabase();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });

  const { data, error } = await supabase
    .from("equipment_plans")
    .select(
      `
      id,
      filename,
      storage_path,
      created_at,
      ot_item_id,
      ot_items ( id, item, numero_ligne, titre_gamme )
    `,
    )
    .eq("project_id", projectId)
    .order("ot_item_id", { ascending: true, nullsFirst: true })
    .order("created_at", { ascending: true });

  if (error) {
    return serverError("[GET /api/projects/[id]/plans]", error);
  }

  return NextResponse.json(data ?? []);
}
