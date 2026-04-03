"use client";

/**
 * Read-only preview that mirrors the PDF output exactly.
 *
 * Strategy: render at full A4 pixel size (794×1123 px = 210×297 mm @96dpi)
 * then scale down with CSS transform to fit the container.
 * All dimensions use the same pt / mm values as fiche-rob-html.ts,
 * so what you see here IS what the PDF looks like.
 *
 * Layout (Page 1):
 *   columns: 1fr 2fr  (brides 33% | photo 67%)
 *   rows:    auto auto 3fr 3fr 2fr
 *     row 1 — bandeau (full width)
 *     row 2 — carac/travaux (full width)
 *     row 3 — admission (col 1) + photo (col 2, spans rows 3-4)
 *     row 4 — refoulement (col 1)
 *     row 5 — implantation (full width, ~25% of flexible space)
 */

import { useState, useEffect, useRef } from "react";
import { FIELD_MAP, type FicheRobTemplate } from "@/lib/domain/fiche-rob-fields";

// ── Design tokens (identical to fiche-rob-html.ts) ──

const BLUE_DARK = "#1a2744";
const BLUE_MID = "#2d4a6f";
const RED_HEADER = "#c92a2a";
const RED_MID = "#d44040";
const GRAY_ALT = "#f8fafc";
const BORDER = "#e2e8f0";
const BEIGE_BG = "#f5f0e0";
const BEIGE_DARK = "#ebe0c8";

const BLUE_GRAD = `linear-gradient(135deg, ${BLUE_DARK} 0%, ${BLUE_MID} 100%)`;
const RED_GRAD = `linear-gradient(135deg, ${RED_HEADER} 0%, ${RED_MID} 100%)`;
const BEIGE_GRAD = `linear-gradient(135deg, ${BEIGE_BG} 0%, ${BEIGE_DARK} 100%)`;
const PLACEHOLDER_BG = "linear-gradient(180deg, #fafafa 0%, #f1f5f9 100%)";

// ── Reference A4 dimensions at 96 dpi ──

const REF_W = 794; // 210mm
const REF_H = 1123; // 297mm
const HEADER_H_MM = 10;

// ── Sub-components (styles match fiche-rob-html.ts EXACTLY) ──

const BRIDE_ROWS = [
  "DIAM",
  "SERIE",
  "Type joint",
  "Matière joint",
  "Nbr tiges",
  "Boulonnerie",
  "Matière tiges",
];

function PageHeader() {
  return (
    <div
      style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        padding: "2mm 4mm",
        borderBottom: `2px solid ${BLUE_DARK}`,
        height: `${HEADER_H_MM}mm`,
        boxSizing: "border-box",
      }}
    >
      <div
        style={{
          fontWeight: 900,
          fontStyle: "italic",
          color: RED_HEADER,
          fontSize: "13pt",
          letterSpacing: "1px",
        }}
      >
        EMIS
      </div>
      <div
        style={{
          fontWeight: "bold",
          fontSize: "12pt",
          color: BLUE_DARK,
          letterSpacing: "1px",
          textTransform: "uppercase",
        }}
      >
        FICHE INTERVENTION ROB
      </div>
      <div style={{ fontWeight: 600, fontSize: "10pt", color: BLUE_DARK }}>Projet</div>
    </div>
  );
}

function SectionHeader({ children, gradient }: { children: React.ReactNode; gradient: string }) {
  return (
    <div
      style={{
        padding: "1.3mm 2mm",
        fontWeight: "bold",
        fontSize: "10pt",
        color: "white",
        textAlign: "center",
        letterSpacing: "1px",
        textTransform: "uppercase",
        background: gradient,
      }}
    >
      {children}
    </div>
  );
}

function DataRow({ label, value = "---", idx }: { label: string; value?: string; idx: number }) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        borderBottom: `0.5px solid ${BORDER}`,
        minHeight: "4.5mm",
        background: idx % 2 === 1 ? GRAY_ALT : "white",
      }}
    >
      <div
        style={{
          width: "50%",
          padding: "0.7mm 1.5mm",
          fontWeight: 600,
          fontSize: "9pt",
          color: "#1e293b",
        }}
      >
        {label}
      </div>
      <div style={{ width: "50%", padding: "0.7mm 1.5mm", fontSize: "9pt", color: "#1e293b" }}>
        {value}
      </div>
    </div>
  );
}

// ── Block renderers ──

function BandeauBlock() {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "2mm 4mm",
        textAlign: "center",
        fontWeight: "bold",
        fontSize: "10.5pt",
        letterSpacing: "0.5px",
        color: BLUE_DARK,
        background: BEIGE_GRAD,
        border: `0.5px solid ${BEIGE_DARK}`,
        borderRadius: "1mm",
      }}
    >
      PSVBB2004 — DEPOSE REPOSE REVISION — Transport
    </div>
  );
}

function CaracTravauxBlock({ template }: { template: FicheRobTemplate }) {
  return (
    <div
      style={{
        display: "flex",
        border: `0.5px solid ${BORDER}`,
        borderRadius: "1mm",
        overflow: "hidden",
      }}
    >
      <div style={{ flex: 1, minWidth: 0, borderRight: `0.5px solid ${BORDER}` }}>
        <SectionHeader gradient={BLUE_GRAD}>CARACTERISTIQUES</SectionHeader>
        {template.caracteristiques.map((key, i) => {
          const field = FIELD_MAP.get(key);
          return <DataRow key={key} label={field?.label ?? key} idx={i} />;
        })}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <SectionHeader gradient={BLUE_GRAD}>TRAVAUX</SectionHeader>
        {template.travaux.map((key, i) => {
          const field = FIELD_MAP.get(key);
          return <DataRow key={key} label={field?.label ?? key} idx={i} />;
        })}
      </div>
    </div>
  );
}

function BrideBlock({ title }: { title: string }) {
  return (
    <div
      style={{
        height: "100%",
        border: `0.5px solid ${BORDER}`,
        borderRadius: "1mm",
        overflow: "hidden",
        display: "flex",
        flexDirection: "column",
      }}
    >
      <SectionHeader gradient={RED_GRAD}>{title}</SectionHeader>
      <div style={{ flex: 1 }}>
        {BRIDE_ROWS.map((label, i) => (
          <DataRow key={label} label={label} idx={i} />
        ))}
      </div>
    </div>
  );
}

function PhotoBlock() {
  return (
    <div
      style={{
        height: "100%",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        border: `0.5px dashed ${BORDER}`,
        borderRadius: "1mm",
        background: PLACEHOLDER_BG,
        color: "#94a3b8",
        fontSize: "8pt",
      }}
    >
      Photo
    </div>
  );
}

function ImplantationBlock() {
  return (
    <div
      style={{
        height: "100%",
        display: "flex",
        flexDirection: "column",
        border: `0.5px solid ${BORDER}`,
        borderRadius: "1mm",
        overflow: "hidden",
      }}
    >
      <div
        style={{
          padding: "0.5mm 2mm",
          fontWeight: "bold",
          fontStyle: "italic",
          fontSize: "9pt",
          color: "white",
          background: BLUE_GRAD,
          letterSpacing: "0.5px",
        }}
      >
        Implantation
      </div>
      <div
        style={{
          flex: 1,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: PLACEHOLDER_BG,
          color: "#94a3b8",
          fontSize: "8pt",
        }}
      >
        Implantation
      </div>
    </div>
  );
}

function PidBlock() {
  return (
    <div
      style={{
        height: "100%",
        display: "flex",
        flexDirection: "column",
        border: `0.5px solid ${BORDER}`,
        borderRadius: "1mm",
        overflow: "hidden",
      }}
    >
      <div
        style={{
          background: BLUE_GRAD,
          padding: "2mm 4mm",
          textAlign: "center",
          fontWeight: "bold",
          fontSize: "10.5pt",
          color: "white",
          letterSpacing: "1.5px",
          textTransform: "uppercase",
        }}
      >
        PID
      </div>
      <div
        style={{
          flex: 1,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color: "#94a3b8",
          fontSize: "13pt",
        }}
      >
        PID
      </div>
    </div>
  );
}

// ── Fixed CSS Grid page ──

function Page1Content({ template }: { template: FicheRobTemplate }) {
  return (
    <div
      style={{
        flex: 1,
        display: "grid",
        gridTemplateColumns: "1fr 2fr",
        gridTemplateRows: "auto auto 2.5fr 2.5fr 3.8fr",
        minHeight: 0,
      }}
    >
      <div style={{ gridColumn: "1 / 3" }}>
        <BandeauBlock />
      </div>
      <div style={{ gridColumn: "1 / 3" }}>
        <CaracTravauxBlock template={template} />
      </div>
      <div style={{ gridColumn: "1 / 2" }}>
        <BrideBlock title="ENTREE / ADMISSION" />
      </div>
      <div style={{ gridColumn: "2 / 3", gridRow: "3 / 5" }}>
        <PhotoBlock />
      </div>
      <div style={{ gridColumn: "1 / 2" }}>
        <BrideBlock title="SORTIE / REFOULEMENT" />
      </div>
      <div style={{ gridColumn: "1 / 3" }}>
        <ImplantationBlock />
      </div>
    </div>
  );
}

function Page2Content() {
  return (
    <div style={{ flex: 1, minHeight: 0 }}>
      <PidBlock />
    </div>
  );
}

// ── Scaled A4 Page — renders at real size then scales to fit container ──

function A4Page({ children }: { children: React.ReactNode }) {
  const wrapperRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);

  useEffect(() => {
    const el = wrapperRef.current;
    if (!el) return;
    const ro = new ResizeObserver((entries) => {
      for (const entry of entries) setScale(entry.contentRect.width / REF_W);
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  return (
    <div
      ref={wrapperRef}
      style={{
        width: "100%",
        aspectRatio: "210 / 297",
        overflow: "hidden",
        border: `1px solid ${BORDER}`,
        borderRadius: "4px",
        boxShadow: "0 1px 4px rgba(0,0,0,0.06), 0 4px 12px rgba(0,0,0,0.03)",
      }}
    >
      <div
        style={{
          width: `${REF_W}px`,
          height: `${REF_H}px`,
          transformOrigin: "top left",
          transform: `scale(${scale})`,
          background: "white",
          fontFamily: "Helvetica, Arial, sans-serif",
          fontSize: "9pt",
          lineHeight: 1.3,
          display: "flex",
          flexDirection: "column",
        }}
      >
        <PageHeader />
        {children}
      </div>
    </div>
  );
}

// ── Main export ──

interface FichePreviewStaticProps {
  template: FicheRobTemplate;
}

export default function FichePreviewStatic({ template }: FichePreviewStaticProps) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
      <A4Page>
        <Page1Content template={template} />
      </A4Page>
      <A4Page>
        <Page2Content />
      </A4Page>
    </div>
  );
}
