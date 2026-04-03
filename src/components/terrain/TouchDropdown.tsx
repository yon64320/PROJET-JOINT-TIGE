"use client";

import { useState } from "react";

interface Props {
  label: string;
  options: { value: string; label: string }[];
  selected: string | null;
  onSelect: (value: string) => void;
  /** Show a free-text input as last option */
  allowCustom?: boolean;
  customPlaceholder?: string;
}

export function TouchDropdown({
  label,
  options,
  selected,
  onSelect,
  allowCustom = false,
  customPlaceholder = "Autre…",
}: Props) {
  const [showCustom, setShowCustom] = useState(false);
  const [customValue, setCustomValue] = useState("");

  return (
    <div className="flex flex-col gap-2">
      <p className="text-sm text-mcm-warm-gray">{label}</p>
      <div className="flex flex-col gap-2 max-h-[60vh] overflow-y-auto">
        {options.map((opt) => (
          <button
            key={opt.value}
            onClick={() => {
              setShowCustom(false);
              onSelect(opt.value);
            }}
            className={`w-full text-left px-4 min-h-[56px] rounded-xl text-base font-medium transition-colors
              flex items-center
              ${
                selected === opt.value && !showCustom
                  ? "bg-mcm-mustard text-white"
                  : "bg-white border border-mcm-warm-gray-border text-mcm-charcoal active:bg-mcm-warm-gray-bg"
              }`}
          >
            {opt.label}
          </button>
        ))}
        {allowCustom && !showCustom && (
          <button
            onClick={() => setShowCustom(true)}
            className="w-full text-left px-4 min-h-[56px] rounded-xl text-base font-medium transition-colors
              flex items-center bg-slate-50 border border-dashed border-mcm-warm-gray-border text-mcm-warm-gray active:bg-mcm-warm-gray-bg"
          >
            {customPlaceholder}
          </button>
        )}
        {allowCustom && showCustom && (
          <div className="flex gap-2">
            <input
              autoFocus
              type="text"
              value={customValue}
              onChange={(e) => setCustomValue(e.target.value)}
              placeholder="Saisir la valeur"
              className="flex-1 min-h-[56px] px-4 rounded-xl text-lg border border-mcm-warm-gray-border
                         focus:outline-none focus:ring-2 focus:ring-mcm-mustard"
            />
            <button
              disabled={!customValue.trim()}
              onClick={() => {
                onSelect(customValue.trim());
                setShowCustom(false);
                setCustomValue("");
              }}
              className="px-6 min-h-[56px] rounded-xl bg-mcm-mustard text-white text-base font-semibold
                         active:bg-mcm-mustard-hover disabled:opacity-40 transition-colors"
            >
              OK
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
