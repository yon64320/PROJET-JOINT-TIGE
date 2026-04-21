import { NumericKeypad } from "../NumericKeypad";
import type { SaveField } from "./types";

interface Props {
  label: string;
  field: "dn_emis" | "pn_emis";
  butaValue: string | null | undefined;
  currentValue: string;
  keypadValue: string;
  setKeypadValue: (v: string) => void;
  saveField: SaveField;
  goNext: () => void;
  confirmNumeric: (field: string) => void;
}

/**
 * Shared step UI for DN and PN — both display a BUTA hint + numeric keypad.
 */
export function DnPnStep({
  label,
  field,
  butaValue,
  currentValue,
  keypadValue,
  setKeypadValue,
  saveField,
  goNext,
  confirmNumeric,
}: Props) {
  return (
    <div className="p-4">
      {butaValue && !currentValue && (
        <div className="mb-4 p-3 bg-blue-50 rounded-xl text-center">
          <p className="text-sm text-mcm-warm-gray mb-1">Valeur client (BUTA)</p>
          <p className="text-2xl font-bold text-blue-700">{butaValue}</p>
          <button
            onClick={() => {
              saveField(field, butaValue);
              goNext();
            }}
            className="mt-2 h-12 px-6 rounded-xl bg-mcm-teal text-white font-semibold active:bg-mcm-teal-dark"
          >
            Confirmer valeur client
          </button>
        </div>
      )}
      <NumericKeypad
        label={label}
        value={keypadValue}
        onChange={setKeypadValue}
        onConfirm={() => confirmNumeric(field)}
        allowDecimal
      />
    </div>
  );
}
