"use client";

import { type ReactNode } from "react";
import { OnlineBadge } from "./OnlineBadge";

interface Props {
  title: string;
  backHref?: string;
  backLabel?: string;
  children: ReactNode;
  actions?: ReactNode;
}

export function TerrainLayout({ title, backHref, backLabel, children, actions }: Props) {
  return (
    <div className="flex flex-col h-screen bg-mcm-cream">
      {/* Header compact — 56px pour gros doigts */}
      <header className="flex items-center gap-3 px-4 py-3 border-b border-mcm-warm-gray-border bg-white shrink-0">
        {backHref ? (
          <a
            href={backHref}
            className="flex items-center gap-1 text-mcm-warm-gray shrink-0 min-h-[44px] min-w-[44px] justify-center"
          >
            <svg
              className="w-5 h-5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
            {backLabel && <span className="text-sm hidden sm:inline">{backLabel}</span>}
          </a>
        ) : (
          <div className="w-7 h-7 bg-mcm-mustard rounded flex items-center justify-center shrink-0">
            <span className="text-white font-bold text-xs">E</span>
          </div>
        )}
        <h1 className="text-base font-semibold text-mcm-charcoal truncate flex-1">{title}</h1>
        <div className="flex items-center gap-2 shrink-0">
          {actions}
          <OnlineBadge />
        </div>
      </header>
      {/* Content */}
      <main className="flex-1 min-h-0 overflow-y-auto">{children}</main>
    </div>
  );
}
