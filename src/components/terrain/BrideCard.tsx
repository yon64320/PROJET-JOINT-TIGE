"use client";

interface Props {
  repere: string | null;
  nom: string | null;
  dnEmis: string | number | null;
  dnButa: string | number | null;
  pnEmis: string | number | null;
  pnButa: string | number | null;
  fieldStatus: "pending" | "in_progress" | "completed";
  onClick: () => void;
  onReset?: () => void;
}

const STATUS_CONFIG = {
  pending: { bg: "bg-slate-200", text: "text-slate-600", label: "À faire" },
  in_progress: { bg: "bg-mcm-mustard-light", text: "text-mcm-mustard-hover", label: "En cours" },
  completed: { bg: "bg-mcm-teal-light", text: "text-mcm-teal-dark", label: "Fait" },
};

export function BrideCard({
  repere,
  nom,
  dnEmis,
  dnButa,
  pnEmis,
  pnButa,
  fieldStatus,
  onClick,
  onReset,
}: Props) {
  const status = STATUS_CONFIG[fieldStatus];
  const dn = dnEmis ?? dnButa;
  const pn = pnEmis ?? pnButa;

  // HTML interdit <button> imbriqué dans <button> → hydration error.
  // Solution : carte cliquable = <button> qui n'englobe PAS le bouton reset.
  // Le reset est positionné en absolute par-dessus la carte.
  return (
    <div className="relative">
      <button
        onClick={onClick}
        className="w-full text-left p-4 bg-white rounded-xl border border-mcm-warm-gray-border
                   active:bg-mcm-warm-gray-bg transition-colors min-h-[64px]"
      >
        <div className="flex items-center justify-between gap-3">
          <div className="flex-1 min-w-0">
            <h3 className="text-base font-semibold text-mcm-charcoal truncate">
              {repere ?? nom ?? "Sans repère"}
            </h3>
            {(dn != null || pn != null) && (
              <p className="text-sm text-mcm-warm-gray mt-0.5">
                {dn != null && `DN ${dn}`}
                {dn != null && pn != null && " · "}
                {pn != null && `PN ${pn}`}
              </p>
            )}
          </div>
          {fieldStatus !== "pending" && (
            <div className="flex items-center gap-1 shrink-0">
              {fieldStatus === "completed" && (
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 20 20"
                  fill="currentColor"
                  className="w-5 h-5 text-mcm-warm-gray"
                  aria-label="Modifier"
                >
                  <path d="M2.695 14.763l-1.262 3.154a.5.5 0 00.65.65l3.155-1.262a4 4 0 001.343-.885L17.5 5.5a2.121 2.121 0 00-3-3L3.58 13.42a4 4 0 00-.885 1.343z" />
                </svg>
              )}
              {/* placeholder pour aligner le status badge quand reset est présent */}
              {onReset && <span className="w-7" aria-hidden="true" />}
            </div>
          )}
          <span
            className={`px-2.5 py-1 rounded-full text-xs font-medium ${status.bg} ${status.text} shrink-0`}
          >
            {status.label}
          </span>
        </div>
      </button>
      {fieldStatus !== "pending" && onReset && (
        <button
          onClick={onReset}
          className="absolute top-1/2 -translate-y-1/2 right-[72px] p-1 text-mcm-warm-gray active:text-red-500"
          aria-label="Effacer les données"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 20 20"
            fill="currentColor"
            className="w-5 h-5"
          >
            <path d="M6.28 5.22a.75.75 0 00-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 101.06 1.06L10 11.06l3.72 3.72a.75.75 0 101.06-1.06L11.06 10l3.72-3.72a.75.75 0 00-1.06-1.06L10 8.94 6.28 5.22z" />
          </svg>
        </button>
      )}
    </div>
  );
}
