"use client";

interface Props {
  id: string;
  name: string;
  status: string;
  itemCount: number;
  downloadedAt: string | null;
  isOffline: boolean;
  onClick: () => void;
  onDownload?: () => void;
}

const STATUS_STYLES: Record<string, { bg: string; text: string; label: string }> = {
  preparing: { bg: "bg-slate-200", text: "text-slate-700", label: "Préparation" },
  active: { bg: "bg-mcm-mustard-light", text: "text-mcm-mustard-hover", label: "Active" },
  syncing: { bg: "bg-blue-100", text: "text-blue-700", label: "Sync..." },
  synced: { bg: "bg-mcm-teal-light", text: "text-mcm-teal-dark", label: "Synchronisée" },
};

export function SessionCard({
  name,
  status,
  itemCount,
  downloadedAt,
  isOffline,
  onClick,
  onDownload,
}: Props) {
  const style = STATUS_STYLES[status] ?? STATUS_STYLES.preparing;

  return (
    <div className="bg-white rounded-xl border border-mcm-warm-gray-border min-h-[72px]">
      <button
        onClick={onClick}
        className="w-full text-left p-4 active:bg-mcm-warm-gray-bg transition-colors rounded-xl"
      >
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <h3 className="text-lg font-semibold text-mcm-charcoal truncate">{name}</h3>
            <p className="text-sm text-mcm-warm-gray mt-0.5">
              {itemCount} équipement{itemCount > 1 ? "s" : ""}
              {downloadedAt && (
                <span> · DL {new Date(downloadedAt).toLocaleDateString("fr-FR")}</span>
              )}
            </p>
          </div>
          <span
            className={`px-2.5 py-1 rounded-full text-xs font-medium ${style.bg} ${style.text} shrink-0`}
          >
            {style.label}
          </span>
        </div>
      </button>

      {/* Bouton télécharger — visible quand pas encore disponible hors-ligne */}
      {!isOffline && onDownload && (
        <div className="px-4 pb-3">
          <button
            onClick={(e) => {
              e.stopPropagation();
              onDownload();
            }}
            className="w-full h-11 rounded-lg bg-amber-100 text-amber-700 text-sm font-semibold
                       flex items-center justify-center gap-2 active:bg-amber-200 transition-colors"
          >
            <svg
              className="w-4 h-4"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
              />
            </svg>
            Télécharger pour hors-ligne
          </button>
        </div>
      )}
    </div>
  );
}
