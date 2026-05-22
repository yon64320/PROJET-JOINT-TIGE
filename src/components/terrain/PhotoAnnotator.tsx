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
  onContinue: (annotated: Blob) => void;
  onRetake: () => void;
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
 * Éditeur d'annotation photo : un seul canvas, Pointer Events.
 * Le canvas a une taille intrinsèque = image native, contraint visuellement
 * par max-w-full max-h-full object-contain. Pas de calcul JS de dimensions.
 * Le canvas affiché contient déjà l'image + annotations à pleine résolution,
 * donc toBlob() au "Continuer" rend une PNG pixel-perfect.
 */
export function PhotoAnnotator({ imageBlob, onContinue, onRetake }: Props) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
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

  // Charger l'image une fois (avec correction d'orientation EXIF)
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const bitmap = await createImageBitmap(imageBlob, {
          imageOrientation: "from-image",
        });
        if (cancelled) {
          bitmap.close();
          return;
        }
        bitmapRef.current = bitmap;
        setImgSize({ w: bitmap.width, h: bitmap.height });
      } catch {
        // ignore — l'utilisateur peut reprendre la photo
      }
    })();
    return () => {
      cancelled = true;
      bitmapRef.current?.close();
      bitmapRef.current = null;
    };
  }, [imageBlob]);

  // Initialiser le canvas et dessiner image + annotations à chaque changement
  useEffect(() => {
    const c = canvasRef.current;
    const b = bitmapRef.current;
    if (!c || !b || !imgSize) return;
    c.width = imgSize.w;
    c.height = imgSize.h;
    redraw(c, b, annotations, draftRef.current);
  }, [imgSize, annotations]);

  const toImageCoords = useCallback((e: React.PointerEvent<HTMLCanvasElement>): Pt => {
    const c = e.currentTarget;
    const rect = c.getBoundingClientRect();
    if (rect.width === 0 || rect.height === 0) return { x: 0, y: 0 };
    return {
      x: ((e.clientX - rect.left) / rect.width) * c.width,
      y: ((e.clientY - rect.top) / rect.height) * c.height,
    };
  }, []);

  const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (textPrompt || !bitmapRef.current) return;
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
    redraw(c, bitmapRef.current, annotations, draftRef.current);
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (pointerIdRef.current !== e.pointerId || !bitmapRef.current) return;
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
    redraw(e.currentTarget, bitmapRef.current, annotations, d);
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (pointerIdRef.current !== e.pointerId) return;
    e.currentTarget.releasePointerCapture(e.pointerId);
    pointerIdRef.current = null;
    const d = draftRef.current;
    draftRef.current = null;
    if (!d) return;
    if (d.tool === "circle" && d.rx < 2 && d.ry < 2) {
      // Tap accidentel — redraw sans le draft pour effacer
      if (bitmapRef.current) redraw(e.currentTarget, bitmapRef.current, annotations, null);
      return;
    }
    if (d.tool === "arrow" && Math.hypot(d.to.x - d.from.x, d.to.y - d.from.y) < 4) {
      if (bitmapRef.current) redraw(e.currentTarget, bitmapRef.current, annotations, null);
      return;
    }
    setAnnotations((prev) => [...prev, d]);
  };

  const handlePointerCancel = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (pointerIdRef.current !== e.pointerId) return;
    pointerIdRef.current = null;
    draftRef.current = null;
    if (canvasRef.current && bitmapRef.current) {
      redraw(canvasRef.current, bitmapRef.current, annotations, null);
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

  const handleContinue = async () => {
    const canvas = canvasRef.current;
    if (!canvas || !bitmapRef.current) {
      onRetake();
      return;
    }
    setBusy(true);
    try {
      // Le canvas affiché porte déjà l'image + annotations à pleine résolution
      const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/png"));
      if (!blob) {
        onRetake();
        return;
      }
      onContinue(blob);
    } catch {
      onRetake();
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-mcm-charcoal text-white">
      {/* Header */}
      <div className="flex items-center justify-between px-4 h-14 border-b border-white/10 shrink-0">
        <span className="text-base font-semibold">Annoter la photo</span>
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
          <canvas
            ref={canvasRef}
            width={imgSize.w}
            height={imgSize.h}
            className="max-w-full max-h-full object-contain"
            style={{ touchAction: "none" }}
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            onPointerCancel={handlePointerCancel}
          />
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
          {annotations.length > 0 && (
            <button onClick={handleClear} className="text-xs text-white/70 underline shrink-0">
              Effacer
            </button>
          )}
        </div>
      </div>

      {/* Footer actions — Reprendre / Continuer */}
      <div
        className="flex gap-2 p-3 border-t border-white/10 bg-mcm-charcoal shrink-0"
        style={{ paddingBottom: "max(0.75rem, env(safe-area-inset-bottom))" }}
      >
        <button
          onClick={onRetake}
          disabled={busy}
          className="flex-1 h-14 rounded-xl bg-white/10 text-white text-base font-semibold active:bg-white/20 disabled:opacity-50"
        >
          Reprendre la photo
        </button>
        <button
          onClick={handleContinue}
          disabled={busy || !imgSize}
          className="flex-1 h-14 rounded-xl bg-mcm-mustard text-white text-base font-semibold active:bg-mcm-mustard-dark disabled:opacity-50"
        >
          {busy ? "…" : "Continuer"}
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

function redraw(
  canvas: HTMLCanvasElement,
  bitmap: ImageBitmap,
  annotations: Annotation[],
  draft: Annotation | null,
) {
  const ctx = canvas.getContext("2d");
  if (!ctx) return;
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.drawImage(bitmap, 0, 0);
  for (const a of annotations) drawAnnotation(ctx, a);
  if (draft) drawAnnotation(ctx, draft);
}

// Les traits sont stockés à leur valeur perceptive (slider 1–10) mais rendus
// 5× plus épais pour rester visibles sur des photos haute résolution (4000+ px).
const STROKE_SCALE = 5;

function drawAnnotation(ctx: CanvasRenderingContext2D, a: Annotation) {
  ctx.save();
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  ctx.strokeStyle = a.color;
  const strokeW = a.tool !== "text" ? a.width * STROKE_SCALE : 0;
  if (a.tool !== "text") ctx.lineWidth = strokeW;

  if (a.tool === "pen") {
    if (a.points.length < 2) {
      ctx.beginPath();
      ctx.arc(a.points[0].x, a.points[0].y, strokeW / 2, 0, Math.PI * 2);
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
    const { from, to } = a;
    ctx.beginPath();
    ctx.moveTo(from.x, from.y);
    ctx.lineTo(to.x, to.y);
    ctx.stroke();
    const angle = Math.atan2(to.y - from.y, to.x - from.x);
    const head = 10 + strokeW * 2.5;
    const a1 = angle + Math.PI - Math.PI / 6;
    const a2 = angle + Math.PI + Math.PI / 6;
    ctx.beginPath();
    ctx.moveTo(to.x, to.y);
    ctx.lineTo(to.x + head * Math.cos(a1), to.y + head * Math.sin(a1));
    ctx.moveTo(to.x, to.y);
    ctx.lineTo(to.x + head * Math.cos(a2), to.y + head * Math.sin(a2));
    ctx.stroke();
  } else if (a.tool === "text") {
    const fontSize = a.fontSize * STROKE_SCALE;
    ctx.fillStyle = a.color;
    ctx.font = `bold ${fontSize}px sans-serif`;
    ctx.textBaseline = "top";
    const outline = a.color === "#000000" ? "#ffffff" : "#000000";
    ctx.lineWidth = Math.max(2, fontSize / 12);
    ctx.strokeStyle = outline;
    ctx.strokeText(a.value, a.pos.x, a.pos.y);
    ctx.fillText(a.value, a.pos.x, a.pos.y);
  }
  ctx.restore();
}
