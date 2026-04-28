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
    .from("flanges")
    .select("*, ot_items!inner(item, unite)")
    .eq("project_id", projectId)
    .order("nom", { ascending: true })
    .limit(5000);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data);
}

const FLANGES_ALLOWED = new Set([
  "nom",
  "zone",
  "famille_travaux",
  "type",
  "repere_buta",
  "repere_emis",
  "repere_ubleam",
  "commentaire_repere",
  "dn_emis",
  "dn_buta",
  "pn_emis",
  "pn_buta",
  "operation",
  "barrette",
  "nb_jp_emis",
  "nb_jp_buta",
  "nb_bp_emis",
  "nb_bp_buta",
  "materiel_emis",
  "materiel_buta",
  "materiel_adf",
  "cle",
  "nb_tiges_emis",
  "nb_tiges_buta",
  "matiere_tiges_emis",
  "matiere_tiges_buta",
  "dimension_tige_emis",
  "dimension_tige_buta",
  "nb_joints_prov_emis",
  "nb_joints_prov_buta",
  "nb_joints_def_emis",
  "nb_joints_def_buta",
  "matiere_joint_emis",
  "matiere_joint_buta",
  "rondelle_emis",
  "rondelle_buta",
  "face_bride_emis",
  "face_bride_buta",
  "commentaires",
  "rob",
  "rob_pair_id",
  "rob_side",
  "responsable",
  "calorifuge",
  "echafaudage",
  "echaf_longueur",
  "echaf_largeur",
  "echaf_hauteur",
  "field_status",
]);

export async function PATCH(request: NextRequest) {
  return handlePatch(request, { table: "flanges", allowedFields: FLANGES_ALLOWED });
}
