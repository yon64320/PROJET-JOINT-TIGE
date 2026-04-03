import { NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { getBrowser } from "@/lib/pdf/browser";
import { buildFichesHtml } from "@/lib/pdf/fiche-rob-html";
import type { RobFlangeRow } from "@/types/rob";

export async function POST(request: Request) {
  try {
    const cookieStore = await cookies();
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return cookieStore.getAll();
          },
          setAll() {},
        },
      },
    );

    const body = await request.json();
    const { projectId, flangeIds } = body as { projectId?: string; flangeIds?: string[] };

    if (!projectId || !flangeIds?.length) {
      return NextResponse.json({ error: "projectId et flangeIds requis" }, { status: 400 });
    }

    // Fetch project + template
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
      .eq("rob", true);

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

    // Generate PDF with Playwright
    const browser = await getBrowser();
    const page = await browser.newPage();
    try {
      await page.setContent(html, { waitUntil: "networkidle" });
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
