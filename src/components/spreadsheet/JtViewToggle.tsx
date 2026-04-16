"use client";

import { JT_VIEW_CONFIGS, type JtViewMode } from "@/lib/jt-views";

interface JtViewToggleProps {
  activeView: JtViewMode;
  onViewChange: (view: JtViewMode) => void;
  columnCounts: Record<JtViewMode, number>;
}

const VIEW_ORDER: JtViewMode[] = ["terrain", "client", "synthese", "complete"];

const VIEW_COLORS: Record<JtViewMode, { active: string; badge: string }> = {
  terrain: { active: "bg-white text-blue-700 shadow-sm", badge: "text-blue-500" },
  client: { active: "bg-white text-orange-700 shadow-sm", badge: "text-orange-500" },
  synthese: { active: "bg-white text-emerald-700 shadow-sm", badge: "text-emerald-500" },
  complete: { active: "bg-white text-slate-700 shadow-sm", badge: "text-slate-500" },
};

export default function JtViewToggle({
  activeView,
  onViewChange,
  columnCounts,
}: JtViewToggleProps) {
  return (
    <div className="inline-flex items-center bg-slate-100 rounded-lg p-0.5">
      {VIEW_ORDER.map((mode) => {
        const config = JT_VIEW_CONFIGS[mode];
        const isActive = mode === activeView;
        const colors = VIEW_COLORS[mode];
        return (
          <button
            key={mode}
            onClick={() => onViewChange(mode)}
            className={`px-3.5 py-1.5 rounded-md text-sm font-medium transition-all ${
              isActive ? colors.active : "text-slate-500 hover:text-slate-700"
            }`}
          >
            {config.label}
            <span className={`ml-1.5 text-xs ${isActive ? colors.badge : "text-slate-400"}`}>
              {columnCounts[mode]}
            </span>
          </button>
        );
      })}
    </div>
  );
}
