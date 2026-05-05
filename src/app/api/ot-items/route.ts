import { NextRequest, NextResponse } from "next/server";
import { createServerSupabase } from "@/lib/db/supabase-ssr";
import { serverError } from "@/lib/api/errors";
import { handlePatch } from "@/lib/api/patch-handler";

const PAGE_SIZE = 1000;

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

  // Pagination .range() — tiebreaker .order("id") car numero_ligne peut contenir
  // des doublons (ou être NULL après import partiel).
  const all: unknown[] = [];
  let from = 0;
  while (true) {
    const { data, error } = await supabase
      .from("ot_items")
      .select("*")
      .eq("project_id", projectId)
      .order("numero_ligne", { ascending: true })
      .order("id", { ascending: true })
      .range(from, from + PAGE_SIZE - 1);

    if (error) return serverError("[GET /api/ot-items]", error);
    if (!data || data.length === 0) break;
    all.push(...data);
    if (data.length < PAGE_SIZE) break;
    from += PAGE_SIZE;
  }

  return NextResponse.json(all);
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
