/**
 * Prompts CLI interactifs pour le script gammes-to-lut.
 * Wrappent @inquirer/prompts en gardant la logique de pré-sélection
 * (heuristique regex sur les noms d'en-têtes) localisée dans ce module.
 */

import { checkbox, confirm, input, select } from "@inquirer/prompts";
import * as XLSX from "xlsx";
import type {
  ColumnMapping,
  HeaderDetection,
  SheetInfo,
} from "../../src/lib/import/gammes/parse-gammes";
import type { AggregateStats } from "../../src/lib/import/gammes/aggregate-items";

const ITEM_PATTERNS = [/^item$/i, /n.{0,2}item/i, /^numero.*item$/i];
const CORPS_PATTERNS = [/corps.*m.*tier/i, /^corps$/i, /^trade$/i, /^discipline$/i];
const TITRE_PATTERNS = [/lib.*ll.*ot/i, /^titre/i, /intitul/i, /designation/i];

function colLetter(idx: number): string {
  return XLSX.utils.encode_col(idx);
}

function normalize(s: string): string {
  return s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().trim();
}

function findBestMatch(headers: readonly string[], patterns: readonly RegExp[]): number | null {
  for (let i = 0; i < headers.length; i++) {
    const h = normalize(headers[i] ?? "");
    if (h && patterns.some((p) => p.test(h))) return i;
  }
  return null;
}

export async function selectGammesFile(candidates: readonly string[]): Promise<string> {
  if (candidates.length === 0) {
    return await input({ message: "Chemin du fichier Gammes (.xlsx ou .xlsm) :" });
  }
  const choice = await select({
    message: "Quel fichier Gammes traiter ?",
    choices: [
      ...candidates.map((path) => ({ name: path, value: path })),
      { name: "Autre chemin (saisie manuelle)", value: "__manual__" },
    ],
  });
  if (choice === "__manual__") {
    return await input({ message: "Chemin du fichier :" });
  }
  return choice;
}

export async function selectSheet(sheets: readonly SheetInfo[]): Promise<string> {
  if (sheets.length === 1) return sheets[0].name;
  const otSheet = sheets.find((s) => /^ot/i.test(s.name));
  const biggest = [...sheets].sort((a, b) => b.rowCount - a.rowCount)[0];
  const def = otSheet?.name ?? biggest.name;
  return await select({
    message: "Quelle feuille contient les gammes ?",
    choices: sheets.map((s) => ({
      name: `${s.name} (${s.rowCount} lignes × ${s.colCount} cols)`,
      value: s.name,
    })),
    default: def,
  });
}

export async function confirmHeaderRow(detection: HeaderDetection | null): Promise<number> {
  const detectedLine = detection ? detection.rowIdx + 1 : 1;
  const previewLabels = detection
    ? detection.headers
        .filter((h) => h && h.length < 40)
        .slice(0, 5)
        .join(" | ")
    : "(aucune détection)";
  const ok = await confirm({
    message: `Ligne d'en-tête détectée : ${detectedLine} — "${previewLabels}". Correct ?`,
    default: true,
  });
  if (ok) return detectedLine - 1;
  const raw = await input({
    message: "Numéro de ligne d'en-tête (1-based) :",
    default: String(detectedLine),
    validate: (v): true | string => {
      const n = Number(v);
      return Number.isInteger(n) && n >= 1 ? true : "Entier ≥ 1 requis";
    },
  });
  return Number(raw) - 1;
}

interface ColumnChoice {
  name: string;
  value: number;
}

function buildColumnChoices(headers: readonly string[]): ColumnChoice[] {
  return headers.map((h, i) => ({
    name: `${colLetter(i)} — "${h || "(vide)"}"`,
    value: i,
  }));
}

export async function mapColumns(headers: readonly string[]): Promise<ColumnMapping> {
  const choices = buildColumnChoices(headers);

  const itemDefault = findBestMatch(headers, ITEM_PATTERNS);
  const itemColIdx = await select({
    message: "Quelle colonne contient l'ITEM ? (obligatoire)",
    choices,
    ...(itemDefault !== null && { default: itemDefault }),
  });

  const corpsDefault = findBestMatch(headers, CORPS_PATTERNS);
  const corpsColIdx = await select({
    message: "Quelle colonne contient le CORPS DE MÉTIER ? (obligatoire)",
    choices: choices.filter((c) => c.value !== itemColIdx),
    ...(corpsDefault !== null && corpsDefault !== itemColIdx && { default: corpsDefault }),
  });

  const titreDefault = findBestMatch(headers, TITRE_PATTERNS);
  const titreColIdx = await select<number | null>({
    message: "Quelle colonne contient le TITRE DE GAMME ? (optionnel)",
    choices: [
      { name: "Aucune (laisser vide dans la LUT)", value: null },
      ...choices.filter((c) => c.value !== itemColIdx && c.value !== corpsColIdx),
    ],
    default:
      titreDefault !== null && titreDefault !== itemColIdx && titreDefault !== corpsColIdx
        ? titreDefault
        : null,
  });

  return { itemColIdx, corpsColIdx, titreColIdx };
}

export async function selectEmisCorps(allCorps: readonly string[]): Promise<Set<string>> {
  if (allCorps.length === 0) {
    throw new Error("Aucun corps de métier trouvé dans la colonne sélectionnée");
  }
  const picks = await checkbox({
    message: `Sélectionne les corps de métier EMIS (${allCorps.length} codes distincts trouvés) :`,
    choices: allCorps.map((c) => ({ name: c, value: c })),
    pageSize: Math.min(allCorps.length, 20),
    required: true,
  });
  return new Set(picks);
}

export interface RecapInput {
  stats: AggregateStats;
  emisSelection: ReadonlySet<string>;
  outputPath: string;
}

export async function confirmRecap({
  stats,
  emisSelection,
  outputPath,
}: RecapInput): Promise<boolean> {
  const corpsList = [...emisSelection].sort().join(", ");
  console.log("\n— Récapitulatif —");
  console.log(`  Items distincts        : ${stats.totalItems}`);
  console.log(`  Concernés EMIS         : ${stats.concernedCount}`);
  console.log(`  Marqués NC             : ${stats.ncCount}`);
  console.log(`  Corps EMIS sélectionnés: ${corpsList}`);
  console.log(`  Fichier de sortie      : ${outputPath}\n`);
  return await confirm({ message: "Générer la LUT ?", default: true });
}
