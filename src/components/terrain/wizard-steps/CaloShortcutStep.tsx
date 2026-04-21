import type { OfflineFlange } from "@/lib/offline/db";
import type { SaveField } from "./types";

interface Props {
  flange: OfflineFlange;
  saveField: SaveField;
  onCaloYes: () => void;
  onCaloNo: () => void;
}

export function CaloShortcutStep({ flange, saveField, onCaloYes, onCaloNo }: Props) {
  return (
    <div className="p-4">
      <p className="text-sm text-mcm-warm-gray text-center mb-4">
        Cette bride est-elle calorifugée ?
      </p>
      <p className="text-xs text-mcm-warm-gray text-center mb-6">
        Si oui, les données client seront reprises telles quelles. Seul l&apos;échafaudage restera à
        renseigner.
      </p>
      <div className="space-y-3">
        <button
          onClick={() => {
            // Copy BUTA data → EMIS (can't verify under insulation)
            if (flange.dn_buta) saveField("dn_emis", String(flange.dn_buta));
            if (flange.pn_buta) saveField("pn_emis", String(flange.pn_buta));
            if (flange.nb_tiges_buta) saveField("nb_tiges_emis", String(flange.nb_tiges_buta));
            saveField("calorifuge", "OUI");
            onCaloYes();
          }}
          className="w-full h-20 rounded-xl bg-amber-500 text-white text-xl font-bold
                     active:bg-amber-600 transition-colors"
        >
          Calorifugée
        </button>
        <button
          onClick={onCaloNo}
          className="w-full h-20 rounded-xl bg-white border-2 border-mcm-warm-gray-border
                     text-mcm-charcoal text-xl font-bold active:bg-mcm-warm-gray-bg transition-colors"
        >
          Saisie normale
        </button>
      </div>
    </div>
  );
}
