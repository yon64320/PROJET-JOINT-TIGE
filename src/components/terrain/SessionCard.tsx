"use client";

interface Props {
  id: string;
  name: string;
  status: string;
  itemCount: number;
  downloadedAt: string | null;
  onClick: () => void;
}

const STATUS_STYLES: Record<string, { bg: string; text: string; label: string }> = {
  preparing: { bg: "bg-slate-200", text: "text-slate-700", label: "Préparation" },
  active: { bg: "bg-mcm-mustard-light", text: "text-mcm-mustard-hover", label: "Active" },
  syncing: { bg: "bg-blue-100", text: "text-blue-700", label: "Sync..." },
  synced: { bg: "bg-mcm-teal-light", text: "text-mcm-teal-dark", label: "Synchronisée" },
};

export function SessionCard({ name, status, itemCount, downloadedAt, onClick }: Props) {
  const style = STATUS_STYLES[status] ?? STATUS_STYLES.preparing;

  return (
    <button
      onClick={onClick}
      className="w-full text-left p-4 bg-white rounded-xl border border-mcm-warm-gray-border
                 active:bg-mcm-warm-gray-bg transition-colors min-h-[72px]"
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
  );
}
