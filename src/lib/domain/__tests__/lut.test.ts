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
});
