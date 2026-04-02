import { createBrowserClient } from "@supabase/ssr";

/**
 * Client Supabase côté navigateur avec gestion automatique des cookies.
 * Utiliser pour l'authentification et les opérations côté client.
 */
export function createBrowserSupabase() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );
}
