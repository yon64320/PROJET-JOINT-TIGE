import { NextResponse } from "next/server";
import { z } from "zod";
import { buildFichesHtml } from "@/lib/pdf/fiche-rob-html";
import { GenerateFichesRobBodySchema } from "@/lib/validation/schemas";
import { createServerSupabase } from "@/lib/db/supabase-ssr";
import type { RobFlangeRow } from "@/types/rob";

export async function POST(request: Request) {
  try {
    // MED-16 : verification user explicite + helper standard (api-conventions.md)
    const supabase = await createServerSupabase();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
    }

    const raw = await request.json();
    const parsed = GenerateFichesRobBodySchema.safeParse(raw);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Payload invalide", details: z.flattenError(parsed.error) },
        { status: 400 },
      );
    }
    const { projectId, flangeIds } = parsed.data;

    // Fetch project + template (RLS filtre owner_id = auth.uid())
    const { data: project, error: projErr } = await supabase
      .from("projects")
      .select("name, fiche_rob_template")
      .eq("id", projectId)
      .single();

    if (projErr || !project) {
      return NextResponse.json({ error: "Projet introuvable" }, { status: 404 });
    }

    // Fetch flanges with ot_items join
    const { data: flanges, error: flErr } = await supabase
      .from("flanges")
      .select("*, ot_items!inner(item, unite, famille_item, type_travaux)")
      .in("id", flangeIds)
      .not("num_rob", "is", null)
      .neq("num_rob", "");

    if (flErr || !flanges) {
      return NextResponse.json({ error: "Erreur chargement brides" }, { status: 500 });
    }

    // Sort in requested order
    const idIndex = new Map(flangeIds.map((id, i) => [id, i]));
    const rows = (flanges as RobFlangeRow[]).sort(
      (a, b) => (idIndex.get(a.id) ?? 0) - (idIndex.get(b.id) ?? 0),
    );

    const template = project.fiche_rob_template ?? {
      caracteristiques: [],
      travaux: [],
    };

    // Build HTML
    const html = buildFichesHtml(rows, template, project.name);

    // Generate PDF with Playwright (dynamic import — keep Next.js cold start lean)
    const { getBrowser } = await import("@/lib/pdf/browser");
    const browser = await getBrowser();
    const page = await browser.newPage();
    page.setDefaultTimeout(60_000);
    try {
      await page.setContent(html, { waitUntil: "networkidle", timeout: 30_000 });
      const pdfBuffer = await page.pdf({
        format: "A4",
        printBackground: true,
        margin: { top: 0, right: 0, bottom: 0, left: 0 },
      });

      const date = new Date().toISOString().slice(0, 10);
      const safeName = project.name.replace(/[^a-zA-Z0-9_-]/g, "_");
      const filename = `Fiches_rob_${safeName}_${date}.pdf`;

      return new Response(new Uint8Array(pdfBuffer), {
        headers: {
          "Content-Type": "application/pdf",
          "Content-Disposition": `attachment; filename="${filename}"`,
        },
      });
    } finally {
      await page.close();
    }
  } catch (err) {
    console.error("PDF generation error:", err);
    return NextResponse.json({ error: "Erreur génération PDF" }, { status: 500 });
  }
}
