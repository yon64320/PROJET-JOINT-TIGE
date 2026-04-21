"use client";

import { useState, useCallback, useEffect } from "react";
import dynamic from "next/dynamic";
import type { FicheRobTemplate } from "@/lib/domain/fiche-rob-fields";
import type { RobFlangeRow } from "@/types/rob";

const RobSheet = dynamic(() => import("@/components/spreadsheet/RobSheet"), { ssr: false });
const FicheSelector = dynamic(() => import("./FicheSelector"), { ssr: false });

type Mode = "tableur" | "fiches";

interface RobinerieViewProps {
  rows: RobFlangeRow[];
  projectId: string;
  projectName: string;
  template: FicheRobTemplate;
}

export default function RobinerieView({
  rows,
  projectId,
  projectName,
  template: serverTemplate,
}: RobinerieViewProps) {
  const [mode, setMode] = useState<Mode>("tableur");
  const [generating, setGenerating] = useState(false);

  // Always fetch the latest template client-side to avoid stale server cache
  const [template, setTemplate] = useState<FicheRobTemplate>(serverTemplate);
  useEffect(() => {
    fetch(`/api/projects/${projectId}/fiche-template`)
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (data) setTemplate(data);
      })
      .catch(() => {});
  }, [projectId]);

  const handleGenerate = useCallback(
    async (selectedIds: string[]) => {
      setGenerating(true);
      try {
        const res = await fetch("/api/pdf/fiches-rob", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ projectId, flangeIds: selectedIds }),
        });

        if (!res.ok) {
          const err = await res.json().catch(() => ({ error: "Erreur inconnue" }));
          throw new Error(err.error || "Erreur génération PDF");
        }

        const blob = await res.blob();
        const date = new Date().toISOString().slice(0, 10);
        const safeName = projectName.replace(/[^a-zA-Z0-9_-]/g, "_");
        const filename = `Fiches_rob_${safeName}_${date}.pdf`;

        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      } catch (err) {
        console.error("PDF generation error:", err);
      } finally {
        setGenerating(false);
      }
    },
    [projectId, projectName],
  );

  return (
    <>
      {/* Toggle bar */}
      <div className="flex items-center gap-1 px-4 py-1.5 border-b border-slate-200 bg-slate-50">
        <ToggleButton active={mode === "tableur"} onClick={() => setMode("tableur")}>
          <svg
            className="w-3.5 h-3.5"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M3 10h18M3 14h18M3 6h18M3 18h18"
            />
          </svg>
          Tableur
        </ToggleButton>
        <ToggleButton active={mode === "fiches"} onClick={() => setMode("fiches")}>
          <svg
            className="w-3.5 h-3.5"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
            />
          </svg>
          Fiches PDF
        </ToggleButton>
      </div>

      {/* Content */}
      <div className="flex-1 min-h-0">
        {mode === "tableur" ? (
          <RobSheet rows={rows} />
        ) : (
          <FicheSelector
            rows={rows}
            template={template}
            onGenerate={handleGenerate}
            generating={generating}
          />
        )}
      </div>
    </>
  );
}

function ToggleButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={`inline-flex items-center gap-1.5 px-3 py-2.5 sm:py-1.5 min-h-[44px] sm:min-h-0 text-xs font-medium rounded transition-colors ${
        active
          ? "bg-white text-blue-700 shadow-sm border border-slate-200"
          : "text-slate-500 hover:text-slate-700 hover:bg-slate-100"
      }`}
    >
      {children}
    </button>
  );
}
