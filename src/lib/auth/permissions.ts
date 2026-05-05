import type { SupabaseClient, User } from "@supabase/supabase-js";

export type CurrentUser = { id: string; email: string | null; isAdmin: boolean };

/**
 * Récupère le user courant depuis un client Supabase déjà authentifié
 * (cookies SSR ou Bearer token), enrichi de son flag is_admin.
 * Retourne null si non authentifié.
 */
export async function getCurrentUser(supabase: SupabaseClient): Promise<CurrentUser | null> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;
  const isAdmin = await checkIsAdmin(supabase, user.id);
  return { id: user.id, email: user.email ?? null, isAdmin };
}

/**
 * Vérifie si un user est admin via la table profiles.
 * Fonctionne avec n'importe quel client Supabase (anon, authenticated, service-role).
 * Retourne false en cas d'erreur ou de profil manquant.
 */
export async function checkIsAdmin(supabase: SupabaseClient, userId: string): Promise<boolean> {
  const { data, error } = await supabase
    .from("profiles")
    .select("is_admin")
    .eq("id", userId)
    .maybeSingle();
  if (error || !data) return false;
  return Boolean(data.is_admin);
}

/**
 * Construit le couple {user, isAdmin} à partir d'un User déjà résolu
 * (typiquement via getUser(request) dans les routes terrain).
 */
export async function resolveAdmin(supabase: SupabaseClient, user: User): Promise<CurrentUser> {
  const isAdmin = await checkIsAdmin(supabase, user.id);
  return { id: user.id, email: user.email ?? null, isAdmin };
}
