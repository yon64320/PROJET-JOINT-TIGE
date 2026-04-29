import { describe, it, expect } from "vitest";
import { parseCorpsDeMetier } from "../lut";

describe("parseCorpsDeMetier", () => {
  it("parses all X values as true", () => {
    const result = parseCorpsDeMetier(["X", "X", "X", "X", "X", "X", "X"]);
    expect(result).toEqual({
      echafaudage: true,
      calorifuge: true,
      montage: true,
      metal: true,
      fourniture: true,
      nettoyage: true,
      autres: true,
    });
  });

  it("parses all null values as false", () => {
    const result = parseCorpsDeMetier([null, null, null, null, null, null, null]);
    expect(result).toEqual({
      echafaudage: false,
      calorifuge: false,
      montage: false,
      metal: false,
      fourniture: false,
      nettoyage: false,
      autres: false,
    });
  });

  it("handles mixed values", () => {
    const result = parseCorpsDeMetier(["X", null, "x", null, "X", null, null]);
    expect(result.echafaudage).toBe(true);
    expect(result.calorifuge).toBe(false);
    expect(result.montage).toBe(true);
    expect(result.metal).toBe(false);
    expect(result.fourniture).toBe(true);
    expect(result.nettoyage).toBe(false);
    expect(result.autres).toBe(false);
  });

  it("is case-insensitive", () => {
    const result = parseCorpsDeMetier(["x", "X", null, null, null, null, null]);
    expect(result.echafaudage).toBe(true);
    expect(result.calorifuge).toBe(true);
  });

  it("handles empty array by treating missing as null", () => {
    const result = parseCorpsDeMetier([]);
    expect(result.echafaudage).toBe(false);
  });

  // --- Edge cases identifiés par l'audit correctness (FINDING F-007) ---

  it("FINDING F-007 — does NOT trim leading/trailing whitespace (' X ' → false)", () => {
    // Comportement actuel : pas de .trim() dans isChecked. Verrouille le comportement
    // pour signaler la limite — arbitrage produit nécessaire si Excel produit des
    // cellules avec espaces autour du X.
    const result = parseCorpsDeMetier([" X ", null, null, null, null, null, null]);
    expect(result.echafaudage).toBe(false);
  });

  it("treats empty string as not checked", () => {
    const result = parseCorpsDeMetier(["", null, null, null, null, null, null]);
    expect(result.echafaudage).toBe(false);
  });

  it("does NOT accept '✓' as checked (only X/x)", () => {
    const result = parseCorpsDeMetier(["✓", null, null, null, null, null, null]);
    expect(result.echafaudage).toBe(false);
  });

  it("does NOT accept '1' or 'oui' as checked", () => {
    const result1 = parseCorpsDeMetier(["1", null, null, null, null, null, null]);
    const result2 = parseCorpsDeMetier(["oui", null, null, null, null, null, null]);
    expect(result1.echafaudage).toBe(false);
    expect(result2.echafaudage).toBe(false);
  });

  it("'X.' (with trailing punctuation) is NOT treated as checked", () => {
    const result = parseCorpsDeMetier(["X.", null, null, null, null, null, null]);
    expect(result.echafaudage).toBe(false);
  });
});
