"use client";

import { useEffect, useRef, useState } from "react";
import { compressPhoto } from "@/lib/offline/photo-compression";
import { addPendingPhoto, type PhotoType } from "@/lib/offline/hooks";

interface Props {
  type: PhotoType;
  flangeId: string;
  flangeName: string | null;
  flangeRepere: string | null;
  sessionId: string;
  naturalItem: string;
  naturalCote?: string | null;
  onCaptured: () => void;
  onCancel: () => void;
}

/**
 * Capture mobile-first d'une photo terrain.
 * Flow : input file capture=environment → compress → preview → confirm/retake.
 * Mémoire : URL.revokeObjectURL au cleanup pour éviter les fuites en
 * usage prolongé hors-ligne (50+ photos par session).
 */
export function PhotoCapture({
  type,
  flangeId,
  flangeName,
  flangeRepere,
  sessionId,
  naturalItem,
  naturalCote = null,
  onCaptured,
  onCancel,
}: Props) {
  const [previewBlob, setPreviewBlob] = useState<Blob | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (!previewBlob) {
      setPreviewUrl(null);
      return;
    }
    const url = URL.createObjectURL(previewBlob);
    setPreviewUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [previewBlob]);

  const handleFile = async (file: File) => {
    setError(null);
    setBusy(true);
    try {
      const compressed = await compressPhoto(file);
      setPreviewBlob(compressed);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Compression échouée");
    } finally {
      setBusy(false);
    }
  };

  const handleConfirm = async () => {
    if (!previewBlob) return;
    setBusy(true);
    try {
      await addPendingPhoto(
        sessionId,
        flangeId,
        type,
        previewBlob,
        flangeName,
        flangeRepere,
        naturalItem,
        naturalCote,
      );
      onCaptured();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Enregistrement échoué");
      setBusy(false);
    }
  };

  const handleRetake = () => {
    setPreviewBlob(null);
    setError(null);
    inputRef.current?.click();
  };

  const labelByType: Record<PhotoType, string> = {
    bride: "Photo de la bride",
    echafaudage: "Photo de l'échafaudage",
    calorifuge: "Photo du calorifuge",
  };

  return (
    <div className="flex flex-col h-full bg-white">
      <div className="px-4 py-3 border-b border-mcm-warm-gray-border">
        <h2 className="text-lg font-semibold text-mcm-charcoal">{labelByType[type]}</h2>
      </div>

      <div className="flex-1 min-h-0 overflow-y-auto p-4">
        {previewUrl ? (
          <div className="space-y-3">
            <img
              src={previewUrl}
              alt="Aperçu de la photo"
              className="w-full rounded-xl border border-mcm-warm-gray-border"
            />
            {previewBlob && (
              <div className="text-xs text-mcm-warm-gray text-center">
                {Math.round(previewBlob.size / 1024)} KB
              </div>
            )}
          </div>
        ) : (
          <button
            onClick={() => inputRef.current?.click()}
            disabled={busy}
            className="w-full h-56 rounded-xl border-2 border-dashed border-mcm-warm-gray-border
                       bg-mcm-warm-gray-bg text-mcm-charcoal text-lg font-semibold
                       flex flex-col items-center justify-center gap-2
                       active:bg-mcm-warm-gray-border transition-colors disabled:opacity-50"
          >
            <span className="text-4xl">📷</span>
            <span>{busy ? "Compression…" : "Prendre une photo"}</span>
          </button>
        )}

        {error && (
          <div className="mt-3 p-3 rounded-lg bg-red-50 border border-red-200 text-sm text-red-700">
            {error}
          </div>
        )}
      </div>

      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) handleFile(file);
          e.target.value = "";
        }}
      />

      <div className="flex gap-3 p-4 border-t border-mcm-warm-gray-border">
        {previewBlob ? (
          <>
            <button
              onClick={handleRetake}
              disabled={busy}
              className="flex-1 h-14 rounded-xl bg-white border border-mcm-warm-gray-border
                         text-mcm-charcoal text-lg font-semibold
                         active:bg-mcm-warm-gray-bg transition-colors disabled:opacity-50"
            >
              Reprendre
            </button>
            <button
              onClick={handleConfirm}
              disabled={busy}
              className="flex-1 h-14 rounded-xl bg-mcm-mustard text-white text-lg font-semibold
                         active:bg-mcm-mustard-dark transition-colors disabled:opacity-50"
            >
              {busy ? "Enregistrement…" : "Confirmer"}
            </button>
          </>
        ) : (
          <button
            onClick={onCancel}
            disabled={busy}
            className="flex-1 h-14 rounded-xl bg-white border border-mcm-warm-gray-border
                       text-mcm-charcoal text-lg font-semibold
                       active:bg-mcm-warm-gray-bg transition-colors disabled:opacity-50"
          >
            Annuler
          </button>
        )}
      </div>
    </div>
  );
}
