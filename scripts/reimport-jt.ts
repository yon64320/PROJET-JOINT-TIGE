/**
 * Script de ré-import du J&T avec le parser corrigé.
 * Conserve "CALO" et "PAS D'INFO" au lieu de les convertir en null.
 *
 * Usage: npx tsx scripts/reimport-jt.ts
 */
import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

import * as fs from "fs";
import * as path from "path";
import { createClient } from "@supabase/supabase-js";
import { parseJt } from "../src/lib/excel/parse-jt";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

const PROJECT_ID = "c2ea274b-68a3-473c-91aa-53233f6bb473";
const JT_FILE = path.resolve(__dirname, "../data/J&T REV E - 20250209 pour correction.xlsm");

async function main() {
  console.log("Lecture du fichier J&T...");
  const buffer = fs.readFileSync(JT_FILE);
  const arrayBuffer = buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength);

  console.log("Parsing...");
  const rows = parseJt(arrayBuffer);
  console.log(`${rows.length} lignes parsées`);

  // Vérifier CALO et PAS D'INFO
  const caloCount = rows.filter((r) => r.dn_emis === "CALO").length;
  const pasInfoDn = rows.filter((r) => r.dn_emis === "PAS D'INFO").length;
  const pasInfoRondelle = rows.filter((r) => r.rondelle === "PAS D'INFO").length;
  const pasInfoFace = rows.filter((r) => r.face_bride === "PAS D'INFO").length;
  console.log(`CALO dans DN: ${caloCount}`);
  console.log(`PAS D'INFO dans DN: ${pasInfoDn}`);
  console.log(`PAS D'INFO dans RONDELLE: ${pasInfoRondelle}`);
  console.log(`PAS D'INFO dans FACE_BRIDE: ${pasInfoFace}`);

  // 1. Archiver les anciennes flanges
  console.log("\nArchivage des anciennes flanges...");
  const { data: oldFlanges } = await supabase
    .from("flanges").select("*").eq("project_id", PROJECT_ID).limit(5000);

  if (oldFlanges && oldFlanges.length > 0) {
    const archiveRecords = oldFlanges.map((f: Record<string, unknown>) => ({
      ...f, archived_reason: "reimport_jt_fix_calo_pasinfo",
    }));
    for (let i = 0; i < archiveRecords.length; i += 100) {
      await supabase.from("flanges_archive").insert(archiveRecords.slice(i, i + 100));
    }
    console.log(`  ${oldFlanges.length} flanges archivées`);
  }

  // 2. Supprimer les anciennes
  await supabase.from("flanges").delete().eq("project_id", PROJECT_ID);
  console.log("  Anciennes flanges supprimées");

  // 3. Charger la map ITEM → ot_item_id
  const { data: otItems } = await supabase
    .from("ot_items").select("id, item").eq("project_id", PROJECT_ID).limit(5000);

  const itemMap = new Map<string, string>();
  for (const ot of otItems ?? []) {
    itemMap.set(ot.item, ot.id);
  }
  console.log(`  ${itemMap.size} OTs trouvés pour le mapping`);

  // 4. Construire les records
  let skipped = 0;
  const records: Record<string, unknown>[] = [];
  for (const row of rows) {
    const otItemId = row.nom ? itemMap.get(row.nom) : undefined;
    if (!otItemId) { skipped++; continue; }
    records.push({
      project_id: PROJECT_ID,
      ot_item_id: otItemId,
      ...row,
    });
  }

  // 5. Insérer par batch
  let inserted = 0;
  const BATCH_SIZE = 50;
  for (let i = 0; i < records.length; i += BATCH_SIZE) {
    const batch = records.slice(i, i + BATCH_SIZE);
    const { error } = await supabase.from("flanges").insert(batch);
    if (error) {
      console.error(`  Erreur batch ${i}: ${error.message}`);
    } else {
      inserted += batch.length;
    }
  }

  console.log(`\nRésultat:`);
  console.log(`  Insérées: ${inserted}`);
  console.log(`  Ignorées: ${skipped}`);

  // 6. Vérification en base
  const { count: caloInDb } = await supabase
    .from("flanges").select("*", { count: "exact", head: true })
    .eq("project_id", PROJECT_ID).eq("dn_emis", "CALO");
  const { count: pasInfoInDb } = await supabase
    .from("flanges").select("*", { count: "exact", head: true })
    .eq("project_id", PROJECT_ID).eq("rondelle", "PAS D'INFO");

  console.log(`\nVérification en base:`);
  console.log(`  CALO dans dn_emis: ${caloInDb}`);
  console.log(`  PAS D'INFO dans rondelle: ${pasInfoInDb}`);
}

main().catch(console.error);
