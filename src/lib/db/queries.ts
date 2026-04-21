import { cache } from "react";
import { supabase } from "./supabase";

/**
 * Requêtes projet mémoïsées par requête serveur via `React.cache`.
 *
 * Plusieurs RSC peuvent appeler `getProject(id)` / `getProjectName(id)` pendant
 * le rendu — `cache` dédupe automatiquement au sein de la même requête.
 */

export type ProjectRow = {
  id: string;
  name: string;
  client: string | null;
  revision: string | null;
  units: string[] | null;
  header_colors: Record<string, string> | null;
  fiche_rob_template: Record<string, unknown> | null;
  last_import_template_id: string | null;
};

export const getProject = cache(async (id: string) => {
  const { data, error } = await supabase.from("projects").select("*").eq("id", id).single();
  if (error) return null;
  return data as unknown as ProjectRow;
});

export const getProjectName = cache(async (id: string): Promise<string> => {
  const { data } = await supabase.from("projects").select("name").eq("id", id).single();
  return (data?.name as string | undefined) ?? "Projet";
});

/** Raccourci pour les pages qui n'ont besoin que du nom + header_colors + fiche_rob_template */
export const getProjectHeader = cache(async (id: string) => {
  const { data } = await supabase
    .from("projects")
    .select("name, header_colors, fiche_rob_template")
    .eq("id", id)
    .single();
  return data as {
    name: string;
    header_colors: Record<string, string> | null;
    fiche_rob_template: Record<string, unknown> | null;
  } | null;
});
