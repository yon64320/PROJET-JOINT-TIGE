import { NextResponse } from "next/server";

/**
 * Réponse 500 standardisée pour erreur INATTENDUE (DB, Storage, IO).
 * Log côté serveur (visible Vercel/Supabase logs), renvoie un message
 * générique au client pour ne pas leak la structure interne.
 *
 * NE PAS utiliser pour les erreurs métier (404, 400, 403, 409) qui doivent
 * rester explicites côté client.
 */
export function serverError(ctx: string, error: unknown): NextResponse {
  console.error(ctx, error);
  return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
}
