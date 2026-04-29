"use client";

import { useEffect, useRef, useState } from "react";

interface Props {
  pdfBlob: Blob | null;
  filename: string;
}

export function PlanViewer({ pdfBlob, filename }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const [scale, setScale] = useState(1);
  const [loading, setLoading] = useState(true);
  const pdfDocRef = useRef<unknown>(null);

  useEffect(() => {
    if (!pdfBlob) return;

    let cancelled = false;

    async function renderPdf() {
      const pdfjsLib = await import("pdfjs-dist");
      pdfjsLib.GlobalWorkerOptions.workerSrc = "/pdf.worker.min.mjs";

      const arrayBuffer = await pdfBlob!.arrayBuffer();
      const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;

      if (cancelled) return;
      pdfDocRef.current = pdf;
      setTotalPages(pdf.numPages);
      setLoading(false);
    }

    renderPdf();
    return () => {
      cancelled = true;
    };
  }, [pdfBlob]);

  // Render page
  useEffect(() => {
    if (!pdfDocRef.current || !canvasRef.current) return;

    let cancelled = false;

    async function render() {
      const pdf = pdfDocRef.current as {
        getPage: (n: number) => Promise<{
          getViewport: (opts: { scale: number }) => { width: number; height: number };
          render: (opts: { canvasContext: CanvasRenderingContext2D; viewport: unknown }) => {
            promise: Promise<void>;
          };
        }>;
      };
      const pdfPage = await pdf.getPage(page);

      if (cancelled) return;

      const container = containerRef.current;
      const canvas = canvasRef.current;
      if (!container || !canvas) return;

      const baseViewport = pdfPage.getViewport({ scale: 1 });
      const fitScale = container.clientWidth / baseViewport.width;
      const viewport = pdfPage.getViewport({ scale: fitScale * scale });

      canvas.width = viewport.width;
      canvas.height = viewport.height;

      const ctx = canvas.getContext("2d")!;
      await pdfPage.render({ canvasContext: ctx, viewport }).promise;
    }

    render();
    return () => {
      cancelled = true;
    };
  }, [page, scale]);

  if (!pdfBlob) {
    return (
      <div className="flex items-center justify-center h-full text-mcm-warm-gray">
        Aucun plan disponible
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Controls */}
      <div className="flex items-center justify-between px-4 py-2 bg-white border-b border-mcm-warm-gray-border">
        <span className="text-sm text-mcm-warm-gray truncate flex-1">{filename}</span>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setScale((s) => Math.max(0.5, s - 0.25))}
            className="w-10 h-10 rounded-lg bg-slate-200 text-mcm-charcoal text-lg font-bold"
          >
            −
          </button>
          <span className="text-sm text-mcm-warm-gray w-12 text-center">
            {Math.round(scale * 100)}%
          </span>
          <button
            onClick={() => setScale((s) => Math.min(3, s + 0.25))}
            className="w-10 h-10 rounded-lg bg-slate-200 text-mcm-charcoal text-lg font-bold"
          >
            +
          </button>
        </div>
      </div>

      {/* Canvas */}
      <div
        ref={containerRef}
        className="flex-1 min-h-0 overflow-auto bg-slate-100 touch-pan-x touch-pan-y"
      >
        {loading ? (
          <div className="flex items-center justify-center h-full text-mcm-warm-gray">
            Chargement...
          </div>
        ) : (
          <canvas ref={canvasRef} className="mx-auto" />
        )}
      </div>

      {/* Page nav */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-4 px-4 py-2 bg-white border-t border-mcm-warm-gray-border">
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page <= 1}
            className="h-10 px-4 rounded-lg bg-slate-200 text-mcm-charcoal font-semibold disabled:opacity-40"
          >
            Préc.
          </button>
          <span className="text-sm text-mcm-warm-gray">
            {page} / {totalPages}
          </span>
          <button
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page >= totalPages}
            className="h-10 px-4 rounded-lg bg-slate-200 text-mcm-charcoal font-semibold disabled:opacity-40"
          >
            Suiv.
          </button>
        </div>
      )}
    </div>
  );
}
