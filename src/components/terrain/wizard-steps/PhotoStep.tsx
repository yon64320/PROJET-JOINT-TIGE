"use client";

import { useEffect, useState } from "react";
import { offlineDb, type OfflineFlange } from "@/lib/offline/db";
import { usePendingPhotos, deletePendingPhoto, type PhotoType } from "@/lib/offline/hooks";
import { PhotoCapture } from "../PhotoCapture";

interface Props {
  type: PhotoType;
  sessionId: string;
  flange: OfflineFlange;
  goNext: () => void;
}

const TITLES: Record<PhotoType, string> = {
  bride: "Photos de la bride",
  echafaudage: "Photos de l'échafaudage",
  calorifuge: "Photos du calorifuge",
};

export function PhotoStep({ type, sessionId, flange, goNext }: Props) {
  const [capturing, setCapturing] = useState(false);
  const { photos, loading, refresh } = usePendingPhotos(flange.id, type);
  const [naturalItem, setNaturalItem] = useState<string>("");
  const [thumbUrls, setThumbUrls] = useState<Record<string, string>>({});

  useEffect(() => {
    offlineDb.otItems.get(flange.ot_item_id).then((ot) => {
      if (ot) setNaturalItem(ot.item);
    });
  }, [flange.ot_item_id]);

  // Génère les URLs blob pour les thumbnails (cleanup au démontage)
  useEffect(() => {
    const next: Record<string, string> = {};
    for (const p of photos) {
      next[p.id] = URL.createObjectURL(p.blob);
    }
    setThumbUrls(next);
    return () => {
      for (const url of Object.values(next)) URL.revokeObjectURL(url);
    };
  }, [photos]);

  if (capturing) {
    return (
      <PhotoCapture
        type={type}
        flangeId={flange.id}
        flangeName={flange.repere_emis ?? flange.repere_buta}
        flangeRepere={flange.repere_emis ?? flange.repere_buta}
        sessionId={sessionId}
        naturalItem={naturalItem}
        naturalCote={flange.face_bride_emis ?? flange.face_bride_buta}
        onCaptured={() => {
          setCapturing(false);
          refresh();
        }}
        onCancel={() => setCapturing(false)}
      />
    );
  }

  return (
    <div className="flex flex-col h-full p-4">
      <h2 className="text-lg font-semibold text-mcm-charcoal mb-3">{TITLES[type]}</h2>

      <div className="flex-1 min-h-0 overflow-y-auto">
        {loading ? (
          <div className="text-sm text-mcm-warm-gray">Chargement…</div>
        ) : photos.length === 0 ? (
          <div className="text-sm text-mcm-warm-gray text-center py-8">
            Aucune photo — appuyez sur le bouton ci-dessous pour en ajouter.
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3">
            {photos.map((p, idx) => (
              <div
                key={p.id}
                className="relative aspect-square rounded-xl overflow-hidden border border-mcm-warm-gray-border"
              >
                {thumbUrls[p.id] && (
                  <img
                    src={thumbUrls[p.id]}
                    alt={`${type} ${idx + 1}`}
                    className="w-full h-full object-cover"
                  />
                )}
                <div className="absolute top-1 left-1 bg-black/60 text-white text-xs px-2 py-0.5 rounded">
                  #{idx + 1}
                </div>
                {!p.uploaded && (
                  <div className="absolute top-1 right-1 bg-amber-500 text-white text-xs px-2 py-0.5 rounded">
                    À sync
                  </div>
                )}
                <button
                  onClick={() => {
                    if (confirm("Supprimer cette photo ?")) {
                      deletePendingPhoto(p.id).then(refresh);
                    }
                  }}
                  className="absolute bottom-1 right-1 bg-white/90 text-red-600 w-9 h-9 rounded-full
                             flex items-center justify-center text-lg font-bold
                             active:bg-white transition-colors"
                  aria-label="Supprimer"
                >
                  ×
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="flex gap-3 mt-4">
        <button
          onClick={() => setCapturing(true)}
          className="flex-1 h-14 rounded-xl bg-mcm-mustard text-white text-lg font-semibold
                     active:bg-mcm-mustard-dark transition-colors"
        >
          + Ajouter une photo
        </button>
        <button
          onClick={goNext}
          className="flex-1 h-14 rounded-xl bg-white border border-mcm-warm-gray-border
                     text-mcm-charcoal text-lg font-semibold
                     active:bg-mcm-warm-gray-bg transition-colors"
        >
          {photos.length > 0 ? "Continuer" : "Passer"}
        </button>
      </div>
    </div>
  );
}
