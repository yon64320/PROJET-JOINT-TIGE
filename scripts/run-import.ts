/**
 * Import LUT + J&T en base Supabase.
 * Usage: npx tsx scripts/run-import.ts
 */
import { config } from "dotenv";
import * as path from "path";
import * as fs from "fs";

// Charger .env.local AVANT d'importer les modules qui utilisent process.env
config({ path: path.resolve(__dirname, "../.env.local") });

const DATA_DIR = path.resolve(__dirname, "../data");

async function main() {
  // Imports dynamiques — exécutés APRÈS dotenv
  const { parseLut } = await import("../src/lib/excel/parse-lut");
  const { parseJt } = await import("../src/lib/excel/parse-jt");
  const { importLutToDb } = await import("../src/lib/db/import-lut");
  const { importJtToDb } = await import("../src/lib/db/import-jt");

  // 1. Import LUT
  console.log("=== IMPORT LUT ===");
  const lutFile = fs.readFileSync(
    path.join(DATA_DIR, "BUTACHIMIE - LUT- 20260303.xlsm")
  );
  const lutRows = parseLut(lutFile.buffer as ArrayBuffer);
  console.log(`Parsé: ${lutRows.length} OTs`);

  const lutResult = await importLutToDb(lutRows, "Butachimie 2026", "Butachimie");
  console.log(`Projet créé: ${lutResult.projectId}`);
  console.log(`Insérés: ${lutResult.inserted}/${lutRows.length}`);
  if (lutResult.errors.length > 0) {
    console.log("Erreurs LUT:", lutResult.errors);
  }

  // 2. Import J&T
  console.log("\n=== IMPORT J&T ===");
  const jtFile = fs.readFileSync(
    path.join(DATA_DIR, "J&T REV E - 20250209 pour correction.xlsm")
  );
  const jtRows = parseJt(jtFile.buffer as ArrayBuffer);
  console.log(`Parsé: ${jtRows.length} brides`);

  const jtResult = await importJtToDb(jtRows, lutResult.projectId);
  console.log(`Insérés: ${jtResult.inserted}/${jtRows.length}`);
  console.log(`Ignorés (pas de lien LUT): ${jtResult.skipped}`);
  if (jtResult.errors.length > 0) {
    console.log("Erreurs J&T:", jtResult.errors);
  }

  console.log("\n=== TERMINÉ ===");
}

main().catch(console.error);
