import type { EchafFebData } from "@/lib/validation/schemas";

const TRAVAUX: { value: string; label: string }[] = [
  { value: "acces_echangeur", label: "Accès échangeur" },
  { value: "acces_equipement", label: "Accès équipement (manœuvre/contrôle)" },
  { value: "calorifuge_peinture", label: "Calorifuge / peinture / nettoyage" },
  { value: "depose_repose", label: "Dépose / repose / jointage" },
  { value: "cnd", label: "CND" },
  { value: "metallurgie", label: "Métallurgie" },
  { value: "levage", label: "Levage" },
];

const CONTRAINTES: { value: string; label: string }[] = [
  { value: "ancrage", label: "Ancrage / amarrage" },
  { value: "vent", label: "Effet vent / venturi" },
];

const SOLS = ["béton", "terre", "gravier", "dalle métallique", "autre"];

interface Props {
  feb: EchafFebData;
  saveFeb: (febField: string, value: unknown) => void;
  goNext: () => void;
}

function Chip({ on, label, onClick }: { on: boolean; label: string; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={`px-4 h-12 rounded-xl border text-base font-medium transition-colors ${
        on
          ? "bg-mcm-mustard text-white border-mcm-mustard"
          : "bg-white text-mcm-charcoal border-mcm-warm-gray-border"
      }`}
    >
      {label}
    </button>
  );
}

export function FebTravauxContraintesStep({ feb, saveFeb, goNext }: Props) {
  const toggle = (key: "travaux" | "contraintes", v: string) => {
    const current = (feb[key] ?? []) as string[];
    const next = current.includes(v) ? current.filter((x) => x !== v) : [...current, v];
    saveFeb(key, next);
  };

  const today = new Date().toISOString().slice(0, 10);
  const dateMontage = feb.date_montage ?? today;

  return (
    <div className="p-4 space-y-5">
      <p className="text-sm text-mcm-warm-gray text-center">FEB — Travaux, contraintes, dates</p>

      <div>
        <label className="block text-sm text-mcm-warm-gray mb-2">Nature des travaux</label>
        <div className="flex flex-wrap gap-2">
          {TRAVAUX.map((t) => (
            <Chip
              key={t.value}
              on={(feb.travaux ?? []).includes(t.value)}
              label={t.label}
              onClick={() => toggle("travaux", t.value)}
            />
          ))}
        </div>
      </div>

      <div>
        <label className="block text-sm text-mcm-warm-gray mb-1">
          Travaux "Autres" (optionnel)
        </label>
        <input
          type="text"
          value={feb.travaux_autres ?? ""}
          onChange={(e) => saveFeb("travaux_autres", e.target.value)}
          placeholder="—"
          className="w-full h-12 px-3 text-base rounded-xl border border-mcm-warm-gray-border bg-white text-mcm-charcoal"
        />
      </div>

      <div>
        <label className="block text-sm text-mcm-warm-gray mb-2">Contraintes</label>
        <div className="flex flex-wrap gap-2">
          {CONTRAINTES.map((c) => (
            <Chip
              key={c.value}
              on={(feb.contraintes ?? []).includes(c.value)}
              label={c.label}
              onClick={() => toggle("contraintes", c.value)}
            />
          ))}
        </div>
      </div>

      <div>
        <label className="block text-sm text-mcm-warm-gray mb-1">Type de sol</label>
        <select
          value={feb.sol_type ?? ""}
          onChange={(e) => saveFeb("sol_type", e.target.value || undefined)}
          className="w-full h-12 px-3 text-base rounded-xl border border-mcm-warm-gray-border bg-white text-mcm-charcoal"
        >
          <option value="">— Choisir —</option>
          {SOLS.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label className="block text-sm text-mcm-warm-gray mb-1">Risques particuliers</label>
        <input
          type="text"
          value={feb.risques ?? ""}
          onChange={(e) => saveFeb("risques", e.target.value)}
          placeholder="HT, légionelles, produits chauds…"
          className="w-full h-12 px-3 text-base rounded-xl border border-mcm-warm-gray-border bg-white text-mcm-charcoal"
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-sm text-mcm-warm-gray mb-1">Date montage</label>
          <input
            type="date"
            value={dateMontage}
            onChange={(e) => saveFeb("date_montage", e.target.value)}
            className="w-full h-12 px-3 text-base rounded-xl border border-mcm-warm-gray-border bg-white text-mcm-charcoal"
          />
        </div>
        <div>
          <label className="block text-sm text-mcm-warm-gray mb-1">Date dépose</label>
          <input
            type="date"
            value={feb.date_depose ?? ""}
            onChange={(e) => saveFeb("date_depose", e.target.value || undefined)}
            className="w-full h-12 px-3 text-base rounded-xl border border-mcm-warm-gray-border bg-white text-mcm-charcoal"
          />
        </div>
      </div>

      <div>
        <label className="block text-sm text-mcm-warm-gray mb-1">CMU</label>
        <div className="flex gap-2">
          <Chip
            on={feb.cmu_classe3 ?? true}
            label="Classe 3 (250 kg/m²)"
            onClick={() => {
              saveFeb("cmu_classe3", true);
              saveFeb("cmu_autre", undefined);
            }}
          />
          <Chip
            on={!(feb.cmu_classe3 ?? true)}
            label="Autre"
            onClick={() => saveFeb("cmu_classe3", false)}
          />
        </div>
        {!(feb.cmu_classe3 ?? true) && (
          <input
            type="text"
            value={feb.cmu_autre ?? ""}
            onChange={(e) => saveFeb("cmu_autre", e.target.value)}
            placeholder="Ex: 400 kg/m²"
            className="mt-2 w-full h-12 px-3 text-base rounded-xl border border-mcm-warm-gray-border bg-white text-mcm-charcoal"
          />
        )}
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
