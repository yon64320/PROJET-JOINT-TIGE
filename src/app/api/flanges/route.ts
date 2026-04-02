import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/db/supabase";
import { handlePatch } from "@/lib/api/patch-handler";

export async function GET(request: NextRequest) {
  const projectId = request.nextUrl.searchParams.get("projectId");
  if (!projectId) {
    return NextResponse.json({ error: "projectId requis" }, { status: 400 });
  }

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
  "diametre_tige",
  "longueur_tige",
  "nb_joints_prov",
  "nb_joints_def",
  "matiere_joint_emis",
  "matiere_joint_buta",
  "rondelle",
  "face_bride",
  "commentaires",
  "rob",
  "responsable",
]);

export async function PATCH(request: NextRequest) {
  return handlePatch(request, { table: "flanges", allowedFields: FLANGES_ALLOWED });
}
