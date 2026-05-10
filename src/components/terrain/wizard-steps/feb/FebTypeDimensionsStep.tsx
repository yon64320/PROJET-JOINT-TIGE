import type { EchafFebData } from "@/lib/validation/schemas";
import type { SaveField, SaveFebField, WizardValues } from "../types";

type EchafType = NonNullable<EchafFebData["types"]>[number];
type EchafOption = NonNullable<EchafFebData["options"]>[number];

const TYPES: { value: EchafType; label: string }[] = [
  { value: "interne", label: "Interne" },
  { value: "externe", label: "Externe" },
  { value: "plein_pied", label: "Plein pied" },
  { value: "suspendu", label: "Suspendu / porte à faux" },
  { value: "roulant", label: "Roulant" },
];

const OPTIONS: { value: EchafOption; label: string }[] = [
  { value: "bache_ignifugee", label: "Bâche ignifugée" },
  { value: "bache_filet", label: "Bâche / filet" },
  { value: "balisage", label: "Balisage" },
];

interface Props {
  values: WizardValues;
  setValues: (updater: (prev: WizardValues) => WizardValues) => void;
  feb: EchafFebData;
  saveField: SaveField;
  saveFeb: SaveFebField;
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

function NumberInput({
  value,
  onChange,
  onBlur,
  placeholder = "—",
  suffix,
}: {
  value: string;
  onChange: (v: string) => void;
  onBlur?: () => void;
  placeholder?: string;
  suffix?: string;
}) {
  return (
    <div className="relative">
      <input
        inputMode="decimal"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onBlur={onBlur}
        placeholder={placeholder}
        className="w-full h-14 px-4 pr-12 text-xl text-center rounded-xl border border-mcm-warm-gray-border bg-white text-mcm-charcoal"
      />
      {suffix && (
        <span className="absolute right-4 top-1/2 -translate-y-1/2 text-base text-mcm-warm-gray">
          {suffix}
        </span>
      )}
    </div>
  );
}

function Stepper({
  value,
  onChange,
  min = 1,
}: {
  value: number;
  onChange: (n: number) => void;
  min?: number;
}) {
  return (
    <div className="flex items-center gap-3">
      <button
        onClick={() => onChange(Math.max(min, value - 1))}
        className="w-12 h-12 rounded-xl border border-mcm-warm-gray-border bg-white text-2xl font-bold text-mcm-charcoal active:bg-mcm-warm-gray-bg"
      >
        −
      </button>
      <div className="flex-1 text-center text-2xl font-semibold text-mcm-charcoal">{value}</div>
      <button
        onClick={() => onChange(value + 1)}
        className="w-12 h-12 rounded-xl border border-mcm-warm-gray-border bg-white text-2xl font-bold text-mcm-charcoal active:bg-mcm-warm-gray-bg"
      >
        +
      </button>
    </div>
  );
}

export function FebTypeDimensionsStep({
  values,
  setValues,
  feb,
  saveField,
  saveFeb,
  goNext,
}: Props) {
  const toggleArrayValue = <T extends string>(arr: T[], v: T) =>
    arr.includes(v) ? arr.filter((x) => x !== v) : [...arr, v];

  const onTypeToggle = (t: EchafType) => {
    const next = toggleArrayValue(feb.types ?? [], t);
    saveFeb("types", next);
  };
  const onOptionToggle = (o: EchafOption) => {
    const next = toggleArrayValue(feb.options ?? [], o);
    saveFeb("options", next);
  };

  const nbPlanchers = feb.nb_planchers ?? 1;
  const setNbPlanchers = (n: number) => {
    saveFeb("nb_planchers", n);
    // Adjust hauteurs_planchers_supp length: P2..Pn = n-1 entries
    const supp = feb.hauteurs_planchers_supp ?? [];
    const targetLen = Math.max(0, n - 1);
    if (supp.length !== targetLen) {
      const next = supp.slice(0, targetLen);
      while (next.length < targetLen) next.push(0);
      saveFeb("hauteurs_planchers_supp", next);
    }
  };

  const setHauteurSupp = (idx: number, raw: string) => {
    const num = parseFloat(raw.replace(",", "."));
    const supp = [...(feb.hauteurs_planchers_supp ?? [])];
    while (supp.length <= idx) supp.push(0);
    supp[idx] = isNaN(num) ? 0 : num;
    saveFeb("hauteurs_planchers_supp", supp);
  };

  return (
    <div className="p-4 space-y-5">
      <p className="text-sm text-mcm-warm-gray text-center">FEB — Type & dimensions</p>

      <div>
        <label className="block text-sm text-mcm-warm-gray mb-2">Type d'échafaudage</label>
        <div className="flex flex-wrap gap-2">
          {TYPES.map((t) => (
            <Chip
              key={t.value}
              on={(feb.types ?? []).includes(t.value)}
              label={t.label}
              onClick={() => onTypeToggle(t.value)}
            />
          ))}
        </div>
      </div>

      <div>
        <label className="block text-sm text-mcm-warm-gray mb-2">Options</label>
        <div className="flex flex-wrap gap-2">
          {OPTIONS.map((o) => (
            <Chip
              key={o.value}
              on={(feb.options ?? []).includes(o.value)}
              label={o.label}
              onClick={() => onOptionToggle(o.value)}
            />
          ))}
        </div>
      </div>

      <div>
        <label className="block text-sm text-mcm-warm-gray mb-1">Type "Autres" (optionnel)</label>
        <input
          type="text"
          value={feb.type_autres ?? ""}
          onChange={(e) => saveFeb("type_autres", e.target.value)}
          placeholder="—"
          className="w-full h-12 px-3 text-base rounded-xl border border-mcm-warm-gray-border bg-white text-mcm-charcoal"
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-sm text-mcm-warm-gray mb-1">Longueur</label>
          <NumberInput
            value={values.echaf_longueur ?? ""}
            onChange={(v) => setValues((p) => ({ ...p, echaf_longueur: v }))}
            onBlur={() => saveField("echaf_longueur", values.echaf_longueur || null)}
            suffix="m"
          />
        </div>
        <div>
          <label className="block text-sm text-mcm-warm-gray mb-1">Largeur</label>
          <NumberInput
            value={values.echaf_largeur ?? ""}
            onChange={(v) => setValues((p) => ({ ...p, echaf_largeur: v }))}
            onBlur={() => saveField("echaf_largeur", values.echaf_largeur || null)}
            suffix="m"
          />
        </div>
      </div>

      <div>
        <label className="block text-sm text-mcm-warm-gray mb-1">Nb planchers de travail</label>
        <Stepper value={nbPlanchers} onChange={setNbPlanchers} min={1} />
      </div>

      {nbPlanchers === 1 ? (
        <div>
          <label className="block text-sm text-mcm-warm-gray mb-1">Hauteur de l'échafaudage</label>
          <NumberInput
            value={values.echaf_hauteur ?? ""}
            onChange={(v) => setValues((p) => ({ ...p, echaf_hauteur: v }))}
            onBlur={() => saveField("echaf_hauteur", values.echaf_hauteur || null)}
            suffix="m"
          />
        </div>
      ) : (
        <div className="space-y-3">
          <div>
            <label className="block text-sm text-mcm-warm-gray mb-1">Hauteur P1</label>
            <NumberInput
              value={values.echaf_hauteur ?? ""}
              onChange={(v) => setValues((p) => ({ ...p, echaf_hauteur: v }))}
              onBlur={() => saveField("echaf_hauteur", values.echaf_hauteur || null)}
              suffix="m"
            />
          </div>
          {Array.from({ length: nbPlanchers - 1 }).map((_, i) => (
            <div key={i}>
              <label className="block text-sm text-mcm-warm-gray mb-1">Hauteur P{i + 2}</label>
              <NumberInput
                value={String(feb.hauteurs_planchers_supp?.[i] ?? "")}
                onChange={(v) => setHauteurSupp(i, v)}
                suffix="m"
              />
            </div>
          ))}
        </div>
      )}

      <div>
        <label className="block text-sm text-mcm-warm-gray mb-1">Élévation départ</label>
        <NumberInput
          value={feb.elevation_depart ?? ""}
          onChange={(v) => saveFeb("elevation_depart", v)}
          suffix="m"
        />
      </div>

      <div>
        <label className="block text-sm text-mcm-warm-gray mb-1">Nb accès</label>
        <Stepper value={feb.nb_acces ?? 1} onChange={(n) => saveFeb("nb_acces", n)} min={1} />
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
