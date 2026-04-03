"use client";

interface Props {
  pendingCount: number;
  syncing: boolean;
  isOnline: boolean;
  onSync: () => void;
  lastSyncResult?: {
    applied: unknown[];
    conflicts: unknown[];
    errors: { mutation: unknown; error: string }[];
  } | null;
}

export function SyncPanel({ pendingCount, syncing, isOnline, onSync, lastSyncResult }: Props) {
  return (
    <div className="flex flex-col gap-4 p-4">
      {/* Status card */}
      <div className="bg-white rounded-xl border border-mcm-warm-gray-border p-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-2xl font-bold text-mcm-charcoal">{pendingCount}</p>
            <p className="text-sm text-mcm-warm-gray">
              modification{pendingCount > 1 ? "s" : ""} en attente
            </p>
          </div>
          <div
            className={`w-4 h-4 rounded-full ${isOnline ? "bg-mcm-teal" : "bg-red-500 animate-pulse"}`}
          />
        </div>
      </div>

      {/* Sync button */}
      <button
        onClick={onSync}
        disabled={!isOnline || pendingCount === 0 || syncing}
        className="h-16 rounded-xl bg-mcm-teal text-white text-xl font-semibold
                   active:bg-mcm-teal-dark disabled:opacity-40 transition-colors
                   flex items-center justify-center gap-2"
      >
        {syncing ? (
          <>
            <svg className="w-6 h-6 animate-spin" fill="none" viewBox="0 0 24 24">
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
              />
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
              />
            </svg>
            Synchronisation...
          </>
        ) : !isOnline ? (
          "Pas de réseau"
        ) : (
          "Synchroniser maintenant"
        )}
      </button>

      {!isOnline && (
        <p className="text-sm text-mcm-warm-gray text-center">
          La synchronisation se lancera automatiquement au retour du réseau.
        </p>
      )}

      {/* Last sync result */}
      {lastSyncResult && (
        <div className="bg-white rounded-xl border border-mcm-warm-gray-border p-4 space-y-2">
          <p className="text-sm font-semibold text-mcm-charcoal">Dernier résultat</p>
          <p className="text-sm text-mcm-teal">
            {lastSyncResult.applied.length} appliquée{lastSyncResult.applied.length > 1 ? "s" : ""}
          </p>
          {lastSyncResult.conflicts.length > 0 && (
            <p className="text-sm text-mcm-mustard">
              {lastSyncResult.conflicts.length} conflit
              {lastSyncResult.conflicts.length > 1 ? "s" : ""} (terrain prioritaire)
            </p>
          )}
          {lastSyncResult.errors.length > 0 && (
            <p className="text-sm text-red-600">
              {lastSyncResult.errors.length} erreur{lastSyncResult.errors.length > 1 ? "s" : ""}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
