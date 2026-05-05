/**
 * Script CLI : Gammes Compilées → LUT (format BUTACHIMIE moins colonnes E/F).
 *
 * Lecture interactive du fichier source, mapping des colonnes (ITEM obligatoire,
 * Corps métier obligatoire, Titre optionnel), sélection des corps de métier EMIS,
 * agrégation par item, génération d'un fichier `LUT-{nom}-{date}.xlsx` avec items
 * non concernés marqués `NC` en gris italique.
 *
 * Lancement : `npx tsx scripts/gammes-to-lut.ts`
 */

import { readdirSync, existsSync } from "node:fs";
import path from "node:path";
import {
  loadWorkbook,
  loadSheetRows,
  detectHeaderRow,
  extractPhases,
  distinctCorps,
} from "../src/lib/import/gammes/parse-gammes";
import { aggregateItems } from "../src/lib/import/gammes/aggregate-items";
import { writeLut, buildOutputPath } from "../src/lib/import/gammes/write-lut";
import {
  selectGammesFile,
  selectSheet,
  confirmHeaderRow,
  mapColumns,
  selectEmisCorps,
  confirmRecap,
} from "./lib/prompts";

const DATA_DIR = path.resolve("data");
const TEMPLATE_PATH = path.resolve("templates/lut-template.xlsx");

function listGammesCandidates(): string[] {
  if (!existsSync(DATA_DIR)) return [];
  return readdirSync(DATA_DIR)
    .filter((f) => /\.(xlsm|xlsx)$/i.test(f) && !f.startsWith("~$"))
    .map((f) => path.join(DATA_DIR, f));
}

async function main(): Promise<void> {
  if (!existsSync(TEMPLATE_PATH)) {
    console.error(`✗ Template introuvable : ${TEMPLATE_PATH}`);
    console.error("  Lance d'abord : npx tsx scripts/build-lut-template.ts");
    process.exit(1);
  }

  // 1. Sélection du fichier
  const candidates = listGammesCandidates();
  const gammesPath = await selectGammesFile(candidates);
  if (!existsSync(gammesPath)) {
    console.error(`✗ Fichier introuvable : ${gammesPath}`);
    process.exit(1);
  }

  // 2. Chargement et sélection de la feuille
  console.log(`→ Lecture de ${gammesPath}`);
  const { wb, sheets } = loadWorkbook(gammesPath);
  const sheetName = await selectSheet(sheets);
  const rows = loadSheetRows(wb, sheetName);
  console.log(`  ${rows.length} lignes lues dans "${sheetName}"`);

  // 3. Détection ligne d'en-tête
  const detection = detectHeaderRow(rows);
  const headerRowIdx = await confirmHeaderRow(detection);
  const headers = (rows[headerRowIdx] ?? []).map((v) => (v == null ? "" : String(v).trim()));

  // 4. Mapping des colonnes
  const mapping = await mapColumns(headers);

  // 5. Lecture des corps de métier distincts + sélection EMIS
  const allCorps = distinctCorps(rows, headerRowIdx, mapping.corpsColIdx);
  const emisSelection = await selectEmisCorps(allCorps);

  // 6. Extraction et agrégation
  const phases = extractPhases(rows, headerRowIdx, mapping);
  console.log(`  ${phases.length} phases extraites`);
  const { items, stats } = aggregateItems(phases, emisSelection);

  // 7. Récap + confirmation
  const outputPath = buildOutputPath(gammesPath, DATA_DIR);
  const ok = await confirmRecap({ stats, emisSelection, outputPath });
  if (!ok) {
    console.log("Annulé.");
    return;
  }

  // 8. Génération
  await writeLut({ templatePath: TEMPLATE_PATH, outputPath, items });
  console.log(`✓ LUT générée : ${outputPath}`);
}

main().catch((err: unknown) => {
  if (err instanceof Error && err.name === "ExitPromptError") {
    console.log("\nAnnulé.");
    process.exit(0);
  }
  console.error("Erreur:", err);
  process.exit(1);
});
