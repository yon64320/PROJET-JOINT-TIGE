"use client";

interface Props {
  repere: string | null;
  nom: string | null;
  dnButa: string | null;
  pnButa: string | null;
  fieldStatus: "pending" | "in_progress" | "completed";
  onClick: () => void;
}

const STATUS_CONFIG = {
  pending: { bg: "bg-slate-200", text: "text-slate-600", label: "À faire" },
  in_progress: { bg: "bg-mcm-mustard-light", text: "text-mcm-mustard-hover", label: "En cours" },
  completed: { bg: "bg-mcm-teal-light", text: "text-mcm-teal-dark", label: "Fait" },
};

export function BrideCard({ repere, nom, dnButa, pnButa, fieldStatus, onClick }: Props) {
  const status = STATUS_CONFIG[fieldStatus];

  return (
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
          {(dnButa || pnButa) && (
            <p className="text-sm text-mcm-warm-gray mt-0.5">
              {dnButa && `DN ${dnButa}`}
              {dnButa && pnButa && " · "}
              {pnButa && `PN ${pnButa}`}
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
  );
}
