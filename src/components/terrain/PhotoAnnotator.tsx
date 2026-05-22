"use client";

import { useEffect, useRef, useState, useCallback } from "react";

type Pt = { x: number; y: number };

type PenAnnotation = { tool: "pen"; color: string; width: number; points: Pt[] };
type CircleAnnotation = {
  tool: "circle";
  color: string;
  width: number;
  center: Pt;
  rx: number;
  ry: number;
};
type ArrowAnnotation = { tool: "arrow"; color: string; width: number; from: Pt; to: Pt };
type TextAnnotation = {
  tool: "text";
  color: string;
  fontSize: number;
  pos: Pt;
  value: string;
};

type Annotation = PenAnnotation | CircleAnnotation | ArrowAnnotation | TextAnnotation;
type Tool = Annotation["tool"];
type HandleId = "e" | "s" | "from" | "to" | "scale";

type PointerMode =
  | { kind: "none" }
  | { kind: "create"; draft: Annotation }
  | { kind: "move"; idx: number; startPt: Pt; initial: Annotation }
  | { kind: "resize"; idx: number; handle: HandleId; initial: Annotation };

interface Props {
  imageBlob: Blob;
  onContinue: (annotated: Blob) => void;
  onRetake: () => void;
}

const COLORS = [
  "#ef4444",
  "#f97316",
  "#eab308",
  "#22c55e",
  "#3b82f6",
  "#a855f7",
  "#000000",
  "#ffffff",
];

const TOOL_ICONS: Record<Tool, string> = { pen: "✏️", circle: "⭕", arrow: "↗", text: "T" };
const TOOL_LABELS: Record<Tool, string> = {
  pen: "Stylo",
  circle: "Cercle",
  arrow: "Flèche",
  text: "Texte",
};

// Les traits sont stockés à leur valeur perceptive (slider 1–10) mais rendus
// 15× plus épais pour rester visibles sur des photos haute résolution.
const STROKE_SCALE = 15;
// Le texte utilise un facteur réduit (×6) — sinon il occupe la moitié de la photo.
const TEXT_SCALE = STROKE_SCALE / 2.5;

/**
 * Éditeur d'annotation photo. Single canvas, Pointer Events.
 *
 * Modes :
 * - Création : tap zone vide → trace une nouvelle annotation
 * - Sélection : tap sur annotation existante → highlight + handles
 * - Déplacement : drag depuis l'annotation sélectionnée → translation
 * - Redimensionnement : drag depuis un handle → ajuste rx/ry, from/to, ou fontSize
 *
 * Annotations stockées en coords image (pas écran), donc invariantes au resize viewport.
 */
export function PhotoAnnotator({ imageBlob, onContinue, onRetake }: Props) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const bitmapRef = useRef<ImageBitmap | null>(null);

  const [imgSize, setImgSize] = useState<{ w: number; h: number } | null>(null);
  const [tool, setTool] = useState<Tool>("pen");
  const [color, setColor] = useState<string>(COLORS[0]);
  const [width, setWidth] = useState<number>(3);
  const [annotations, setAnnotations] = useState<Annotation[]>([]);
  const [selectedIdx, setSelectedIdx] = useState<number | null>(null);
  const [textPrompt, setTextPrompt] = useState<{
    pos: Pt;
    value: string;
    editingIdx: number | null;
  } | null>(null);
  const [busy, setBusy] = useState(false);

  const pointerModeRef = useRef<PointerMode>({ kind: "none" });
  const pointerIdRef = useRef<number | null>(null);

  // Charger l'image (correction EXIF)
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const bitmap = await createImageBitmap(imageBlob, { imageOrientation: "from-image" });
        if (cancelled) {
          bitmap.close();
          return;
        }
        bitmapRef.current = bitmap;
        setImgSize({ w: bitmap.width, h: bitmap.height });
      } catch {
        /* ignore */
      }
    })();
    return () => {
      cancelled = true;
      bitmapRef.current?.close();
      bitmapRef.current = null;
    };
  }, [imageBlob]);

  // Redraw complet à chaque changement d'annotations ou de sélection
  useEffect(() => {
    const c = canvasRef.current;
    const b = bitmapRef.current;
    if (!c || !b || !imgSize) return;
    c.width = imgSize.w;
    c.height = imgSize.h;
    redraw(c, b, annotations, null, selectedIdx, imgSize.w);
  }, [imgSize, annotations, selectedIdx]);

  const toImageCoords = useCallback((e: React.PointerEvent<HTMLCanvasElement>): Pt => {
    const c = e.currentTarget;
    const rect = c.getBoundingClientRect();
    if (rect.width === 0 || rect.height === 0) return { x: 0, y: 0 };
    return {
      x: ((e.clientX - rect.left) / rect.width) * c.width,
      y: ((e.clientY - rect.top) / rect.height) * c.height,
    };
  }, []);

  const syncToolbarFromAnnotation = (a: Annotation) => {
    setColor(a.color);
    if (a.tool !== "text") setWidth(a.width);
  };

  const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (textPrompt || !bitmapRef.current || !imgSize) return;
    const c = e.currentTarget;
    const pt = toImageCoords(e);
    const handleR = imgSize.w / 50;
    const handleTol = handleR * 1.6;
    const hitTol = imgSize.w / 80;

    // 1. Si une annotation est sélectionnée, tester ses handles d'abord
    if (selectedIdx !== null) {
      const handle = hitTestHandles(pt, annotations[selectedIdx], handleTol);
      if (handle) {
        pointerModeRef.current = {
          kind: "resize",
          idx: selectedIdx,
          handle,
          initial: annotations[selectedIdx],
        };
        pointerIdRef.current = e.pointerId;
        c.setPointerCapture(e.pointerId);
        return;
      }
    }

    // 2. Test des annotations existantes (top → bottom dans le Z-order)
    for (let i = annotations.length - 1; i >= 0; i--) {
      if (hitTestAnnotation(pt, annotations[i], hitTol)) {
        setSelectedIdx(i);
        syncToolbarFromAnnotation(annotations[i]);
        pointerModeRef.current = {
          kind: "move",
          idx: i,
          startPt: pt,
          initial: annotations[i],
        };
        pointerIdRef.current = e.pointerId;
        c.setPointerCapture(e.pointerId);
        return;
      }
    }

    // 3. Zone vide + une sélection : juste désélectionner, pas de création
    if (selectedIdx !== null) {
      setSelectedIdx(null);
      return;
    }

    // 4. Création d'une nouvelle annotation
    if (tool === "text") {
      setTextPrompt({ pos: pt, value: "", editingIdx: null });
      return;
    }

    let draft: Annotation;
    if (tool === "pen") {
      draft = { tool: "pen", color, width, points: [pt] };
    } else if (tool === "circle") {
      draft = { tool: "circle", color, width, center: pt, rx: 0, ry: 0 };
    } else {
      draft = { tool: "arrow", color, width, from: pt, to: pt };
    }
    pointerModeRef.current = { kind: "create", draft };
    pointerIdRef.current = e.pointerId;
    c.setPointerCapture(e.pointerId);
    redraw(c, bitmapRef.current, annotations, draft, selectedIdx, imgSize.w);
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (pointerIdRef.current !== e.pointerId || !bitmapRef.current || !imgSize) return;
    const mode = pointerModeRef.current;
    if (mode.kind === "none") return;
    const pt = toImageCoords(e);

    if (mode.kind === "create") {
      const d = mode.draft;
      if (d.tool === "pen") {
        d.points.push(pt);
      } else if (d.tool === "circle") {
        d.rx = Math.abs(pt.x - d.center.x);
        d.ry = Math.abs(pt.y - d.center.y);
      } else if (d.tool === "arrow") {
        d.to = pt;
      }
      redraw(e.currentTarget, bitmapRef.current, annotations, d, selectedIdx, imgSize.w);
      return;
    }

    if (mode.kind === "move") {
      const dx = pt.x - mode.startPt.x;
      const dy = pt.y - mode.startPt.y;
      const moved = translateAnnotation(mode.initial, dx, dy);
      setAnnotations((prev) => prev.map((a, i) => (i === mode.idx ? moved : a)));
      return;
    }

    if (mode.kind === "resize") {
      const resized = resizeAnnotation(mode.initial, mode.handle, pt);
      setAnnotations((prev) => prev.map((a, i) => (i === mode.idx ? resized : a)));
    }
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (pointerIdRef.current !== e.pointerId) return;
    e.currentTarget.releasePointerCapture(e.pointerId);
    pointerIdRef.current = null;
    const mode = pointerModeRef.current;
    pointerModeRef.current = { kind: "none" };

    if (mode.kind === "create") {
      const d = mode.draft;
      if (d.tool === "circle" && d.rx < 2 && d.ry < 2) return;
      if (d.tool === "arrow" && Math.hypot(d.to.x - d.from.x, d.to.y - d.from.y) < 4) return;
      setAnnotations((prev) => [...prev, d]);
    }
  };

  const handlePointerCancel = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (pointerIdRef.current !== e.pointerId) return;
    pointerIdRef.current = null;
    pointerModeRef.current = { kind: "none" };
  };

  const handleUndo = () =>
    setAnnotations((prev) => {
      const next = prev.slice(0, -1);
      if (selectedIdx !== null && selectedIdx >= next.length) setSelectedIdx(null);
      return next;
    });

  const handleClear = () => {
    setAnnotations([]);
    setSelectedIdx(null);
  };

  const handleDelete = () => {
    if (selectedIdx === null) return;
    setAnnotations((prev) => prev.filter((_, i) => i !== selectedIdx));
    setSelectedIdx(null);
  };

  const handleColorPick = (c: string) => {
    setColor(c);
    if (selectedIdx !== null) {
      setAnnotations((prev) => prev.map((a, i) => (i === selectedIdx ? { ...a, color: c } : a)));
    }
  };

  const handleWidthChange = (w: number) => {
    setWidth(w);
    if (selectedIdx !== null) {
      setAnnotations((prev) =>
        prev.map((a, i) => {
          if (i !== selectedIdx) return a;
          if (a.tool === "text") return a;
          return { ...a, width: w };
        }),
      );
    }
  };

  const handleToolPick = (t: Tool) => {
    setTool(t);
    setSelectedIdx(null);
  };

  const handleTextConfirm = () => {
    if (!textPrompt || !imgSize) return;
    const value = textPrompt.value.trim();
    if (value.length === 0) {
      setTextPrompt(null);
      return;
    }
    if (textPrompt.editingIdx !== null) {
      setAnnotations((prev) =>
        prev.map((a, i) =>
          i === textPrompt.editingIdx && a.tool === "text" ? { ...a, value } : a,
        ),
      );
    } else {
      const fontSize = Math.max(16, Math.round(imgSize.w / 40));
      setAnnotations((prev) => [
        ...prev,
        { tool: "text", color, fontSize, pos: textPrompt.pos, value },
      ]);
    }
    setTextPrompt(null);
  };

  const handleTextCancel = () => setTextPrompt(null);

  // Double-tap sur texte sélectionné = rouvre modal pour éditer
  const handleEditSelectedText = () => {
    if (selectedIdx === null) return;
    const a = annotations[selectedIdx];
    if (a.tool !== "text") return;
    setTextPrompt({ pos: a.pos, value: a.value, editingIdx: selectedIdx });
  };

  const handleContinue = async () => {
    const canvas = canvasRef.current;
    if (!canvas || !bitmapRef.current || !imgSize) {
      onRetake();
      return;
    }
    setBusy(true);
    try {
      // Re-render sans la sélection (sinon les handles seraient gravés dans le PNG)
      redraw(canvas, bitmapRef.current, annotations, null, null, imgSize.w);
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

  const selected = selectedIdx !== null ? annotations[selectedIdx] : null;

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-mcm-charcoal text-white">
      {/* Header */}
      <div className="flex items-center justify-between px-4 h-14 border-b border-white/10 shrink-0">
        <span className="text-base font-semibold">
          {selected ? "Modifier l'annotation" : "Annoter la photo"}
        </span>
        <div className="flex items-center gap-2">
          {selected && selected.tool === "text" && (
            <button
              onClick={handleEditSelectedText}
              className="h-10 px-3 rounded-lg text-sm font-semibold bg-white/10 active:bg-white/20"
              aria-label="Modifier le texte"
            >
              Éditer
            </button>
          )}
          {selected && (
            <button
              onClick={handleDelete}
              className="h-10 px-3 rounded-lg text-base font-semibold bg-red-500/80 active:bg-red-500"
              aria-label="Supprimer"
            >
              🗑️
            </button>
          )}
          <button
            onClick={handleUndo}
            disabled={annotations.length === 0}
            className="h-10 px-3 rounded-lg text-base font-semibold active:bg-white/10 disabled:opacity-30"
            aria-label="Annuler"
          >
            ↶
          </button>
        </div>
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

      {/* Toolbar */}
      <div className="px-3 py-2 border-t border-white/10 bg-mcm-charcoal shrink-0 space-y-2">
        <div className="flex items-center gap-2 overflow-x-auto">
          {(Object.keys(TOOL_ICONS) as Tool[]).map((t) => (
            <button
              key={t}
              onClick={() => handleToolPick(t)}
              className={`h-12 min-w-12 px-3 rounded-lg text-xl font-bold shrink-0 ${
                tool === t && !selected
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
              onClick={() => handleColorPick(c)}
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
            onChange={(e) => handleWidthChange(Number(e.target.value))}
            className="flex-1 accent-mcm-mustard"
            disabled={selected?.tool === "text"}
          />
          <span className="text-xs text-white/70 w-8 text-right">{width}</span>
          {annotations.length > 0 && (
            <button onClick={handleClear} className="text-xs text-white/70 underline shrink-0">
              Effacer
            </button>
          )}
        </div>
      </div>

      {/* Footer actions */}
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

      {/* Modal saisie/édition texte */}
      {textPrompt && (
        <div className="absolute inset-0 z-10 bg-black/70 flex items-center justify-center p-6">
          <div className="bg-white text-mcm-charcoal rounded-xl p-4 w-full max-w-sm space-y-3">
            <label className="block text-sm font-semibold">
              {textPrompt.editingIdx !== null ? "Modifier le texte" : "Texte à insérer"}
            </label>
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

// ─────────────── Rendu ───────────────

function redraw(
  canvas: HTMLCanvasElement,
  bitmap: ImageBitmap,
  annotations: Annotation[],
  draft: Annotation | null,
  selectedIdx: number | null,
  imgWidth: number,
) {
  const ctx = canvas.getContext("2d");
  if (!ctx) return;
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.drawImage(bitmap, 0, 0);
  for (let i = 0; i < annotations.length; i++) {
    drawAnnotation(ctx, annotations[i]);
    if (i === selectedIdx) {
      drawSelectionOverlay(ctx, annotations[i], imgWidth);
    }
  }
  if (draft) drawAnnotation(ctx, draft);
}

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
    const fontSize = a.fontSize * TEXT_SCALE;
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

function drawSelectionOverlay(ctx: CanvasRenderingContext2D, a: Annotation, imgWidth: number) {
  const handleR = imgWidth / 60;
  const center = annotationCenter(a, ctx);

  // Cercle "centre" : indicateur visuel de la sélection (zone de drag)
  ctx.save();
  ctx.fillStyle = "rgba(255, 255, 255, 0.85)";
  ctx.strokeStyle = "#000000";
  ctx.lineWidth = imgWidth / 400;
  drawHandle(ctx, center.x, center.y, handleR * 0.7);

  // Handles de resize spécifiques par type
  if (a.tool === "circle") {
    drawHandle(ctx, a.center.x + a.rx, a.center.y, handleR);
    drawHandle(ctx, a.center.x, a.center.y + a.ry, handleR);
  } else if (a.tool === "arrow") {
    drawHandle(ctx, a.from.x, a.from.y, handleR);
    drawHandle(ctx, a.to.x, a.to.y, handleR);
  } else if (a.tool === "text") {
    const fontSize = a.fontSize * TEXT_SCALE;
    ctx.font = `bold ${fontSize}px sans-serif`;
    const w = ctx.measureText(a.value).width;
    drawHandle(ctx, a.pos.x + w, a.pos.y + fontSize, handleR);
  }
  ctx.restore();
}

function drawHandle(ctx: CanvasRenderingContext2D, x: number, y: number, r: number) {
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
}

// ─────────────── Helpers géométriques ───────────────

function annotationCenter(a: Annotation, ctx: CanvasRenderingContext2D): Pt {
  if (a.tool === "pen") {
    const n = a.points.length;
    const sumX = a.points.reduce((s, p) => s + p.x, 0);
    const sumY = a.points.reduce((s, p) => s + p.y, 0);
    return { x: sumX / n, y: sumY / n };
  }
  if (a.tool === "circle") return a.center;
  if (a.tool === "arrow") return { x: (a.from.x + a.to.x) / 2, y: (a.from.y + a.to.y) / 2 };
  const fontSize = a.fontSize * TEXT_SCALE;
  ctx.save();
  ctx.font = `bold ${fontSize}px sans-serif`;
  const w = ctx.measureText(a.value).width;
  ctx.restore();
  return { x: a.pos.x + w / 2, y: a.pos.y + fontSize / 2 };
}

function distanceToSegment(p: Pt, a: Pt, b: Pt): number {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const lenSq = dx * dx + dy * dy;
  if (lenSq === 0) return Math.hypot(p.x - a.x, p.y - a.y);
  const t = Math.max(0, Math.min(1, ((p.x - a.x) * dx + (p.y - a.y) * dy) / lenSq));
  return Math.hypot(p.x - (a.x + t * dx), p.y - (a.y + t * dy));
}

function hitTestAnnotation(pt: Pt, a: Annotation, baseTol: number): boolean {
  const strokeHalf = a.tool === "text" ? 0 : (a.width * STROKE_SCALE) / 2;
  const tol = baseTol + strokeHalf;

  if (a.tool === "pen") {
    if (a.points.length === 1) {
      return Math.hypot(pt.x - a.points[0].x, pt.y - a.points[0].y) < tol;
    }
    for (let i = 1; i < a.points.length; i++) {
      if (distanceToSegment(pt, a.points[i - 1], a.points[i]) < tol) return true;
    }
    return false;
  }
  if (a.tool === "circle") {
    if (a.rx === 0 || a.ry === 0) return false;
    const dx = pt.x - a.center.x;
    const dy = pt.y - a.center.y;
    const norm = Math.sqrt((dx / a.rx) ** 2 + (dy / a.ry) ** 2);
    const distToEdge = Math.abs(norm - 1) * Math.min(a.rx, a.ry);
    return distToEdge < tol;
  }
  if (a.tool === "arrow") return distanceToSegment(pt, a.from, a.to) < tol;
  // text — bounding box approximative
  const fontSize = a.fontSize * TEXT_SCALE;
  const w = a.value.length * fontSize * 0.6;
  return pt.x >= a.pos.x && pt.x <= a.pos.x + w && pt.y >= a.pos.y && pt.y <= a.pos.y + fontSize;
}

function hitTestHandles(pt: Pt, a: Annotation, tol: number): HandleId | null {
  if (a.tool === "circle") {
    if (Math.hypot(pt.x - (a.center.x + a.rx), pt.y - a.center.y) < tol) return "e";
    if (Math.hypot(pt.x - a.center.x, pt.y - (a.center.y + a.ry)) < tol) return "s";
  } else if (a.tool === "arrow") {
    if (Math.hypot(pt.x - a.from.x, pt.y - a.from.y) < tol) return "from";
    if (Math.hypot(pt.x - a.to.x, pt.y - a.to.y) < tol) return "to";
  } else if (a.tool === "text") {
    const fontSize = a.fontSize * TEXT_SCALE;
    const w = a.value.length * fontSize * 0.6;
    if (Math.hypot(pt.x - (a.pos.x + w), pt.y - (a.pos.y + fontSize)) < tol) return "scale";
  }
  return null;
}

function translateAnnotation(a: Annotation, dx: number, dy: number): Annotation {
  if (a.tool === "pen") {
    return { ...a, points: a.points.map((p) => ({ x: p.x + dx, y: p.y + dy })) };
  }
  if (a.tool === "circle") {
    return { ...a, center: { x: a.center.x + dx, y: a.center.y + dy } };
  }
  if (a.tool === "arrow") {
    return {
      ...a,
      from: { x: a.from.x + dx, y: a.from.y + dy },
      to: { x: a.to.x + dx, y: a.to.y + dy },
    };
  }
  return { ...a, pos: { x: a.pos.x + dx, y: a.pos.y + dy } };
}

function resizeAnnotation(a: Annotation, handle: HandleId, pt: Pt): Annotation {
  if (a.tool === "circle") {
    if (handle === "e") return { ...a, rx: Math.max(2, Math.abs(pt.x - a.center.x)) };
    if (handle === "s") return { ...a, ry: Math.max(2, Math.abs(pt.y - a.center.y)) };
  }
  if (a.tool === "arrow") {
    if (handle === "from") return { ...a, from: pt };
    if (handle === "to") return { ...a, to: pt };
  }
  if (a.tool === "text" && handle === "scale") {
    const dist = Math.hypot(pt.x - a.pos.x, pt.y - a.pos.y);
    return { ...a, fontSize: Math.max(8, dist / (TEXT_SCALE * 1.2)) };
  }
  return a;
}
