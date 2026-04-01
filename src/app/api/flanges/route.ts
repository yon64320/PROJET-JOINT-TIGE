import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/db/supabase";

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

/** PATCH body: { id, field, value } or { id, extra_field, value } */
export async function PATCH(request: NextRequest) {
  const body = await request.json();
  const { id, field, extra_field, value } = body;

  if (!id || (!field && !extra_field)) {
    return NextResponse.json({ error: "id et (field ou extra_field) requis" }, { status: 400 });
  }

  // Extra column → JSONB update
  if (extra_field) {
    const { data: current } = await supabase
      .from("flanges")
      .select("extra_columns")
      .eq("id", id)
      .single();

    const extraCols = (current?.extra_columns as Record<string, unknown>) ?? {};
    extraCols[extra_field] = value;

    const { data, error } = await supabase
      .from("flanges")
      .update({ extra_columns: extraCols })
      .eq("id", id)
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    return NextResponse.json(data);
  }

  // Whitelist — exclut les colonnes GENERATED (delta_dn, delta_pn, *_retenu)
  const allowedFields = [
    "nom", "zone", "famille_travaux", "type",
    "repere_buta", "repere_emis", "repere_ubleam", "commentaire_repere",
    "dn_emis", "dn_buta", "pn_emis", "pn_buta",
    "operation", "barrette",
    "nb_jp_emis", "nb_jp_buta", "nb_bp_emis", "nb_bp_buta",
    "materiel_emis", "materiel_buta", "materiel_adf", "cle",
    "nb_tiges_emis", "nb_tiges_buta",
    "matiere_tiges_emis", "matiere_tiges_buta",
    "diametre_tige", "longueur_tige",
    "nb_joints_prov", "nb_joints_def",
    "matiere_joint_emis", "matiere_joint_buta",
    "rondelle", "face_bride", "commentaires",
    "rob",
  ];

  if (!allowedFields.includes(field)) {
    return NextResponse.json({ error: `Champ non autorisé: ${field}` }, { status: 400 });
  }

  const { data, error } = await supabase
    .from("flanges")
    .update({ [field]: value })
    .eq("id", id)
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data);
}
