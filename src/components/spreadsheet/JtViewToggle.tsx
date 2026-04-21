"use client";

import { JT_VIEW_CONFIGS, type JtViewMode } from "@/lib/jt-views";

interface JtViewToggleProps {
  activeView: JtViewMode;
  onViewChange: (view: JtViewMode) => void;
  columnCounts: Record<JtViewMode, number>;
}

const SHEET_VIEWS: JtViewMode[] = ["terrain", "client", "synthese", "complete"];
const DERIVED_VIEWS: JtViewMode[] = ["robinetterie", "echafaudage", "calorifuge"];

const VIEW_COLORS: Record<JtViewMode, { active: string; badge: string }> = {
  terrain: { active: "bg-white text-blue-700 shadow-sm", badge: "text-blue-500" },
  client: { active: "bg-white text-orange-700 shadow-sm", badge: "text-orange-500" },
  synthese: { active: "bg-white text-emerald-700 shadow-sm", badge: "text-emerald-500" },
  complete: { active: "bg-white text-slate-700 shadow-sm", badge: "text-slate-500" },
  robinetterie: { active: "bg-white shadow-sm", badge: "" },
  echafaudage: { active: "bg-white text-violet-700 shadow-sm", badge: "text-violet-500" },
  calorifuge: { active: "bg-white text-cyan-700 shadow-sm", badge: "text-cyan-500" },
};

export default function JtViewToggle({
  activeView,
  onViewChange,
  columnCounts,
}: JtViewToggleProps) {
  const renderButton = (mode: JtViewMode) => {
    const config = JT_VIEW_CONFIGS[mode];
    const isActive = mode === activeView;
    const colors = VIEW_COLORS[mode];
    const isRob = mode === "robinetterie";
    return (
      <button
        key={mode}
        onClick={() => onViewChange(mode)}
        className={`px-3.5 py-1.5 rounded-md text-sm font-medium transition-all ${
          isActive ? colors.active : "text-slate-500 hover:text-slate-700"
        }`}
        style={isRob && isActive ? { color: "#C2572A" } : undefined}
      >
        {config.label}
      </button>
    );
  };

  return (
    <div className="w-full sm:w-auto flex items-center gap-2">
      {/* Mobile: select natif */}
      <select
        value={activeView}
        onChange={(e) => onViewChange(e.target.value as JtViewMode)}
        className="sm:hidden min-h-[44px] w-full text-base rounded-lg border border-slate-300 bg-white px-3 py-2 focus:ring-1 focus:ring-blue-400 focus:border-blue-400 outline-none"
      >
        <optgroup label="Vues tableur">
          {SHEET_VIEWS.map((mode) => (
            <option key={mode} value={mode}>
              {JT_VIEW_CONFIGS[mode].label}
            </option>
          ))}
        </optgroup>
        <optgroup label="Vues dérivées">
          {DERIVED_VIEWS.map((mode) => (
            <option key={mode} value={mode}>
              {JT_VIEW_CONFIGS[mode].label}
            </option>
          ))}
        </optgroup>
      </select>

      {/* Desktop: boutons inline */}
      <div className="hidden sm:inline-flex items-center bg-slate-100 rounded-lg p-0.5">
        {SHEET_VIEWS.map(renderButton)}
      </div>
      <div className="hidden sm:block w-px h-5 bg-slate-300" />
      <div className="hidden sm:inline-flex items-center bg-slate-100 rounded-lg p-0.5">
        {DERIVED_VIEWS.map(renderButton)}
      </div>
    </div>
  );
}
