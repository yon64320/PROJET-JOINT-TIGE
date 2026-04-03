"use client";

interface Props {
  value: string;
  onChange: (value: string) => void;
  onConfirm: () => void;
  label: string;
  /** Show a decimal point key */
  allowDecimal?: boolean;
}

export function NumericKeypad({ value, onChange, onConfirm, label, allowDecimal = false }: Props) {
  const append = (digit: string) => onChange(value + digit);
  const backspace = () => onChange(value.slice(0, -1));

  const keys = ["1", "2", "3", "4", "5", "6", "7", "8", "9", allowDecimal ? "." : "", "0", "⌫"];

  return (
    <div className="flex flex-col gap-3">
      {/* Display */}
      <div className="text-center">
        <p className="text-sm text-mcm-warm-gray mb-1">{label}</p>
        <div className="text-4xl font-bold text-mcm-charcoal min-h-[56px] flex items-center justify-center bg-white rounded-xl border border-mcm-warm-gray-border px-4">
          {value || <span className="text-mcm-warm-gray-light">—</span>}
        </div>
      </div>
      {/* Keypad grid */}
      <div className="grid grid-cols-3 gap-2">
        {keys.map((key, i) =>
          key === "" ? (
            <div key={`empty-${i}`} />
          ) : (
            <button
              key={key}
              onClick={() => (key === "⌫" ? backspace() : append(key))}
              className={`h-16 rounded-xl text-2xl font-semibold transition-colors
                ${
                  key === "⌫"
                    ? "bg-slate-200 text-mcm-warm-gray active:bg-slate-300"
                    : "bg-white border border-mcm-warm-gray-border text-mcm-charcoal active:bg-mcm-warm-gray-bg"
                }`}
            >
              {key}
            </button>
          ),
        )}
      </div>
      {/* Confirm button */}
      <button
        onClick={onConfirm}
        disabled={!value}
        className="h-14 rounded-xl bg-mcm-mustard text-white text-lg font-semibold
                   active:bg-mcm-mustard-hover disabled:opacity-40 transition-colors"
      >
        Valider
      </button>
    </div>
  );
}
