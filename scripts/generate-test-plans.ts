/**
 * Script CLI : génère un dossier de PDF de test pour l'upload des plans
 * d'équipement (page `/projets/<id>/plans`).
 *
 * Structure produite — celle attendue par `webkitdirectory` pour le matching
 * auto vers les ITEMs du projet :
 *
 *   data/plans-test-<slug-projet>/
 *     ├─ <ITEM_1>/
 *     │   └─ <ITEM_1>.pdf
 *     ├─ <ITEM_2>/
 *     │   └─ <ITEM_2>.pdf
 *     └─ ...
 *
 * Chaque PDF contient le nom de l'ITEM en gros au centre de la page.
 *
 * Lancement :
 *   npx tsx scripts/generate-test-plans.ts                # liste les projets
 *   npx tsx scripts/generate-test-plans.ts <projectId>    # génère pour ce projet
 */

import { mkdirSync, writeFileSync, rmSync, existsSync } from "node:fs";
import path from "node:path";
import { config as loadEnv } from "dotenv";
import { createClient } from "@supabase/supabase-js";

loadEnv({ path: ".env.local" });

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SERVICE_KEY) {
  console.error(
    "[generate-test-plans] NEXT_PUBLIC_SUPABASE_URL et SUPABASE_SERVICE_ROLE_KEY requis dans .env.local",
  );
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SERVICE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

// ───────────────────────────────────────────────────────────────────────────
// PDF minimal — A4 portrait (595 x 842 pt), texte centré, police Helvetica.
// Construit à la main pour éviter une dépendance (pdf-lib / pdfkit).
// ───────────────────────────────────────────────────────────────────────────

function escapePdfString(s: string): string {
  return s.replace(/\\/g, "\\\\").replace(/\(/g, "\\(").replace(/\)/g, "\\)");
}

/**
 * Largeur approximative d'une chaîne en Helvetica à `fontSize` pt.
 * Valeurs moyennes — suffisant pour centrer un titre court.
 */
function approxWidth(text: string, fontSize: number): number {
  // Helvetica : largeur moyenne ≈ 0.55 * fontSize par caractère.
  return text.length * fontSize * 0.55;
}

function buildPdf(label: string): Buffer {
  const fontSize = 36;
  const pageWidth = 595;
  const pageHeight = 842;
  const text = escapePdfString(label);
  const textWidth = approxWidth(label, fontSize);
  const x = Math.max(40, (pageWidth - textWidth) / 2);
  const y = pageHeight / 2;

  const subFontSize = 14;
  const sub = escapePdfString("Plan de test — généré automatiquement");
  const subWidth = approxWidth("Plan de test — généré automatiquement", subFontSize);
  const subX = Math.max(40, (pageWidth - subWidth) / 2);
  const subY = y - 60;

  const stream = `BT\n/F1 ${fontSize} Tf\n${x.toFixed(2)} ${y.toFixed(2)} Td\n(${text}) Tj\nET\nBT\n/F1 ${subFontSize} Tf\n${subX.toFixed(2)} ${subY.toFixed(2)} Td\n(${sub}) Tj\nET\n`;
  const streamBytes = Buffer.byteLength(stream, "latin1");

  const objects: string[] = [];
  objects.push("1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n");
  objects.push("2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n");
  objects.push(
    `3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${pageWidth} ${pageHeight}] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >>\nendobj\n`,
  );
  objects.push(`4 0 obj\n<< /Length ${streamBytes} >>\nstream\n${stream}endstream\nendobj\n`);
  objects.push(
    "5 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>\nendobj\n",
  );

  const header = "%PDF-1.4\n%\xff\xff\xff\xff\n";
  const offsets: number[] = [];
  let cursor = Buffer.byteLength(header, "latin1");
  for (const obj of objects) {
    offsets.push(cursor);
    cursor += Buffer.byteLength(obj, "latin1");
  }

  const xrefStart = cursor;
  let xref = `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
  for (const offset of offsets) {
    xref += `${String(offset).padStart(10, "0")} 00000 n \n`;
  }
  const trailer = `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefStart}\n%%EOF\n`;

  return Buffer.from(header + objects.join("") + xref + trailer, "latin1");
}

// ───────────────────────────────────────────────────────────────────────────
// Helpers fichiers
// ───────────────────────────────────────────────────────────────────────────

function slugify(s: string): string {
  return s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
}

function sanitizeFileName(s: string): string {
  return s.replace(/[^a-zA-Z0-9._\- ]/g, "_").slice(0, 80);
}

// ───────────────────────────────────────────────────────────────────────────
// Main
// ───────────────────────────────────────────────────────────────────────────

async function listProjects() {
  const { data, error } = await supabase
    .from("projects")
    .select("id, name, client")
    .order("created_at", { ascending: false });
  if (error) {
    console.error("[generate-test-plans] Erreur lecture projets :", error.message);
    process.exit(1);
  }
  if (!data || data.length === 0) {
    console.log("[generate-test-plans] Aucun projet en base.");
    return;
  }
  console.log("\nProjets disponibles :");
  console.log("─".repeat(80));
  for (const p of data) {
    console.log(`  ${p.id}  ${p.name}${p.client ? `  [${p.client}]` : ""}`);
  }
  console.log("\nUsage : npx tsx scripts/generate-test-plans.ts <projectId>");
}

async function generateForProject(projectId: string, limit: number | null) {
  const { data: project, error: projectErr } = await supabase
    .from("projects")
    .select("id, name")
    .eq("id", projectId)
    .single();

  if (projectErr || !project) {
    console.error(`[generate-test-plans] Projet ${projectId} introuvable.`);
    process.exit(1);
  }

  const itemsQuery = supabase
    .from("ot_items")
    .select("id, item")
    .eq("project_id", projectId)
    .order("item", { ascending: true });
  if (limit && limit > 0) itemsQuery.limit(limit);
  const { data: items, error: itemsErr } = await itemsQuery;

  if (itemsErr) {
    console.error("[generate-test-plans] Erreur lecture ot_items :", itemsErr.message);
    process.exit(1);
  }

  if (!items || items.length === 0) {
    console.log(`[generate-test-plans] Aucun ITEM dans le projet "${project.name}".`);
    process.exit(0);
  }

  const outDir = path.resolve("data", `plans-test-${slugify(project.name)}`);
  if (existsSync(outDir)) {
    console.log(`[generate-test-plans] Nettoyage du dossier existant : ${outDir}`);
    rmSync(outDir, { recursive: true, force: true });
  }
  mkdirSync(outDir, { recursive: true });

  console.log(`\nGénération de ${items.length} plans dans :\n  ${outDir}\n`);

  let n = 0;
  for (const { item } of items) {
    if (!item) continue;
    const folder = path.join(outDir, sanitizeFileName(item));
    mkdirSync(folder, { recursive: true });
    const pdfPath = path.join(folder, `${sanitizeFileName(item)}.pdf`);
    writeFileSync(pdfPath, buildPdf(item));
    n++;
    if (n <= 10 || n % 50 === 0) {
      console.log(`  ✓ ${item}`);
    }
  }
  if (n > 10) console.log(`  ... (${n} fichiers au total)`);

  console.log(`\n✓ Terminé. ${n} dossiers / PDF créés.`);
  console.log(`\nProchaine étape : ouvre /projets/${projectId}/plans et sélectionne le dossier`);
  console.log(`  ${outDir}`);
  console.log(`Le matching auto devrait reconnaître chaque sous-dossier comme un ITEM.\n`);
}

async function main() {
  const args = process.argv.slice(2);
  const projectId = args.find((a) => !a.startsWith("--")) ?? null;
  const limitArg = args.find((a) => a.startsWith("--limit="));
  const limit = limitArg ? parseInt(limitArg.split("=")[1], 10) : null;

  if (!projectId) {
    await listProjects();
  } else {
    await generateForProject(projectId, Number.isFinite(limit) ? limit : null);
  }
}

main().catch((err) => {
  console.error("[generate-test-plans] Erreur inattendue :", err);
  process.exit(1);
});
