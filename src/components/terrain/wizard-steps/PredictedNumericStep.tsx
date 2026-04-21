import { NumericKeypad } from "../NumericKeypad";
import { PredictionBadge } from "../PredictionBadge";
import type { SaveField } from "./types";

interface Props {
  /** Human-readable label shown on prediction + keypad */
  predictionLabel: string;
  keypadLabel: string;
  field: string;
  /** Predicted value (null if no prediction available) */
  predictedValue: number | null | undefined;
  keypadValue: string;
  setKeypadValue: (v: string) => void;
  showKeypad: boolean;
  setShowKeypad: (v: boolean) => void;
  saveField: SaveField;
  goNext: () => void;
  confirmNumeric: (field: string) => void;
  allowDecimal?: boolean;
}

/**
 * Step partagé pour nb_tiges / diametre_tige / longueur_tige — bolt prediction + fallback keypad.
 */
export function PredictedNumericStep({
  predictionLabel,
  keypadLabel,
  field,
  predictedValue,
  keypadValue,
  setKeypadValue,
  showKeypad,
  setShowKeypad,
  saveField,
  goNext,
  confirmNumeric,
  allowDecimal,
}: Props) {
  return (
    <div className="p-4">
      {predictedValue != null && !showKeypad ? (
        <PredictionBadge
          label={predictionLabel}
          predictedValue={predictedValue}
          onAccept={() => {
            saveField(field, String(predictedValue));
            goNext();
          }}
          onOverride={() => {
            setShowKeypad(true);
            setKeypadValue("");
          }}
        />
      ) : (
        <NumericKeypad
          label={keypadLabel}
          value={keypadValue}
          onChange={setKeypadValue}
          onConfirm={() => confirmNumeric(field)}
          allowDecimal={allowDecimal}
        />
      )}
    </div>
  );
}
