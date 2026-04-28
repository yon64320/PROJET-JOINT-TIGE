import { BigToggle } from "../BigToggle";
import type { SaveField } from "./types";

interface Props {
  label: string;
  field: "rondelle_emis" | "calorifuge" | "echafaudage";
  /** Current boolean state derived from the underlying values */
  on: boolean;
  saveField: SaveField;
  goNext: () => void;
  /** For rondelle: "OUI"/"NON". For calorifuge/echafaudage: "OUI"/null. */
  onValue: string;
  offValue: string | null;
}

/**
 * Step partagé pour les 3 toggles (rondelle, calorifuge, échafaudage).
 */
export function BigToggleStep({ label, field, on, saveField, goNext, onValue, offValue }: Props) {
  return (
    <div className="p-4">
      <BigToggle
        label={label}
        value={on}
        onChange={(v) => {
          saveField(field, v ? onValue : offValue);
          goNext();
        }}
      />
    </div>
  );
}
