import { cache } from "react";
import { createServerSupabase } from "./supabase-ssr";
import { getCurrentUser, type CurrentUser } from "@/lib/auth/permissions";

/**
 * Requêtes projet mémoïsées par requête serveur via `React.cache`.
 *
 * Plusieurs RSC peuvent appeler `getProject(id)` / `getProjectName(id)` pendant
 * le rendu — `cache` dédupe automatiquement au sein de la même requête.
 *
 * Utilise le client SSR authentifié — la RLS filtre via owner_id, donc
 * un user qui appelle getProject(<id-d'un-autre-user>) reçoit null.
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
  const supabase = await createServerSupabase();
  const { data, error } = await supabase.from("projects").select("*").eq("id", id).single();
  if (error) return null;
  return data as unknown as ProjectRow;
});

export const getProjectName = cache(async (id: string): Promise<string> => {
  const supabase = await createServerSupabase();
  const { data } = await supabase.from("projects").select("name").eq("id", id).single();
  return (data?.name as string | undefined) ?? "Projet";
});

/**
 * User courant (id, email, isAdmin) — mémoïsé par requête serveur.
 * Utiliser dans les Server Components et layouts pour éviter les multi-fetch.
 */
export const getCurrentUserCached = cache(async (): Promise<CurrentUser | null> => {
  const supabase = await createServerSupabase();
  return getCurrentUser(supabase);
});

/** Raccourci pour les pages qui n'ont besoin que du nom + header_colors + fiche_rob_template */
export const getProjectHeader = cache(async (id: string) => {
  const supabase = await createServerSupabase();
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
