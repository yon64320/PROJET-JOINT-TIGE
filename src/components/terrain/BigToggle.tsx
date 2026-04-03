"use client";

interface Props {
  label: string;
  value: boolean | null;
  onChange: (value: boolean) => void;
}

export function BigToggle({ label, value, onChange }: Props) {
  return (
    <div className="flex flex-col items-center gap-3">
      <p className="text-sm text-mcm-warm-gray">{label}</p>
      <div className="flex gap-3 w-full">
        <button
          onClick={() => onChange(true)}
          className={`flex-1 h-14 rounded-xl text-lg font-semibold transition-colors
            ${
              value === true
                ? "bg-mcm-teal text-white"
                : "bg-white border border-mcm-warm-gray-border text-mcm-charcoal active:bg-mcm-warm-gray-bg"
            }`}
        >
          OUI
        </button>
        <button
          onClick={() => onChange(false)}
          className={`flex-1 h-14 rounded-xl text-lg font-semibold transition-colors
            ${
              value === false
                ? "bg-mcm-burnt-orange text-white"
                : "bg-white border border-mcm-warm-gray-border text-mcm-charcoal active:bg-mcm-warm-gray-bg"
            }`}
        >
          NON
        </button>
      </div>
    </div>
  );
}
