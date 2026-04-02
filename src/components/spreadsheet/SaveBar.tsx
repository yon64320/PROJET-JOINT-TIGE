"use client";

import type { SaveStatus } from "@/hooks/useSheetSync";

interface SaveBarProps {
  pendingCount: number;
  saveStatus: SaveStatus;
  onSave: () => Promise<void>;
}

export default function SaveBar({ pendingCount, saveStatus, onSave }: SaveBarProps) {
  return (
    <div
      style={{
        display: "flex",
        justifyContent: "flex-end",
        alignItems: "center",
        padding: "6px 12px",
        gap: "8px",
        borderBottom: "1px solid #e5e7eb",
      }}
    >
      {saveStatus === "saved" && (
        <span style={{ color: "#16a34a", fontSize: 13, fontWeight: 500 }}>Sauvegardé ✓</span>
      )}
      {saveStatus === "error" && (
        <span style={{ color: "#dc2626", fontSize: 13, fontWeight: 500 }}>Erreur</span>
      )}
      <button
        onClick={onSave}
        disabled={pendingCount === 0 || saveStatus === "saving"}
        style={{
          padding: "6px 16px",
          fontSize: 13,
          fontWeight: 600,
          borderRadius: 6,
          border: "none",
          cursor: pendingCount === 0 || saveStatus === "saving" ? "default" : "pointer",
          backgroundColor: pendingCount === 0 || saveStatus === "saving" ? "#d1d5db" : "#1E3A5F",
          color: pendingCount === 0 || saveStatus === "saving" ? "#9ca3af" : "#fff",
        }}
      >
        {saveStatus === "saving"
          ? "Sauvegarde..."
          : `Sauvegarder${pendingCount > 0 ? ` (${pendingCount})` : ""}`}
      </button>
    </div>
  );
}
