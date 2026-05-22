import type { SaveField, WizardValues } from "./types";

interface Props {
  value: string;
  setValues: (updater: (prev: WizardValues) => WizardValues) => void;
  saveField: SaveField;
}

export function CommentairesStep({ value, setValues, saveField }: Props) {
  return (
    <div className="p-4">
      <p className="text-sm text-mcm-warm-gray mb-2">Commentaire (optionnel)</p>
      <textarea
        value={value}
        onChange={(e) => setValues((prev) => ({ ...prev, commentaires: e.target.value }))}
        onBlur={() => saveField("commentaires", value || null)}
        placeholder="Observations terrain..."
        rows={4}
        className="w-full p-3 text-lg rounded-xl border border-mcm-warm-gray-border
                   bg-white text-mcm-charcoal resize-none"
      />
    </div>
  );
}
