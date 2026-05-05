import { useState } from "react";
import type { SaveField, WizardValues } from "./types";

interface Props {
  value: string;
  predictedDesignation: string | null | undefined;
  setValues: (updater: (prev: WizardValues) => WizardValues) => void;
  saveField: SaveField;
  goNext: () => void;
}

const DIAMETRES = ["M14", "M16", "M20", "M24", "M27", "M30", "M33", "M37", "M39"] as const;
const LONGUEURS = Array.from({ length: 26 }, (_, i) => 70 + i * 10);

type Phase = "diametre" | "longueur" | "longueur_autre" | "autre_freetext";

export function DimensionTigeStep({ value, predictedDesignation, saveField, goNext }: Props) {
  const [phase, setPhase] = useState<Phase>("diametre");
  const [selectedDiametre, setSelectedDiametre] = useState<string | null>(null);
  const [freeText, setFreeText] = useState("");
  const [autreLongueur, setAutreLongueur] = useState("");

  const acceptPredicted = () => {
    if (!predictedDesignation) return;
    saveField("dimension_tige_emis", predictedDesignation);
    goNext();
  };

  const pickDiametre = (d: string) => {
    setSelectedDiametre(d);
    setPhase("longueur");
  };

  const pickLongueur = (l: number) => {
    saveField("dimension_tige_emis", `${selectedDiametre} x ${l}`);
    goNext();
  };

  const confirmAutreLongueur = () => {
    const cleaned = autreLongueur.trim();
    if (!cleaned) return;
    saveField("dimension_tige_emis", `${selectedDiametre} x ${cleaned}`);
    goNext();
  };

  const confirmFreeText = () => {
    const cleaned = freeText.trim();
    if (!cleaned) return;
    saveField("dimension_tige_emis", cleaned);
    goNext();
  };

  if (phase === "diametre") {
    return (
      <div className="p-4 space-y-3">
        {predictedDesignation && !value && (
          <button
            onClick={acceptPredicted}
            className="w-full h-14 rounded-xl bg-mcm-teal-light text-mcm-teal text-lg font-semibold
                       border border-mcm-teal/30 active:bg-mcm-teal/20 transition-colors"
          >
            Prédit : {predictedDesignation}
          </button>
        )}
        <p className="text-sm text-mcm-warm-gray">Diamètre</p>
        <div className="grid grid-cols-3 gap-3">
          {DIAMETRES.map((d) => (
            <button
              key={d}
              onClick={() => pickDiametre(d)}
              className="h-20 rounded-xl bg-white border-2 border-mcm-warm-gray-border
                         text-2xl font-bold text-mcm-charcoal
                         active:bg-mcm-mustard active:text-white active:border-mcm-mustard
                         transition-colors"
            >
              {d}
            </button>
          ))}
        </div>
        <button
          onClick={() => setPhase("autre_freetext")}
          className="w-full h-14 rounded-xl bg-white border-2 border-dashed
                     border-mcm-warm-gray-border text-base font-semibold text-mcm-warm-gray
                     active:bg-mcm-warm-gray-bg transition-colors"
        >
          Autre (texte libre)
        </button>
      </div>
    );
  }

  if (phase === "longueur") {
    return (
      <div className="p-4 space-y-3">
        <button
          onClick={() => setPhase("diametre")}
          className="text-sm text-mcm-teal font-semibold flex items-center gap-1"
        >
          ← {selectedDiametre} ×
        </button>
        <p className="text-sm text-mcm-warm-gray">Longueur</p>
        <div className="grid grid-cols-3 gap-3">
          {LONGUEURS.map((l) => (
            <button
              key={l}
              onClick={() => pickLongueur(l)}
              className="h-16 rounded-xl bg-white border-2 border-mcm-warm-gray-border
                         text-xl font-bold text-mcm-charcoal
                         active:bg-mcm-mustard active:text-white active:border-mcm-mustard
                         transition-colors"
            >
              {l}
            </button>
          ))}
        </div>
        <button
          onClick={() => setPhase("longueur_autre")}
          className="w-full h-14 rounded-xl bg-white border-2 border-dashed
                     border-mcm-warm-gray-border text-base font-semibold text-mcm-warm-gray
                     active:bg-mcm-warm-gray-bg transition-colors"
        >
          Autre longueur
        </button>
      </div>
    );
  }

  if (phase === "longueur_autre") {
    return (
      <div className="p-4 space-y-3">
        <button
          onClick={() => setPhase("longueur")}
          className="text-sm text-mcm-teal font-semibold flex items-center gap-1"
        >
          ← Liste des longueurs
        </button>
        <p className="text-sm text-mcm-warm-gray">{selectedDiametre} × ?</p>
        <input
          type="text"
          inputMode="numeric"
          pattern="[0-9]*"
          value={autreLongueur}
          onChange={(e) => setAutreLongueur(e.target.value.replace(/[^0-9]/g, ""))}
          placeholder="ex: 65"
          autoFocus
          className="w-full h-14 px-4 text-2xl rounded-xl border border-mcm-warm-gray-border
                     bg-white text-mcm-charcoal"
        />
        <button
          onClick={confirmAutreLongueur}
          disabled={!autreLongueur.trim()}
          className="w-full h-14 rounded-xl bg-mcm-mustard text-white text-lg font-semibold
                     active:bg-mcm-mustard-hover transition-colors
                     disabled:opacity-50 disabled:active:bg-mcm-mustard"
        >
          Valider
        </button>
      </div>
    );
  }

  return (
    <div className="p-4 space-y-3">
      <button
        onClick={() => setPhase("diametre")}
        className="text-sm text-mcm-teal font-semibold flex items-center gap-1"
      >
        ← Retour aux diamètres
      </button>
      <p className="text-sm text-mcm-warm-gray">Dimension tige (texte libre)</p>
      <input
        type="text"
        value={freeText}
        onChange={(e) => setFreeText(e.target.value)}
        placeholder="ex: Goujon spécial 25mm"
        autoFocus
        className="w-full h-14 px-4 text-2xl rounded-xl border border-mcm-warm-gray-border
                   bg-white text-mcm-charcoal"
      />
      <button
        onClick={confirmFreeText}
        disabled={!freeText.trim()}
        className="w-full h-14 rounded-xl bg-mcm-mustard text-white text-lg font-semibold
                   active:bg-mcm-mustard-hover transition-colors
                   disabled:opacity-50 disabled:active:bg-mcm-mustard"
      >
        Continuer
      </button>
    </div>
  );
}
