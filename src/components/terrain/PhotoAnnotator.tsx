"use client";

import { useEffect, useRef, useState, useCallback } from "react";

type Pt = { x: number; y: number };

type Annotation =
  | { tool: "pen"; color: string; width: number; points: Pt[] }
  | { tool: "circle"; color: string; width: number; center: Pt; rx: number; ry: number }
  | { tool: "arrow"; color: string; width: number; from: Pt; to: Pt }
  | { tool: "text"; color: string; fontSize: number; pos: Pt; value: string };

type Tool = Annotation["tool"];

interface Props {
  imageBlob: Blob;
  onDone: (annotated: Blob) => void;
  onSkip: () => void;
}

const COLORS = [
  "#ef4444", // rouge
  "#f97316", // orange
  "#eab308", // jaune
  "#22c55e", // vert
  "#3b82f6", // bleu
  "#a855f7", // violet
  "#000000", // noir
  "#ffffff", // blanc
];

const TOOL_ICONS: Record<Tool, string> = {
  pen: "✏️",
  circle: "⭕",
  arrow: "↗",
  text: "T",
};

const TOOL_LABELS: Record<Tool, string> = {
  pen: "Stylo",
  circle: "Cercle",
  arrow: "Flèche",
  text: "Texte",
};

/**
 * Éditeur d'annotation photo : 2 canvas (image + overlay), Pointer Events.
 * Coordonnées stockées en espace IMAGE (pas écran) → pixel-perfect à la composition.
 */
export function PhotoAnnotator({ imageBlob, onDone, onSkip }: Props) {
  const imgCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const overlayCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const bitmapRef = useRef<ImageBitmap | null>(null);

  const [imgSize, setImgSize] = useState<{ w: number; h: number } | null>(null);
  const [tool, setTool] = useState<Tool>("pen");
  const [color, setColor] = useState<string>(COLORS[0]);
  const [width, setWidth] = useState<number>(3);
  const [annotations, setAnnotations] = useState<Annotation[]>([]);
  const [textPrompt, setTextPrompt] = useState<{ pos: Pt; value: string } | null>(null);
  const [busy, setBusy] = useState(false);

  const draftRef = useRef<Annotation | null>(null);
  const pointerIdRef = useRef<number | null>(null);

  // Charger l'image et dessiner sur le canvas image (une fois)
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const bitmap = await createImageBitmap(imageBlob);
        if (cancelled) {
          bitmap.close();
          return;
        }
        bitmapRef.current = bitmap;
        setImgSize({ w: bitmap.width, h: bitmap.height });
        const c = imgCanvasRef.current;
        if (c) {
          c.width = bitmap.width;
          c.height = bitmap.height;
          const ctx = c.getContext("2d");
          ctx?.drawImage(bitmap, 0, 0);
        }
      } catch {
        // ignore — l'utilisateur pourra Passer
      }
    })();
    return () => {
      cancelled = true;
      bitmapRef.current?.close();
      bitmapRef.current = null;
    };
  }, [imageBlob]);

  // Initialiser le canvas overlay aux mêmes dimensions
  useEffect(() => {
    const c = overlayCanvasRef.current;
    if (!c || !imgSize) return;
    c.width = imgSize.w;
    c.height = imgSize.h;
    redrawOverlay(c, annotations, draftRef.current);
  }, [imgSize, annotations]);

  const toImageCoords = useCallback((e: React.PointerEvent<HTMLCanvasElement>): Pt => {
    const c = e.currentTarget;
    const rect = c.getBoundingClientRect();
    return {
      x: ((e.clientX - rect.left) / rect.width) * c.width,
      y: ((e.clientY - rect.top) / rect.height) * c.height,
    };
  }, []);

  const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (textPrompt) return;
    const c = e.currentTarget;
    c.setPointerCapture(e.pointerId);
    pointerIdRef.current = e.pointerId;
    const pt = toImageCoords(e);

    if (tool === "text") {
      setTextPrompt({ pos: pt, value: "" });
      return;
    }
    if (tool === "pen") {
      draftRef.current = { tool: "pen", color, width, points: [pt] };
    } else if (tool === "circle") {
      draftRef.current = { tool: "circle", color, width, center: pt, rx: 0, ry: 0 };
    } else if (tool === "arrow") {
      draftRef.current = { tool: "arrow", color, width, from: pt, to: pt };
    }
    redrawOverlay(c, annotations, draftRef.current);
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (pointerIdRef.current !== e.pointerId) return;
    const d = draftRef.current;
    if (!d) return;
    const pt = toImageCoords(e);

    if (d.tool === "pen") {
      d.points.push(pt);
    } else if (d.tool === "circle") {
      d.rx = Math.abs(pt.x - d.center.x);
      d.ry = Math.abs(pt.y - d.center.y);
    } else if (d.tool === "arrow") {
      d.to = pt;
    }
    redrawOverlay(e.currentTarget, annotations, d);
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (pointerIdRef.current !== e.pointerId) return;
    e.currentTarget.releasePointerCapture(e.pointerId);
    pointerIdRef.current = null;
    const d = draftRef.current;
    draftRef.current = null;
    if (!d) return;
    // Filtrer les drags trop courts (tap accidentel sur outil dessin)
    if (d.tool === "circle" && d.rx < 2 && d.ry < 2) return;
    if (d.tool === "arrow" && Math.hypot(d.to.x - d.from.x, d.to.y - d.from.y) < 4) return;
    setAnnotations((prev) => [...prev, d]);
  };

  const handlePointerCancel = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (pointerIdRef.current !== e.pointerId) return;
    pointerIdRef.current = null;
    draftRef.current = null;
    if (overlayCanvasRef.current) {
      redrawOverlay(overlayCanvasRef.current, annotations, null);
    }
  };

  const handleUndo = () => setAnnotations((prev) => prev.slice(0, -1));
  const handleClear = () => setAnnotations([]);

  const handleTextConfirm = () => {
    if (!textPrompt) return;
    const value = textPrompt.value.trim();
    if (value.length > 0 && imgSize) {
      const fontSize = Math.max(16, Math.round(imgSize.w / 40));
      setAnnotations((prev) => [
        ...prev,
        { tool: "text", color, fontSize, pos: textPrompt.pos, value },
      ]);
    }
    setTextPrompt(null);
  };

  const handleTextCancel = () => setTextPrompt(null);

  const handleValidate = async () => {
    if (!imgSize || !bitmapRef.current) {
      onSkip();
      return;
    }
    setBusy(true);
    try {
      const blob = await composeFinal(bitmapRef.current, imgSize.w, imgSize.h, annotations);
      onDone(blob);
    } catch {
      onSkip();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-mcm-charcoal text-white">
      {/* Header */}
      <div className="flex items-center justify-between px-4 h-14 border-b border-white/10 shrink-0">
        <button
          onClick={onSkip}
          className="h-10 px-3 rounded-lg text-base font-semibold active:bg-white/10"
          aria-label="Fermer l'éditeur"
        >
          ✕
        </button>
        <h2 className="text-base font-semibold">Annoter la photo</h2>
        <button
          onClick={handleUndo}
          disabled={annotations.length === 0}
          className="h-10 px-3 rounded-lg text-base font-semibold active:bg-white/10 disabled:opacity-30"
          aria-label="Annuler"
        >
          ↶
        </button>
      </div>

      {/* Zone canvas */}
      <div
        className="flex-1 min-h-0 flex items-center justify-center p-2 bg-black"
        style={{ touchAction: "none" }}
      >
        {imgSize ? (
          <div
            className="relative"
            style={{
              aspectRatio: `${imgSize.w} / ${imgSize.h}`,
              maxWidth: "100%",
              maxHeight: "100%",
              width: "auto",
              height: "auto",
            }}
          >
            <canvas ref={imgCanvasRef} className="absolute inset-0 w-full h-full" />
            <canvas
              ref={overlayCanvasRef}
              className="absolute inset-0 w-full h-full"
              style={{ touchAction: "none" }}
              onPointerDown={handlePointerDown}
              onPointerMove={handlePointerMove}
              onPointerUp={handlePointerUp}
              onPointerCancel={handlePointerCancel}
            />
          </div>
        ) : (
          <div className="text-sm text-white/60">Chargement…</div>
        )}
      </div>

      {/* Toolbar outils + couleurs */}
      <div className="px-3 py-2 border-t border-white/10 bg-mcm-charcoal shrink-0 space-y-2">
        <div className="flex items-center gap-2 overflow-x-auto">
          {(Object.keys(TOOL_ICONS) as Tool[]).map((t) => (
            <button
              key={t}
              onClick={() => setTool(t)}
              className={`h-12 min-w-12 px-3 rounded-lg text-xl font-bold shrink-0 ${
                tool === t
                  ? "bg-mcm-mustard text-white"
                  : "bg-white/10 text-white active:bg-white/20"
              }`}
              aria-label={TOOL_LABELS[t]}
              title={TOOL_LABELS[t]}
            >
              {TOOL_ICONS[t]}
            </button>
          ))}
          <div className="w-px h-8 bg-white/20 mx-1 shrink-0" />
          {COLORS.map((c) => (
            <button
              key={c}
              onClick={() => setColor(c)}
              className={`h-10 w-10 rounded-full shrink-0 border-2 ${
                color === c ? "border-white" : "border-white/30"
              }`}
              style={{ backgroundColor: c }}
              aria-label={`Couleur ${c}`}
            />
          ))}
        </div>
        <div className="flex items-center gap-3">
          <span className="text-xs text-white/70 w-16 shrink-0">Épaisseur</span>
          <input
            type="range"
            min={1}
            max={10}
            value={width}
            onChange={(e) => setWidth(Number(e.target.value))}
            className="flex-1 accent-mcm-mustard"
          />
          <span className="text-xs text-white/70 w-8 text-right">{width}</span>
        </div>
      </div>

      {/* Footer actions */}
      <div className="flex gap-2 p-3 border-t border-white/10 bg-mcm-charcoal shrink-0">
        <button
          onClick={handleClear}
          disabled={annotations.length === 0 || busy}
          className="flex-1 h-14 rounded-xl bg-white/10 text-white text-base font-semibold active:bg-white/20 disabled:opacity-30"
        >
          Effacer
        </button>
        <button
          onClick={onSkip}
          disabled={busy}
          className="flex-1 h-14 rounded-xl bg-white/10 text-white text-base font-semibold active:bg-white/20 disabled:opacity-50"
        >
          Passer
        </button>
        <button
          onClick={handleValidate}
          disabled={busy || !imgSize}
          className="flex-1 h-14 rounded-xl bg-mcm-mustard text-white text-base font-semibold active:bg-mcm-mustard-dark disabled:opacity-50"
        >
          {busy ? "…" : "Valider"}
        </button>
      </div>

      {/* Modal saisie texte */}
      {textPrompt && (
        <div className="absolute inset-0 z-10 bg-black/70 flex items-center justify-center p-6">
          <div className="bg-white text-mcm-charcoal rounded-xl p-4 w-full max-w-sm space-y-3">
            <label className="block text-sm font-semibold">Texte à insérer</label>
            <input
              autoFocus
              type="text"
              value={textPrompt.value}
              onChange={(e) => setTextPrompt({ ...textPrompt, value: e.target.value })}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleTextConfirm();
                if (e.key === "Escape") handleTextCancel();
              }}
              className="w-full h-12 px-3 rounded-lg border border-mcm-warm-gray-border text-base"
              placeholder="ex. DÉFAUT"
              maxLength={80}
            />
            <div className="flex gap-2">
              <button
                onClick={handleTextCancel}
                className="flex-1 h-12 rounded-lg bg-white border border-mcm-warm-gray-border font-semibold active:bg-mcm-warm-gray-bg"
              >
                Annuler
              </button>
              <button
                onClick={handleTextConfirm}
                disabled={textPrompt.value.trim().length === 0}
                className="flex-1 h-12 rounded-lg bg-mcm-mustard text-white font-semibold active:bg-mcm-mustard-dark disabled:opacity-50"
              >
                OK
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function redrawOverlay(
  canvas: HTMLCanvasElement,
  annotations: Annotation[],
  draft: Annotation | null,
) {
  const ctx = canvas.getContext("2d");
  if (!ctx) return;
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  for (const a of annotations) drawAnnotation(ctx, a);
  if (draft) drawAnnotation(ctx, draft);
}

function drawAnnotation(ctx: CanvasRenderingContext2D, a: Annotation) {
  ctx.save();
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  ctx.strokeStyle = a.tool === "text" ? a.color : a.color;
  if (a.tool !== "text") ctx.lineWidth = a.width;

  if (a.tool === "pen") {
    if (a.points.length < 2) {
      ctx.beginPath();
      ctx.arc(a.points[0].x, a.points[0].y, a.width / 2, 0, Math.PI * 2);
      ctx.fillStyle = a.color;
      ctx.fill();
    } else {
      ctx.beginPath();
      ctx.moveTo(a.points[0].x, a.points[0].y);
      for (let i = 1; i < a.points.length; i++) {
        ctx.lineTo(a.points[i].x, a.points[i].y);
      }
      ctx.stroke();
    }
  } else if (a.tool === "circle") {
    ctx.beginPath();
    ctx.ellipse(a.center.x, a.center.y, a.rx, a.ry, 0, 0, Math.PI * 2);
    ctx.stroke();
  } else if (a.tool === "arrow") {
    const { from, to, width } = a;
    ctx.beginPath();
    ctx.moveTo(from.x, from.y);
    ctx.lineTo(to.x, to.y);
    ctx.stroke();
    // Tête de flèche
    const angle = Math.atan2(to.y - from.y, to.x - from.x);
    const head = 10 + width * 2.5;
    const a1 = angle + Math.PI - Math.PI / 6;
    const a2 = angle + Math.PI + Math.PI / 6;
    ctx.beginPath();
    ctx.moveTo(to.x, to.y);
    ctx.lineTo(to.x + head * Math.cos(a1), to.y + head * Math.sin(a1));
    ctx.moveTo(to.x, to.y);
    ctx.lineTo(to.x + head * Math.cos(a2), to.y + head * Math.sin(a2));
    ctx.stroke();
  } else if (a.tool === "text") {
    ctx.fillStyle = a.color;
    ctx.font = `bold ${a.fontSize}px sans-serif`;
    ctx.textBaseline = "top";
    // Contour noir/blanc pour lisibilité sur tout fond
    const outline = a.color === "#000000" ? "#ffffff" : "#000000";
    ctx.lineWidth = Math.max(2, a.fontSize / 12);
    ctx.strokeStyle = outline;
    ctx.strokeText(a.value, a.pos.x, a.pos.y);
    ctx.fillText(a.value, a.pos.x, a.pos.y);
  }
  ctx.restore();
}

async function composeFinal(
  bitmap: ImageBitmap,
  w: number,
  h: number,
  annotations: Annotation[],
): Promise<Blob> {
  // Try OffscreenCanvas first (faster, supports convertToBlob)
  if (typeof OffscreenCanvas !== "undefined") {
    try {
      const off = new OffscreenCanvas(w, h);
      const ctx = off.getContext("2d") as unknown as CanvasRenderingContext2D | null;
      if (!ctx) throw new Error("no ctx");
      ctx.drawImage(bitmap, 0, 0);
      for (const a of annotations) drawAnnotation(ctx, a);
      return await off.convertToBlob({ type: "image/png" });
    } catch {
      // fall through to DOM canvas
    }
  }
  // Fallback DOM canvas (Safari iOS < 16.4)
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas context indisponible");
  ctx.drawImage(bitmap, 0, 0);
  for (const a of annotations) drawAnnotation(ctx, a);
  return await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("toBlob failed"))), "image/png");
  });
}
