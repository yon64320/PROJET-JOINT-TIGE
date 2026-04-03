"use client";

import { SessionProvider } from "@/lib/offline/context";
import { use } from "react";

export default function SessionLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<Record<string, string>>;
}) {
  const resolved = use(params);
  const sessionId = resolved.sessionId ?? "";

  return <SessionProvider sessionId={sessionId}>{children}</SessionProvider>;
}
