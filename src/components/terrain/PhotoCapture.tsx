"use client";

import { useEffect, useRef, useState } from "react";
import { compressPhoto } from "@/lib/offline/photo-compression";
import { addPendingPhoto, type PhotoType } from "@/lib/offline/hooks";
import { PhotoAnnotator } from "./PhotoAnnotator";

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
 * Flow : input camera → PhotoAnnotator (Reprendre / Continuer) → compress + addPendingPhoto.
 * Plus d'écran preview séparé : l'éditeur fait office d'aperçu et d'édition.
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
  const [rawFile, setRawFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);

  // Ouvre l'input camera dès le montage (pas besoin d'un écran intermédiaire)
  useEffect(() => {
    inputRef.current?.click();
  }, []);

  const handleFile = (file: File) => {
    setError(null);
    setRawFile(file);
  };

  const handleContinue = async (annotated: Blob) => {
    setBusy(true);
    setError(null);
    try {
      const compressed = await compressPhoto(annotated);
      await addPendingPhoto(
        sessionId,
        flangeId,
        type,
        compressed,
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
    setRawFile(null);
    setError(null);
    inputRef.current?.click();
  };

  const labelByType: Record<PhotoType, string> = {
    bride: "Photo de la bride",
    echafaudage: "Photo de l'échafaudage",
    calorifuge: "Photo du calorifuge",
  };

  // Pendant que l'utilisateur est dans l'éditeur, on l'affiche en plein écran
  if (rawFile && !busy) {
    return (
      <PhotoAnnotator imageBlob={rawFile} onContinue={handleContinue} onRetake={handleRetake} />
    );
  }

  // Écran d'attente initial (avant capture) ou pendant compression
  return (
    <div className="flex flex-col h-full bg-white">
      <div className="px-4 py-3 border-b border-mcm-warm-gray-border">
        <h2 className="text-lg font-semibold text-mcm-charcoal">{labelByType[type]}</h2>
      </div>

      <div className="flex-1 min-h-0 flex flex-col items-center justify-center p-6 gap-4">
        {busy ? (
          <>
            <div className="text-4xl animate-pulse">📷</div>
            <div className="text-base text-mcm-warm-gray">Enregistrement…</div>
          </>
        ) : (
          <button
            onClick={() => inputRef.current?.click()}
            className="w-full max-w-xs h-56 rounded-xl border-2 border-dashed border-mcm-warm-gray-border
                       bg-mcm-warm-gray-bg text-mcm-charcoal text-lg font-semibold
                       flex flex-col items-center justify-center gap-2
                       active:bg-mcm-warm-gray-border transition-colors"
          >
            <span className="text-4xl">📷</span>
            <span>Prendre une photo</span>
          </button>
        )}

        {error && (
          <div className="w-full p-3 rounded-lg bg-red-50 border border-red-200 text-sm text-red-700 text-center">
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
        <button
          onClick={onCancel}
          disabled={busy}
          className="flex-1 h-14 rounded-xl bg-white border border-mcm-warm-gray-border
                     text-mcm-charcoal text-lg font-semibold
                     active:bg-mcm-warm-gray-bg transition-colors disabled:opacity-50"
        >
          Annuler
        </button>
      </div>
    </div>
  );
}
