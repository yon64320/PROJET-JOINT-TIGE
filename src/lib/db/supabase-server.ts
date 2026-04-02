import { createClient } from "@supabase/supabase-js";

/**
 * Client Supabase côté serveur avec service role key.
 * Contourne RLS — à utiliser uniquement dans les API routes après vérification auth.
 */
export const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);
