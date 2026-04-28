import type { SaveField, WizardValues } from "./types";

interface Props {
  value: string;
  predictedDesignation: string | null | undefined;
  setValues: (updater: (prev: WizardValues) => WizardValues) => void;
  saveField: SaveField;
  goNext: () => void;
}

export function DimensionTigeStep({
  value,
  predictedDesignation,
  setValues,
  saveField,
  goNext,
}: Props) {
  return (
    <div className="p-4 space-y-3">
      <p className="text-sm text-mcm-warm-gray mb-2">Dimension tige</p>
      {predictedDesignation && !value && (
        <button
          onClick={() => {
            setValues((prev) => ({ ...prev, dimension_tige_emis: predictedDesignation }));
            saveField("dimension_tige_emis", predictedDesignation);
          }}
          className="w-full h-14 rounded-xl bg-mcm-teal-light text-mcm-teal text-lg font-semibold
                     border border-mcm-teal/30 active:bg-mcm-teal/20 transition-colors"
        >
          Prédit : {predictedDesignation}
        </button>
      )}
      <input
        type="text"
        value={value}
        onChange={(e) => setValues((prev) => ({ ...prev, dimension_tige_emis: e.target.value }))}
        onBlur={() => saveField("dimension_tige_emis", value || null)}
        placeholder="ex: M16 x 70"
        className="w-full h-14 px-4 text-2xl rounded-xl border border-mcm-warm-gray-border
                   bg-white text-mcm-charcoal"
      />
      <button
        onClick={() => {
          saveField("dimension_tige_emis", value || null);
          goNext();
        }}
        className="w-full h-14 rounded-xl bg-mcm-mustard text-white text-lg font-semibold
                   active:bg-mcm-mustard-hover transition-colors"
      >
        Continuer
      </button>
    </div>
  );
}
