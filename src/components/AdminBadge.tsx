"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { createBrowserSupabase } from "@/lib/db/supabase-browser";

/**
 * Badge "admin" en Client Component — évite tout fetch SSR.
 *
 * Skip volontaire sur `/terrain/*` (PWA offline) :
 * un Server Component dans le root layout cassait la navigation hors-ligne
 * en forçant un fetch Supabase à chaque RSC payload.
 */
export default function AdminBadge() {
  const pathname = usePathname();
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    if (pathname?.startsWith("/terrain")) return;
    if (typeof window === "undefined") return;

    const cached = window.localStorage.getItem("isAdmin");
    if (cached === "true") setIsAdmin(true);

    let cancelled = false;
    (async () => {
      try {
        const { data } = await createBrowserSupabase()
          .from("profiles")
          .select("is_admin")
          .maybeSingle();
        if (cancelled) return;
        const v = data?.is_admin === true;
        setIsAdmin(v);
        try {
          window.localStorage.setItem("isAdmin", String(v));
        } catch {
          // localStorage indisponible (mode privé Safari, quota plein) — ignore
        }
      } catch {
        // offline ou non-authentifié — pas d'erreur visible
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [pathname]);

  if (!isAdmin || pathname?.startsWith("/terrain")) return null;

  return (
    <div
      className="fixed bottom-3 right-3 z-50 px-2 py-0.5 bg-orange-500/80 text-white text-[10px] font-semibold uppercase tracking-wider rounded shadow-sm pointer-events-none select-none"
      title="Mode admin actif"
    >
      admin
    </div>
  );
}
