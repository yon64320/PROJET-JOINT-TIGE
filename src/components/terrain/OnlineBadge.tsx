"use client";

import { useOnlineStatus } from "@/lib/offline/hooks";

export function OnlineBadge() {
  const isOnline = useOnlineStatus();

  return (
    <div className="flex items-center gap-1.5">
      <div
        className={`w-2.5 h-2.5 rounded-full ${isOnline ? "bg-mcm-teal" : "bg-red-500"} ${isOnline ? "" : "animate-pulse"}`}
      />
      <span className="text-xs font-medium text-mcm-warm-gray">
        {isOnline ? "En ligne" : "Hors ligne"}
      </span>
    </div>
  );
}
