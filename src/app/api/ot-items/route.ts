import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/db/supabase";

export async function GET(request: NextRequest) {
  const projectId = request.nextUrl.searchParams.get("projectId");
  if (!projectId) {
    return NextResponse.json({ error: "projectId requis" }, { status: 400 });
  }

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

/** PATCH body: { id, field, value } */
export async function PATCH(request: NextRequest) {
  const body = await request.json();
  const { id, field, value } = body;

  if (!id || !field) {
    return NextResponse.json({ error: "id et field requis" }, { status: 400 });
  }

  // Whitelist des champs modifiables
  const allowedFields = [
    "unite", "item", "ot", "lot", "titre_gamme",
    "famille_item", "type_item", "type_travaux", "statut",
    "commentaires", "revision",
    "corps_metier_echaf", "corps_metier_calo", "corps_metier_montage",
    "corps_metier_metal", "corps_metier_fourniture",
    "corps_metier_nettoyage", "corps_metier_autres",
  ];

  if (!allowedFields.includes(field)) {
    return NextResponse.json({ error: `Champ non autorisé: ${field}` }, { status: 400 });
  }

  const { data, error } = await supabase
    .from("ot_items")
    .update({ [field]: value })
    .eq("id", id)
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data);
}
