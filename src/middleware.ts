import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

/**
 * Middleware auth avec cookies Supabase.
 * - Rafraîchit le token automatiquement
 * - Redirige vers /login si non authentifié (pages)
 * - Retourne 401 si non authentifié (API)
 */
export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Routes publiques — jamais de vérification
  // Note: /terrain/* pages are served by the Service Worker when offline,
  // but auth is still checked when online
  if (
    pathname.startsWith("/login") ||
    pathname.startsWith("/auth/") ||
    pathname.startsWith("/terrain") ||
    pathname.startsWith("/_next/") ||
    pathname.startsWith("/favicon") ||
    pathname === "/sw.js" ||
    pathname === "/manifest.json"
  ) {
    return NextResponse.next();
  }

  // Bypass complet en dev
  if (process.env.SKIP_AUTH === "true") {
    return NextResponse.next();
  }

  // Créer le client Supabase avec gestion des cookies
  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          // Mettre à jour les cookies sur la request (pour le SSR en aval)
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          // Recréer la response avec les cookies mis à jour
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options),
          );
        },
      },
    },
  );

  // Vérifier la session (et rafraîchir le token si expiré)
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    // API routes → 401 JSON
    if (pathname.startsWith("/api/")) {
      return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
    }
    // Pages → redirect vers /login
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    return NextResponse.redirect(url);
  }

  return supabaseResponse;
}

export const config = {
  matcher: [
    /*
     * Toutes les routes sauf les fichiers statiques Next.js
     */
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
