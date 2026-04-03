import { NextRequest, NextResponse } from "next/server";

/**
 * Legacy sync endpoint — redirige vers /api/terrain/sync.
 * Conservé pour compatibilité.
 */
export async function POST(request: NextRequest) {
  const url = new URL("/api/terrain/sync", request.url);
  return NextResponse.rewrite(url);
}
