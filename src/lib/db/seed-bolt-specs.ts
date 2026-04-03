/**
 * Seed script for bolt_specs table.
 * Parses the "Tiges" sheet from the J&T Excel file.
 *
 * Usage: npx tsx src/lib/db/seed-bolt-specs.ts
 */
import * as XLSX from "xlsx";
import { createClient } from "@supabase/supabase-js";
import * as path from "path";
import * as fs from "fs";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

interface BoltRow {
  face_type: "RF" | "RTJ";
  dn: number;
  pn: string;
  dn_pn_key: string | null;
  nb_tiges: number;
  designation_tige: string | null;
  diametre_tige: number;
  longueur_tige: number | null;
  cle: number | null;
}

function parseNumeric(val: unknown): number | null {
  if (val == null || val === "" || val === "-") return null;
  const n = Number(val);
  return isNaN(n) ? null : n;
}

function parseBlock(
  sheet: XLSX.WorkSheet,
  faceType: "RF" | "RTJ",
  startRow: number,
  endRow: number,
  colOffset: number,
): BoltRow[] {
  const rows: BoltRow[] = [];

  for (let r = startRow; r <= endRow; r++) {
    const dnCell = sheet[XLSX.utils.encode_cell({ r, c: colOffset + 0 })];
    const pnCell = sheet[XLSX.utils.encode_cell({ r, c: colOffset + 1 })];
    const keyCell = sheet[XLSX.utils.encode_cell({ r, c: colOffset + 2 })];
    const nbCell = sheet[XLSX.utils.encode_cell({ r, c: colOffset + 3 })];
    const desigCell = sheet[XLSX.utils.encode_cell({ r, c: colOffset + 4 })];
    const diamCell = sheet[XLSX.utils.encode_cell({ r, c: colOffset + 5 })];
    const longCell = sheet[XLSX.utils.encode_cell({ r, c: colOffset + 6 })];
    const cleCell = sheet[XLSX.utils.encode_cell({ r, c: colOffset + 7 })];

    const dn = parseNumeric(dnCell?.v);
    const pnVal = pnCell?.v;
    const nbTiges = parseNumeric(nbCell?.v);
    const diamTige = parseNumeric(diamCell?.v);

    // Skip empty or incomplete rows
    if (dn == null || pnVal == null || nbTiges == null || diamTige == null) continue;
    // Skip rows with "-" as nb_tiges (threaded connections, no bolts)
    if (nbCell?.v === "-") continue;

    const pn = String(pnVal);
    const desig = desigCell?.v ? String(desigCell.v).trim() : null;
    // Skip malformed designations like "M  x "
    const designation = desig && desig !== "M  x " ? desig : null;

    rows.push({
      face_type: faceType,
      dn,
      pn,
      dn_pn_key: keyCell?.v ? String(keyCell.v) : null,
      nb_tiges: nbTiges,
      designation_tige: designation,
      diametre_tige: diamTige,
      longueur_tige: parseNumeric(longCell?.v),
      cle: parseNumeric(cleCell?.v),
    });
  }

  return rows;
}

async function main() {
  // Find the J&T file
  const dataDir = path.join(process.cwd(), "data");
  const files = fs.readdirSync(dataDir);
  const jtFile = files.find((f) => f.includes("J&T") && f.endsWith(".xlsm"));
  if (!jtFile) {
    console.error("No J&T .xlsm file found in data/");
    process.exit(1);
  }

  console.log(`Parsing ${jtFile}...`);
  const wb = XLSX.readFile(path.join(dataDir, jtFile));

  const tigesSheet = wb.Sheets["Tiges"];
  if (!tigesSheet) {
    console.error('Sheet "Tiges" not found. Available:', wb.SheetNames);
    process.exit(1);
  }

  const allRows: BoltRow[] = [];

  // RF block: columns B-I (1-8), rows 4-53 (0-indexed: 3-52)
  allRows.push(...parseBlock(tigesSheet, "RF", 3, 52, 1));
  // RF ASME/grands DN: rows 54-79 and 87-102 (0-indexed: 53-78, 86-101)
  allRows.push(...parseBlock(tigesSheet, "RF", 53, 78, 1));
  allRows.push(...parseBlock(tigesSheet, "RF", 86, 101, 1));

  // RTJ block: columns K-R (10-17), rows 4-53 (0-indexed: 3-52)
  allRows.push(...parseBlock(tigesSheet, "RTJ", 3, 52, 10));
  // RTJ ASME/grands DN: same rows as RF
  allRows.push(...parseBlock(tigesSheet, "RTJ", 53, 78, 10));
  allRows.push(...parseBlock(tigesSheet, "RTJ", 86, 101, 10));

  console.log(`Parsed ${allRows.length} bolt specs`);

  if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
    // Dry run: output as JSON
    console.log("No Supabase credentials. Outputting JSON to stdout.");
    console.log(JSON.stringify(allRows, null, 2));
    return;
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

  // Upsert in batches of 50
  const BATCH_SIZE = 50;
  let inserted = 0;
  for (let i = 0; i < allRows.length; i += BATCH_SIZE) {
    const batch = allRows.slice(i, i + BATCH_SIZE);
    const { error } = await supabase.from("bolt_specs").upsert(batch, {
      onConflict: "face_type,dn,pn",
    });
    if (error) {
      console.error(`Error at batch ${i}:`, error.message);
    } else {
      inserted += batch.length;
    }
  }

  console.log(`Inserted/updated ${inserted} bolt specs`);
}

main().catch(console.error);
