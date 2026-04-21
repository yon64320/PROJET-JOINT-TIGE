"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

interface Props {
  projectId: string;
  projectName: string;
}

export default function DeleteProjectButton({ projectId, projectName }: Props) {
  const [showConfirm, setShowConfirm] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  const handleDelete = () => {
    setError(null);
    startTransition(async () => {
      const res = await fetch(`/api/projects?id=${projectId}`, { method: "DELETE" });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        setError(body.error ?? "Erreur lors de la suppression");
        return;
      }
      setShowConfirm(false);
      router.refresh();
    });
  };

  return (
    <>
      <button
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          setShowConfirm(true);
        }}
        className="p-1.5 text-mcm-warm-gray-light hover:text-mcm-terracotta rounded-lg hover:bg-mcm-terracotta-light transition-colors"
        title="Supprimer ce projet"
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
            d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
          />
        </svg>
      </button>

      {showConfirm && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            if (!isPending) setShowConfirm(false);
          }}
        >
          <div
            className="bg-white rounded-xl shadow-xl max-w-md w-full mx-4 p-6 animate-fade-in"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-lg font-semibold text-mcm-charcoal mb-2">Supprimer ce projet ?</h3>
            <p className="text-sm text-mcm-warm-gray mb-1">
              Le projet <strong>{projectName}</strong> et toutes ses données seront supprimés :
            </p>
            <ul className="text-sm text-mcm-warm-gray mb-4 list-disc list-inside">
              <li>OTs (LUT) et brides (J&T)</li>
              <li>Sessions terrain et archives</li>
              <li>Templates d&apos;import</li>
            </ul>
            <p className="text-sm font-medium text-mcm-terracotta mb-4">
              Cette action est irréversible.
            </p>

            {error && (
              <div className="p-3 bg-mcm-terracotta-light border border-mcm-terracotta/20 rounded-lg mb-4">
                <p className="text-mcm-terracotta text-sm">{error}</p>
              </div>
            )}

            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setShowConfirm(false)}
                disabled={isPending}
                className="px-4 py-2 text-sm font-medium text-mcm-warm-gray border border-mcm-warm-gray-border rounded-lg hover:bg-mcm-warm-gray-bg transition-colors disabled:opacity-50"
              >
                Annuler
              </button>
              <button
                onClick={handleDelete}
                disabled={isPending}
                className="px-4 py-2 text-sm font-medium text-white bg-mcm-terracotta rounded-lg hover:bg-mcm-terracotta/90 transition-colors disabled:opacity-50"
              >
                {isPending ? "Suppression..." : "Supprimer définitivement"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
