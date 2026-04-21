import type { SaveField, WizardValues } from "./types";

interface Props {
  values: WizardValues;
  setValues: (updater: (prev: WizardValues) => WizardValues) => void;
  saveField: SaveField;
  goNext: () => void;
}

const DIMS = [
  { field: "echaf_longueur", label: "Longueur (L)" },
  { field: "echaf_largeur", label: "Largeur (l)" },
  { field: "echaf_hauteur", label: "Hauteur (H)" },
] as const;

export function EchafaudageDimensionsStep({ values, setValues, saveField, goNext }: Props) {
  return (
    <div className="p-4">
      <p className="text-sm text-mcm-warm-gray text-center mb-4">Dimensions échafaudage</p>
      <div className="space-y-4">
        {DIMS.map(({ field, label }) => (
          <div key={field}>
            <label className="block text-sm text-mcm-warm-gray mb-1">{label}</label>
            <div className="relative">
              <input
                inputMode="decimal"
                value={(values as unknown as Record<string, string>)[field] ?? ""}
                onChange={(e) =>
                  setValues((prev) => ({ ...prev, [field]: e.target.value }) as WizardValues)
                }
                onBlur={() =>
                  saveField(field, (values as unknown as Record<string, string>)[field] || null)
                }
                placeholder="—"
                className="w-full h-16 px-4 pr-12 text-2xl rounded-xl border border-mcm-warm-gray-border
                           bg-white text-mcm-charcoal text-center"
              />
              <span className="absolute right-4 top-1/2 -translate-y-1/2 text-lg text-mcm-warm-gray">
                m
              </span>
            </div>
          </div>
        ))}
      </div>
      <button
        onClick={goNext}
        className="mt-4 w-full h-14 rounded-xl bg-mcm-mustard text-white text-lg font-semibold
                   active:bg-mcm-mustard-hover transition-colors"
      >
        Continuer
      </button>
    </div>
  );
}
