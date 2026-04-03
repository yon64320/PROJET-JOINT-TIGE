"use client";

interface Props {
  label: string;
  predictedValue: string | number | null;
  onAccept: () => void;
  onOverride: () => void;
}

export function PredictionBadge({ label, predictedValue, onAccept, onOverride }: Props) {
  if (predictedValue == null) return null;

  return (
    <div className="flex flex-col items-center gap-3 py-4">
      <p className="text-sm text-mcm-warm-gray">{label}</p>
      <p className="text-4xl font-bold text-mcm-warm-gray-light">{predictedValue}</p>
      <div className="flex gap-3 w-full">
        <button
          onClick={onAccept}
          className="flex-1 h-14 rounded-xl bg-mcm-teal text-white text-lg font-semibold
                     active:bg-mcm-teal-dark transition-colors flex items-center justify-center gap-2"
        >
          <svg
            className="w-6 h-6"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={3}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
          Valider
        </button>
        <button
          onClick={onOverride}
          className="flex-1 h-14 rounded-xl bg-white border border-mcm-warm-gray-border text-mcm-charcoal
                     text-lg font-semibold active:bg-mcm-warm-gray-bg transition-colors"
        >
          Modifier
        </button>
      </div>
    </div>
  );
}
