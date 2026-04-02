import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { createClient } from "@supabase/supabase-js";

/**
 * Middleware auth : vérifie le JWT sur les routes /api/* (sauf /api/auth/*).
 * En dev, le middleware laisse passer si SKIP_AUTH=true.
 */
export async function middleware(request: NextRequest) {
  // Skip auth routes
  if (request.nextUrl.pathname.startsWith("/api/auth")) {
    return NextResponse.next();
  }

  // Skip auth check in development if SKIP_AUTH is set
  if (process.env.SKIP_AUTH === "true") {
    return NextResponse.next();
  }

  const authHeader = request.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  }

  const token = authHeader.slice(7);

  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      { global: { headers: { Authorization: `Bearer ${token}` } } },
    );

    const {
      data: { user },
      error,
    } = await supabase.auth.getUser();
    if (error || !user) {
      return NextResponse.json({ error: "Token invalide" }, { status: 401 });
    }

    // Pass user info to API routes via headers
    const response = NextResponse.next();
    response.headers.set("x-user-id", user.id);
    response.headers.set("x-user-email", user.email ?? "");
    return response;
  } catch {
    return NextResponse.json({ error: "Erreur authentification" }, { status: 401 });
  }
}

export const config = {
  matcher: "/api/:path*",
};
