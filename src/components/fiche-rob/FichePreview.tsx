"use client";

import { useCallback, useState, useEffect, useRef, type MutableRefObject } from "react";
import { GridLayout, verticalCompactor, type LayoutItem, type Layout } from "react-grid-layout";
import "react-grid-layout/css/styles.css";
import { FIELD_MAP, type FicheRobTemplate, type BlockLayout } from "@/lib/domain/fiche-rob-fields";

const BRIDE_ROWS = [
  "DIAM",
  "SERIE",
  "Type joint",
  "Matière joint",
  "Nbr tiges",
  "Boulonnerie",
  "Matière tiges",
];

// ── Design tokens ──
const BLUE_DARK = "#1a2744";
const RED_HEADER = "#c92a2a";
const GRAY_ALT = "#f4f5f7";
const BORDER = "#d1d5db";
const BEIGE_BG = "#f5f0e0";

// ── Grid config ──
const COLS = 12;

/** Block IDs */
type BlockId =
  | "bandeau"
  | "carac-travaux"
  | "admission"
  | "refoulement"
  | "photo"
  | "implantation"
  | "pid";

const ALL_BLOCKS: BlockId[] = [
  "bandeau",
  "carac-travaux",
  "admission",
  "refoulement",
  "photo",
  "implantation",
  "pid",
];

/** Default page assignment */
const DEFAULT_BLOCK_PAGES: Record<BlockId, 1 | 2> = {
  bandeau: 1,
  "carac-travaux": 1,
  admission: 1,
  refoulement: 1,
  photo: 1,
  implantation: 1,
  pid: 2,
};

/** Blocs dont la hauteur est libre (photo, implantation, PID) */
const RESIZABLE_HEIGHT_BLOCKS = new Set<BlockId>(["photo", "implantation", "pid"]);

/** Hauteur en grid-rows pour 1 ligne de DataRow (~9px content + border) */
const ROW_PER_LINE = 1;
/** Hauteur en grid-rows pour 1 header TableHeader (~13px) */
const ROW_PER_HEADER = 1.5;

/** Calcule h fixe pour les blocs données en fonction du nb de lignes */
function computeFixedH(id: BlockId, caracLen: number, travLen: number): number {
  switch (id) {
    case "bandeau":
      return 2;
    case "carac-travaux":
      // 2 headers + max(carac, trav) lignes + 1 marge
      return Math.ceil(ROW_PER_HEADER + Math.max(caracLen, travLen) * ROW_PER_LINE + 1);
    case "admission":
    case "refoulement":
      // 1 header + 7 bride rows + 1 marge
      return Math.ceil(ROW_PER_HEADER + BRIDE_ROWS.length * ROW_PER_LINE + 1);
    default:
      return 8;
  }
}

/** Positions par défaut (x, y, w) — h est calculé dynamiquement pour les blocs données */
const DEFAULT_POSITIONS: Record<
  BlockId,
  { x: number; y: number; w: number; h: number; minW?: number }
> = {
  bandeau: { x: 0, y: 0, w: 12, h: 2, minW: 4 },
  "carac-travaux": { x: 0, y: 2, w: 12, h: 15, minW: 4 },
  admission: { x: 0, y: 17, w: 5, h: 10, minW: 3 },
  refoulement: { x: 5, y: 17, w: 5, h: 10, minW: 3 },
  photo: { x: 10, y: 17, w: 2, h: 10, minW: 2 },
  implantation: { x: 0, y: 27, w: 12, h: 8, minW: 3 },
  pid: { x: 0, y: 0, w: 12, h: 30, minW: 3 },
};

const BLOCK_LABELS: Record<BlockId, string> = {
  bandeau: "Titre",
  "carac-travaux": "Carac. / Travaux",
  admission: "Admission",
  refoulement: "Refoulement",
  photo: "Photo",
  implantation: "Implantation",
  pid: "PID",
};

// ── Sub-components ──

function PageHeader() {
  return (
    <div
      className="flex items-center justify-between px-3 py-1.5"
      style={{ borderBottom: `1px solid ${BORDER}` }}
    >
      <div className="font-black italic text-red-600 text-[10px] tracking-wider">EMIS</div>
      <div className="font-bold text-[9px] tracking-wide underline" style={{ color: BLUE_DARK }}>
        FICHE INTERVENTION ROB
      </div>
      <div className="flex items-center gap-1">
        <span className="inline-block w-2 h-2 rounded-sm" style={{ background: "#f59e0b" }} />
        <span className="font-bold text-blue-700 text-[8px]">butachimie</span>
      </div>
    </div>
  );
}

function TableHeader({ children, bg }: { children: React.ReactNode; bg: string }) {
  return (
    <div
      className="px-1.5 py-[3px] font-bold text-center text-white text-[7px] tracking-wide"
      style={{ background: bg, borderBottom: `1px solid ${BORDER}` }}
    >
      {children}
    </div>
  );
}

function DataRow({ label, value = "---", idx }: { label: string; value?: string; idx: number }) {
  return (
    <tr
      style={{
        background: idx % 2 === 1 ? GRAY_ALT : "white",
        borderBottom: `1px solid ${BORDER}`,
      }}
    >
      <td className="px-1 py-px font-medium" style={{ width: "50%" }}>
        {label}
      </td>
      <td className="px-1 py-px text-slate-500" style={{ width: "50%" }}>
        {value}
      </td>
    </tr>
  );
}

function BrideTable({ title, prefix }: { title: string; prefix: string }) {
  return (
    <div className="h-full flex flex-col" style={{ border: `1px solid ${BORDER}` }}>
      <TableHeader bg={RED_HEADER}>{title}</TableHeader>
      <table className="w-full" style={{ borderCollapse: "collapse" }}>
        <tbody>
          {BRIDE_ROWS.map((label, i) => (
            <DataRow key={`${prefix}-${label}`} label={label} idx={i} />
          ))}
        </tbody>
      </table>
    </div>
  );
}

function BandeauBlock() {
  return (
    <div
      className="h-full flex items-center justify-center px-3 py-1 text-center font-bold text-[7px] tracking-wide"
      style={{ background: BEIGE_BG, color: "#000", border: `1px solid ${BORDER}` }}
    >
      PSVBB2004 &mdash; DEPOSE REPOSE REVISION &mdash; Transport AIRE POSEIDON
    </div>
  );
}

function CaracTravauxBlock({ template }: { template: FicheRobTemplate }) {
  return (
    <div className="h-full flex overflow-hidden" style={{ border: `1px solid ${BORDER}` }}>
      <div className="flex-1 flex flex-col min-w-0" style={{ borderRight: `1px solid ${BORDER}` }}>
        <TableHeader bg={BLUE_DARK}>CARACTERISTIQUES</TableHeader>
        <div className="flex-1 overflow-auto">
          <table className="w-full" style={{ borderCollapse: "collapse" }}>
            <tbody>
              {template.caracteristiques.map((key, i) => {
                const field = FIELD_MAP.get(key);
                return <DataRow key={key} label={field?.label ?? key} idx={i} />;
              })}
            </tbody>
          </table>
        </div>
      </div>
      <div className="flex-1 flex flex-col min-w-0">
        <TableHeader bg={BLUE_DARK}>TRAVAUX</TableHeader>
        <div className="flex-1 overflow-auto">
          <table className="w-full" style={{ borderCollapse: "collapse" }}>
            <tbody>
              {template.travaux.map((key, i) => {
                const field = FIELD_MAP.get(key);
                return <DataRow key={key} label={field?.label ?? key} idx={i} />;
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function PhotoBlock() {
  return (
    <div
      className="h-full flex items-center justify-center text-slate-300 text-[6px]"
      style={{ border: `1px dashed ${BORDER}`, background: "#fafafa" }}
    >
      Photo
    </div>
  );
}

function ImplantationBlock() {
  return (
    <div className="h-full flex flex-col" style={{ border: `1px solid ${BORDER}` }}>
      <div
        className="px-1.5 py-0.5 font-bold italic text-[7px] shrink-0"
        style={{ borderBottom: `1px solid ${BORDER}`, color: BLUE_DARK }}
      >
        Implantation
      </div>
      <div
        className="flex-1 flex items-center justify-center text-slate-300 text-[6px]"
        style={{ background: "#fafafa" }}
      >
        Implantation
      </div>
    </div>
  );
}

function PidBlock() {
  return (
    <div className="h-full flex flex-col" style={{ border: `1px solid ${BORDER}` }}>
      <div
        className="px-3 py-1 text-white text-center font-bold text-[8px] tracking-wider shrink-0"
        style={{ background: BLUE_DARK }}
      >
        PID
      </div>
      <div className="flex-1 flex items-center justify-center text-slate-300 text-[8px]">PID</div>
    </div>
  );
}

// ── Drag handle + page switch button ──
function BlockControls({
  label,
  editable,
  page,
  onSwitchPage,
}: {
  label: string;
  editable: boolean;
  page: 1 | 2;
  onSwitchPage?: () => void;
}) {
  if (!editable) return null;
  const targetPage = page === 1 ? 2 : 1;
  return (
    <div className="drag-handle absolute top-0 left-0 right-0 flex items-center gap-1 px-1 py-0.5 bg-blue-600/80 text-white text-[6px] font-bold cursor-grab opacity-0 group-hover:opacity-100 transition-opacity z-10">
      <svg className="w-2.5 h-2.5 shrink-0" viewBox="0 0 24 24" fill="currentColor">
        <circle cx="8" cy="6" r="2" />
        <circle cx="16" cy="6" r="2" />
        <circle cx="8" cy="12" r="2" />
        <circle cx="16" cy="12" r="2" />
        <circle cx="8" cy="18" r="2" />
        <circle cx="16" cy="18" r="2" />
      </svg>
      <span className="flex-1">{label}</span>
      <button
        type="button"
        className="px-1 py-px bg-white/20 hover:bg-white/40 rounded text-[5px] cursor-pointer transition-colors"
        onMouseDown={(e) => e.stopPropagation()}
        onClick={(e) => {
          e.stopPropagation();
          onSwitchPage?.();
        }}
        title={`Déplacer vers page ${targetPage}`}
      >
        → P{targetPage}
      </button>
    </div>
  );
}

// ── Measured grid wrapper ──
function MeasuredGrid({
  layout,
  editable,
  onLayoutChange,
  children,
}: {
  layout: Layout;
  editable: boolean;
  onLayoutChange?: (l: Layout) => void;
  children: React.ReactNode;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(0);
  const [height, setHeight] = useState(0);

  useEffect(() => {
    if (!ref.current) return;
    const ro = new ResizeObserver((entries) => {
      for (const entry of entries) {
        setWidth(entry.contentRect.width);
        setHeight(entry.contentRect.height);
      }
    });
    ro.observe(ref.current);
    return () => ro.disconnect();
  }, []);

  // Compute dynamic row height to fill the A4 content area (same logic as PDF)
  const maxY = Math.max(1, ...layout.map((item) => item.y + item.h));
  const margin = editable ? 1 : 0;
  const padding = editable ? 1 : 0;
  const availableH = height - 2 * padding;
  const rowHeight = availableH > 0 ? (availableH - (maxY + 1) * margin) / maxY : 10;

  return (
    <div ref={ref} className="h-full">
      {width > 0 && height > 0 && (
        <GridLayout
          layout={layout}
          width={width}
          compactor={verticalCompactor}
          gridConfig={{
            cols: COLS,
            rowHeight: Math.max(1, rowHeight),
            margin: editable ? ([1, 1] as const) : ([0, 0] as const),
            containerPadding: editable ? ([1, 1] as const) : ([0, 0] as const),
            maxRows: Infinity,
          }}
          dragConfig={{
            enabled: editable,
            handle: ".drag-handle",
          }}
          resizeConfig={{
            enabled: editable,
            handles: ["se", "e", "s"] as const,
          }}
          onLayoutChange={editable ? onLayoutChange : undefined}
        >
          {children}
        </GridLayout>
      )}
    </div>
  );
}

// ── A4 Page wrapper ──
function A4Page({
  children,
  pageNum,
  editable,
}: {
  children: React.ReactNode;
  pageNum: number;
  editable: boolean;
}) {
  return (
    <div
      className="w-full bg-white text-[6.5px] leading-tight flex flex-col"
      style={{
        aspectRatio: "210 / 297",
        border: `1px solid ${BORDER}`,
        boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
        overflow: "hidden",
        position: "relative",
      }}
    >
      <PageHeader />
      {editable && (
        <div className="absolute top-0 right-0 px-1.5 py-0.5 bg-slate-500/70 text-white text-[6px] font-bold rounded-bl z-20">
          Page {pageNum}
        </div>
      )}
      <div className="flex-1 min-h-0 overflow-hidden">{children}</div>
    </div>
  );
}

// ── Main component ──
interface FichePreviewProps {
  template: FicheRobTemplate;
  editable?: boolean;
  onLayoutChange?: (layouts: Record<string, BlockLayout>) => void;
}

export default function FichePreview({
  template,
  editable = false,
  onLayoutChange,
}: FichePreviewProps) {
  const caracLen = template.caracteristiques.length;
  const travLen = template.travaux.length;

  // Resolve page + position for each block
  const getBlockState = useCallback(() => {
    const saved = template.blockLayouts ?? {};
    const pages: Record<string, 1 | 2> = {};
    const positions: Record<string, { x: number; y: number; w: number; h: number; minW?: number }> =
      {};

    for (const id of ALL_BLOCKS) {
      const s = saved[id];
      const base = DEFAULT_POSITIONS[id];
      pages[id] = s?.page ?? DEFAULT_BLOCK_PAGES[id];

      // Pour les blocs données, h est fixe (calculé depuis le contenu)
      const isFixed = !RESIZABLE_HEIGHT_BLOCKS.has(id);
      const fixedH = isFixed ? computeFixedH(id, caracLen, travLen) : undefined;

      positions[id] = {
        x: s?.x ?? base.x,
        y: s?.y ?? base.y,
        w: s?.w ?? base.w,
        h: fixedH ?? s?.h ?? base.h,
        minW: base.minW,
      };
    }
    return { pages, positions };
  }, [template.blockLayouts, caracLen, travLen]);

  const [blockPages, setBlockPages] = useState<Record<string, 1 | 2>>(() => getBlockState().pages);
  const [blockPositions, setBlockPositions] = useState<
    Record<string, { x: number; y: number; w: number; h: number; minW?: number }>
  >(() => getBlockState().positions);

  // Sync on external template changes
  useEffect(() => {
    const { pages, positions } = getBlockState();
    setBlockPages(pages);
    setBlockPositions(positions);
  }, [getBlockState]);

  // ── Deferred emit to parent (avoids setState-during-render) ──
  const pendingEmitRef = useRef<Record<string, BlockLayout> | null>(
    null,
  ) as MutableRefObject<Record<string, BlockLayout> | null>;

  useEffect(() => {
    if (pendingEmitRef.current && onLayoutChange) {
      const payload = pendingEmitRef.current;
      pendingEmitRef.current = null;
      onLayoutChange(payload);
    }
  });

  const scheduleEmit = useCallback(
    (
      pages: Record<string, 1 | 2>,
      positions: Record<string, { x: number; y: number; w: number; h: number }>,
    ) => {
      if (!onLayoutChange) return;
      const result: Record<string, BlockLayout> = {};
      for (const id of ALL_BLOCKS) {
        const pos = positions[id] ?? DEFAULT_POSITIONS[id];
        result[id] = {
          x: pos.x,
          y: pos.y,
          w: pos.w,
          h: pos.h,
          page: pages[id] ?? DEFAULT_BLOCK_PAGES[id],
        };
      }
      pendingEmitRef.current = result;
    },
    [onLayoutChange],
  );

  // Switch a block to the other page
  const switchPage = useCallback(
    (id: BlockId) => {
      setBlockPages((prev) => {
        const next = { ...prev, [id]: prev[id] === 1 ? (2 as const) : (1 as const) };
        setBlockPositions((prevPos) => {
          const updated = { ...prevPos, [id]: { ...prevPos[id], x: 0, y: 0 } };
          scheduleEmit(next, updated);
          return updated;
        });
        return next;
      });
    },
    [scheduleEmit],
  );

  // Handle layout change for a specific page
  const handlePageLayoutChange = useCallback(
    (pageNum: 1 | 2) => (newLayout: Layout) => {
      setBlockPositions((prev) => {
        const updated = { ...prev };
        for (const item of newLayout) {
          updated[item.i] = {
            ...updated[item.i],
            x: item.x,
            y: item.y,
            w: item.w,
            h: item.h,
          };
        }
        scheduleEmit(blockPages, updated);
        return updated;
      });
    },
    [blockPages, scheduleEmit],
  );

  // Build grid layout for a page
  function buildPageLayout(pageNum: 1 | 2): Layout {
    return ALL_BLOCKS.filter((id) => (blockPages[id] ?? DEFAULT_BLOCK_PAGES[id]) === pageNum).map(
      (id): LayoutItem => {
        const pos = blockPositions[id] ?? DEFAULT_POSITIONS[id];
        const isFixed = !RESIZABLE_HEIGHT_BLOCKS.has(id);
        const fixedH = isFixed ? computeFixedH(id, caracLen, travLen) : undefined;
        const h = fixedH ?? pos.h;
        return {
          i: id,
          x: pos.x,
          y: pos.y,
          w: pos.w,
          h,
          minW: pos.minW,
          // Blocs données : hauteur verrouillée (minH = maxH = h)
          minH: isFixed ? h : 3,
          maxH: isFixed ? h : undefined,
          static: !editable,
        };
      },
    );
  }

  function renderBlock(id: BlockId) {
    switch (id) {
      case "bandeau":
        return <BandeauBlock />;
      case "carac-travaux":
        return <CaracTravauxBlock template={template} />;
      case "admission":
        return <BrideTable title="ENTREE / ADMISSION" prefix="adm" />;
      case "refoulement":
        return <BrideTable title="SORTIE / REFOULEMENT" prefix="ref" />;
      case "photo":
        return <PhotoBlock />;
      case "implantation":
        return <ImplantationBlock />;
      case "pid":
        return <PidBlock />;
    }
  }

  function renderPageBlocks(pageNum: 1 | 2) {
    return ALL_BLOCKS.filter((id) => (blockPages[id] ?? DEFAULT_BLOCK_PAGES[id]) === pageNum).map(
      (id) => (
        <div key={id} className={`h-full overflow-hidden ${editable ? "group relative" : ""}`}>
          <BlockControls
            label={BLOCK_LABELS[id]}
            editable={editable}
            page={pageNum}
            onSwitchPage={() => switchPage(id)}
          />
          {renderBlock(id)}
        </div>
      ),
    );
  }

  const layout1 = buildPageLayout(1);
  const layout2 = buildPageLayout(2);

  return (
    <div className="flex flex-col gap-4">
      {/* ═══ PAGE 1 ═══ */}
      <A4Page pageNum={1} editable={editable}>
        <MeasuredGrid
          layout={layout1}
          editable={editable}
          onLayoutChange={handlePageLayoutChange(1)}
        >
          {renderPageBlocks(1)}
        </MeasuredGrid>
      </A4Page>

      {/* ═══ PAGE 2 ═══ */}
      <A4Page pageNum={2} editable={editable}>
        <MeasuredGrid
          layout={layout2}
          editable={editable}
          onLayoutChange={handlePageLayoutChange(2)}
        >
          {renderPageBlocks(2)}
        </MeasuredGrid>
      </A4Page>
    </div>
  );
}
