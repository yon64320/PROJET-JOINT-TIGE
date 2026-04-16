"use client";

import type { SaveStatus } from "@/hooks/useSheetSync";

interface SaveBarProps {
  pendingCount: number;
  saveStatus: SaveStatus;
  onSave?: () => Promise<void>;
}

export default function SaveBar({ pendingCount, saveStatus }: SaveBarProps) {
  // Nothing to show when idle and no pending changes
  if (saveStatus === "idle" && pendingCount === 0) return null;

  return (
    <div
      style={{
        display: "flex",
        justifyContent: "flex-end",
        alignItems: "center",
        padding: "4px 12px",
        borderBottom: "1px solid #e5e7eb",
        fontSize: 13,
        fontWeight: 500,
        minHeight: 28,
      }}
    >
      {saveStatus === "saving" && <span style={{ color: "#6b7280" }}>Sauvegarde...</span>}
      {saveStatus === "saved" && <span style={{ color: "#16a34a" }}>Sauvegardé ✓</span>}
      {saveStatus === "error" && <span style={{ color: "#dc2626" }}>Erreur de sauvegarde</span>}
      {saveStatus === "idle" && pendingCount > 0 && (
        <span style={{ color: "#6b7280" }}>{pendingCount} en attente...</span>
      )}
    </div>
  );
}
