import { TouchDropdown } from "../TouchDropdown";
import type { SaveField } from "./types";

interface Props {
  currentValue: string;
  saveField: SaveField;
  goNext: () => void;
}

const OPTIONS = [
  { value: "GRAPHITE", label: "Graphite" },
  { value: "PTFE", label: "PTFE" },
  { value: "SPIRALE", label: "Spiralé" },
  { value: "KLINGERSIL", label: "Klingersil" },
  { value: "CAF", label: "CAF" },
  { value: "METAL", label: "Métallique" },
];

export function MatiereJointStep({ currentValue, saveField, goNext }: Props) {
  return (
    <div className="p-4">
      <TouchDropdown
        label="Matière joint"
        options={OPTIONS}
        selected={currentValue}
        onSelect={(v) => {
          saveField("matiere_joint_emis", v);
          goNext();
        }}
        allowCustom
        customPlaceholder="Autre matière…"
      />
    </div>
  );
}
