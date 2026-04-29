"use client";

interface Props {
  repere: string | null;
  nom: string | null;
  dnEmis: string | number | null;
  dnButa: string | number | null;
  pnEmis: string | number | null;
  pnButa: string | number | null;
  fieldStatus: "pending" | "in_progress" | "completed";
  /** True si la bride a été créée localement et n'est pas encore synchronisée. */
  isLocal?: boolean;
  onClick: () => void;
  onReset?: () => void;
  onDelete?: () => void;
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
  isLocal = false,
  onClick,
  onReset,
  onDelete,
}: Props) {
  const status = STATUS_CONFIG[fieldStatus];
  const dn = dnEmis ?? dnButa;
  const pn = pnEmis ?? pnButa;

  // Réserver de la place sur la droite : reset (X) + delete (🗑️) en absolute
  // par-dessus la carte cliquable. Largeur additionnelle calculée selon
  // les boutons présents.
  const overlayWidth = (onReset ? 28 : 0) + (onDelete ? 36 : 0);

  return (
    <div className="relative">
      <button
        onClick={onClick}
        style={overlayWidth > 0 ? { paddingRight: `${overlayWidth + 80}px` } : undefined}
        className="w-full text-left p-4 bg-white rounded-xl border border-mcm-warm-gray-border
                   active:bg-mcm-warm-gray-bg transition-colors min-h-[64px]"
      >
        <div className="flex items-center justify-between gap-3">
          <div className="flex-1 min-w-0">
            <h3 className="text-base font-semibold text-mcm-charcoal truncate">
              {repere ?? nom ?? "Sans repère"}
              {isLocal && (
                <span className="ml-2 px-1.5 py-0.5 text-[10px] font-medium rounded bg-blue-100 text-blue-700 align-middle">
                  Nouveau
                </span>
              )}
            </h3>
            {(dn != null || pn != null) && (
              <p className="text-sm text-mcm-warm-gray mt-0.5">
                {dn != null && `DN ${dn}`}
                {dn != null && pn != null && " · "}
                {pn != null && `PN ${pn}`}
              </p>
            )}
          </div>
          <span
            className={`px-2.5 py-1 rounded-full text-xs font-medium ${status.bg} ${status.text} shrink-0`}
          >
            {status.label}
          </span>
        </div>
      </button>

      {/* Bouton reset (X) — efface les données saisies, garde la bride. */}
      {onReset && (
        <button
          onClick={onReset}
          className="absolute top-1/2 -translate-y-1/2 right-[88px] p-1 text-mcm-warm-gray active:text-red-500"
          aria-label="Effacer les données saisies"
          title="Effacer les données saisies"
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

      {/* Bouton delete (corbeille) — supprime la bride entière du J&T au sync. */}
      {onDelete && (
        <button
          onClick={onDelete}
          className="absolute top-1/2 -translate-y-1/2 right-[64px] p-1.5 text-mcm-warm-gray active:text-red-600"
          aria-label="Supprimer la bride"
          title="Supprimer la bride"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 20 20"
            fill="currentColor"
            className="w-5 h-5"
          >
            <path
              fillRule="evenodd"
              d="M8.75 1A2.75 2.75 0 006 3.75v.443a47.928 47.928 0 00-2.461.43.75.75 0 00.184 1.49l.211-.027 1.243 9.945A2.75 2.75 0 007.907 18.5h4.186a2.75 2.75 0 002.73-2.469l1.243-9.945.211.027a.75.75 0 00.184-1.49 48 48 0 00-2.461-.43V3.75A2.75 2.75 0 0011.25 1h-2.5zM10 4c.84 0 1.673.025 2.5.075V3.75c0-.69-.56-1.25-1.25-1.25h-2.5c-.69 0-1.25.56-1.25 1.25v.325C8.327 4.025 9.16 4 10 4z"
              clipRule="evenodd"
            />
          </svg>
        </button>
      )}
    </div>
  );
}
