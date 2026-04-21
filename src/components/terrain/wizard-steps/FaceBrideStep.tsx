import type { SaveField } from "./types";

interface Props {
  currentValue: string;
  saveField: SaveField;
  goNext: () => void;
}

export function FaceBrideStep({ currentValue, saveField, goNext }: Props) {
  return (
    <div className="p-4">
      <p className="text-sm text-mcm-warm-gray text-center mb-4">Type de face</p>
      <div className="flex gap-3">
        {["RF", "RTJ"].map((ft) => (
          <button
            key={ft}
            onClick={() => {
              saveField("face_bride", ft);
              goNext();
            }}
            className={`flex-1 h-20 rounded-xl text-2xl font-bold transition-colors
              ${
                currentValue === ft
                  ? "bg-mcm-mustard text-white"
                  : "bg-white border-2 border-mcm-warm-gray-border text-mcm-charcoal active:bg-mcm-warm-gray-bg"
              }`}
          >
            {ft}
          </button>
        ))}
      </div>
    </div>
  );
}
