import type { EchafFebData } from "@/lib/validation/schemas";
import type { OfflineFlange, OfflineOtItem } from "@/lib/offline/db";
import type { SaveFebField } from "../types";

interface Props {
  flange: OfflineFlange;
  otItem: OfflineOtItem | null;
  feb: EchafFebData;
  saveFeb: SaveFebField;
  goNext: () => void;
}

function ReadOnlyRow({ label, value }: { label: string; value: string | null | undefined }) {
  return (
    <div className="flex justify-between gap-3 py-2 border-b border-mcm-warm-gray-border last:border-0">
      <span className="text-sm text-mcm-warm-gray">{label}</span>
      <span className="text-sm font-medium text-mcm-charcoal text-right">{value ?? "—"}</span>
    </div>
  );
}

export function FebIdentificationStep({ flange, otItem, feb, saveFeb, goNext }: Props) {
  const today = new Date().toLocaleDateString("fr-FR");

  return (
    <div className="p-4 space-y-4">
      <p className="text-sm text-mcm-warm-gray text-center">FEB — Identification</p>

      <div className="bg-white rounded-xl border border-mcm-warm-gray-border p-3">
        <ReadOnlyRow label="N° FEB" value={feb.feb_number ?? "auto"} />
        <ReadOnlyRow label="Date" value={today} />
        <ReadOnlyRow label="Société demandeur" value="EMIS" />
        <ReadOnlyRow label="Equipement" value={otItem?.item ?? null} />
        <ReadOnlyRow label="Repère" value={flange.repere_emis ?? flange.repere_buta ?? null} />
        <ReadOnlyRow label="Unité" value={otItem?.unite ?? null} />
      </div>

      <div>
        <label className="block text-sm text-mcm-warm-gray mb-1">Société échafaudeur</label>
        <input
          type="text"
          value={feb.societe_echafaudeur ?? ""}
          onChange={(e) => saveFeb("societe_echafaudeur", e.target.value)}
          placeholder="Ex: SIEMO"
          className="w-full h-14 px-4 text-lg rounded-xl border border-mcm-warm-gray-border bg-white text-mcm-charcoal"
        />
      </div>

      <button
        onClick={goNext}
        className="w-full h-14 rounded-xl bg-mcm-mustard text-white text-lg font-semibold active:bg-mcm-mustard-hover transition-colors"
      >
        Continuer
      </button>
    </div>
  );
}
