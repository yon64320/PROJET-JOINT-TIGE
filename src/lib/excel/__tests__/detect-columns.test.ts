import { describe, it, expect } from "vitest";
import {
  normalizeHeader,
  detectHeaderRow,
  matchColumns,
  computeFingerprint,
  mergeSynonyms,
} from "../detect-columns";

describe("normalizeHeader", () => {
  it("lowercases", () => {
    expect(normalizeHeader("HELLO")).toBe("hello");
  });
  it("removes accents", () => {
    expect(normalizeHeader("DN RELEVÉ ÉMIS")).toBe("dn releve emis");
  });
  it("replaces punctuation with spaces", () => {
    expect(normalizeHeader("FOURN.")).toBe("fourn");
  });
  it("collapses whitespace", () => {
    expect(normalizeHeader("  DN   EMIS  ")).toBe("dn emis");
  });
  it("handles empty string", () => {
    expect(normalizeHeader("")).toBe("");
  });
  it("handles special chars", () => {
    expect(normalizeHeader("N° ÉQUIPEMENT")).toBe("n equipement");
  });
});

describe("detectHeaderRow", () => {
  it("detects header row with known LUT synonyms", () => {
    const data = [
      ["Titre du fichier", null, null],
      ["Date:", "2024-01-01", null],
      ["UNITE", "ITEM", "TITRE GAMME", "FAMILLE ITEM", "TYPE ITEM"],
      ["U100", "E-101", "Gamme test", "Equipement", "Colonne"],
    ];
    const result = detectHeaderRow(data, "lut");
    expect(result.rowIndex).toBe(2);
    expect(result.confidence).toBeGreaterThan(0);
    expect(result.headers).toContain("UNITE");
  });

  it("detects header row for JT", () => {
    const data = [
      ["Fichier J&T", null],
      ["NOM", "ZONE", "DN", "PN", "OPERATION"],
      ["E-101", "U100", "150", "16", "JC"],
    ];
    const result = detectHeaderRow(data, "jt");
    expect(result.rowIndex).toBe(1);
    expect(result.confidence).toBeGreaterThan(0);
  });

  it("returns row 0 if no good match", () => {
    const data = [
      ["random", "data", "here"],
      ["more", "random", "stuff"],
    ];
    const result = detectHeaderRow(data, "lut");
    expect(result.rowIndex).toBe(0);
  });
});

describe("matchColumns", () => {
  it("exact matches known headers", () => {
    const headers = ["UNITE", "ITEM", "TITRE GAMME", "COMMENTAIRES"];
    const { matched, unmatched } = matchColumns(headers, "lut");
    expect(matched.length).toBe(4);
    expect(unmatched.length).toBe(0);
    expect(matched.find((m) => m.dbField === "unite")?.confidence).toBe(1.0);
  });

  it("fuzzy matches via inclusion", () => {
    const headers = ["DN RELEVE EMIS"];
    const { matched } = matchColumns(headers, "jt");
    // "DN RELEVE" or "DN EMIS" should match dn_emis
    expect(matched.length).toBeGreaterThanOrEqual(1);
    if (matched.length > 0) {
      expect(matched[0].confidence).toBeGreaterThan(0);
    }
  });

  it("puts unknown columns in unmatched", () => {
    const headers = ["UNITE", "COLONNE CUSTOM INCONNUE"];
    const { matched, unmatched } = matchColumns(headers, "lut");
    expect(matched.some((m) => m.dbField === "unite")).toBe(true);
    expect(unmatched.some((u) => u.excelHeader === "COLONNE CUSTOM INCONNUE")).toBe(true);
  });

  it("handles empty headers", () => {
    const headers = ["", "ITEM", ""];
    const { matched, unmatched } = matchColumns(headers, "lut");
    expect(matched.some((m) => m.dbField === "item")).toBe(true);
    expect(unmatched.length).toBe(2); // 2 empty headers
  });
});

describe("computeFingerprint", () => {
  it("normalizes, sorts and joins", () => {
    const fp = computeFingerprint(["ITEM", "UNITE", "DN ÉMIS"]);
    expect(fp).toBe("dn emis|item|unite");
  });
  it("filters empty strings", () => {
    const fp = computeFingerprint(["", "ITEM", ""]);
    expect(fp).toBe("item");
  });
});

describe("mergeSynonyms", () => {
  it("returns builtin synonyms when no learned", () => {
    const syns = mergeSynonyms("lut");
    expect(syns.item).toContain("ITEM");
    expect(syns.unite).toContain("UNITE");
  });
  it("merges learned synonyms", () => {
    const learned = new Map([["item", ["TAG CUSTOM"]]]);
    const syns = mergeSynonyms("lut", learned);
    expect(syns.item).toContain("TAG CUSTOM");
    expect(syns.item).toContain("ITEM"); // builtin preserved
  });
  it("adds new fields from learned", () => {
    const learned = new Map([["new_field", ["NEW HEADER"]]]);
    const syns = mergeSynonyms("lut", learned);
    expect(syns.new_field).toContain("NEW HEADER");
  });
});
