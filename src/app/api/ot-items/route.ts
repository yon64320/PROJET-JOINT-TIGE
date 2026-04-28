import { NextRequest, NextResponse } from "next/server";
import { createServerSupabase } from "@/lib/db/supabase-ssr";
import { handlePatch } from "@/lib/api/patch-handler";

export async function GET(request: NextRequest) {
  const projectId = request.nextUrl.searchParams.get("projectId");
  if (!projectId) {
    return NextResponse.json({ error: "projectId requis" }, { status: 400 });
  }

  const supabase = await createServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });

  const { data, error } = await supabase
    .from("ot_items")
    .select("*")
    .eq("project_id", projectId)
    .order("numero_ligne", { ascending: true })
    .limit(5000);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data);
}

const OT_ITEMS_ALLOWED = new Set([
  "unite",
  "item",
  "ot",
  "lot",
  "titre_gamme",
  "famille_item",
  "type_item",
  "type_travaux",
  "statut",
  "commentaires",
  "revision",
  "corps_metier_echaf",
  "corps_metier_calo",
  "corps_metier_montage",
  "corps_metier_metal",
  "corps_metier_fourniture",
  "corps_metier_nettoyage",
  "corps_metier_autres",
]);

export async function PATCH(request: NextRequest) {
  return handlePatch(request, { table: "ot_items", allowedFields: OT_ITEMS_ALLOWED });
}
