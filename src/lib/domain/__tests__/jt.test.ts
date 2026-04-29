import { describe, it, expect } from "vitest";
import { computeRetenu, hasDelta } from "../jt";

describe("computeRetenu", () => {
  it("returns emis when both exist (terrain prime)", () => {
    expect(computeRetenu("150", "200")).toBe("150");
  });
  it("returns buta when emis is null", () => {
    expect(computeRetenu(null, "200")).toBe("200");
  });
  it("returns emis when buta is null", () => {
    expect(computeRetenu("150", null)).toBe("150");
  });
  it("returns null when both null", () => {
    expect(computeRetenu(null, null)).toBeNull();
  });
});

describe("hasDelta", () => {
  it("returns true when numbers differ", () => {
    expect(hasDelta("150", "200")).toBe(true);
  });
  it("returns false when numbers are equal", () => {
    expect(hasDelta("150", "150")).toBe(false);
  });
  it("returns false when emis is null", () => {
    expect(hasDelta(null, "200")).toBe(false);
  });
  it("returns false when buta is null", () => {
    expect(hasDelta("150", null)).toBe(false);
  });
  it("returns false when emis is 'CALO' (NaN)", () => {
    expect(hasDelta("CALO", "150")).toBe(false);
  });
  it("returns false when buta is 'PAS D\\'INFO'", () => {
    expect(hasDelta("150", "PAS D'INFO")).toBe(false);
  });
  it("returns false when both are NaN text", () => {
    expect(hasDelta("CALO", "PAS D'INFO")).toBe(false);
  });
  it("returns true for different decimal numbers", () => {
    expect(hasDelta("1.5", "2.5")).toBe(true);
  });

  // --- Edge cases identifiés par l'audit correctness ---

  it("handles whitespace around numeric values (Number trims them)", () => {
    expect(hasDelta(" 100 ", "100")).toBe(false);
  });

  it("treats empty string as 0 (Number('') === 0) — documented behavior", () => {
    // Number("") === 0, Number("0") === 0, donc pas de delta — comportement actuel.
    expect(hasDelta("", "0")).toBe(false);
  });

  it("MED-03 — French decimal '100,5' is normalized before comparison", () => {
    // Apres MED-03 : `,` est remplace par `.` avant Number(). Les deux valeurs
    // representent le meme nombre → pas de delta.
    expect(hasDelta("100.5", "100,5")).toBe(false);
  });

  it("MED-03 — French decimal differs from another number → delta detected", () => {
    // "100" vs "200,5" → 100 vs 200.5 → vrai delta.
    expect(hasDelta("100", "200,5")).toBe(true);
  });

  it("handles values with trailing units (mm, bar) as NaN → no delta", () => {
    expect(hasDelta("100", "100 mm")).toBe(false);
  });
});

describe("computeRetenu — edge cases (audit correctness)", () => {
  it("MED-04 — empty string EMIS falls back to BUTA", () => {
    // Apres MED-04 : "" est considere comme absent, le fallback BUTA s'applique.
    expect(computeRetenu("", "200")).toBe("200");
  });

  it("MED-04 — whitespace-only EMIS falls back to BUTA", () => {
    expect(computeRetenu("   ", "200")).toBe("200");
  });

  it("string 'null' (literal) is treated as a value, not as null", () => {
    expect(computeRetenu("null", "200")).toBe("null");
  });

  it("'PAS D\\'INFO' from EMIS is preserved (not collapsed to BUTA)", () => {
    expect(computeRetenu("PAS D'INFO", "100")).toBe("PAS D'INFO");
  });

  it("MED-04 — '0' is preserved (not falsy in metier context)", () => {
    // Trim de "0" reste "0" qui est truthy → on garde la valeur EMIS.
    expect(computeRetenu("0", "5")).toBe("0");
  });

  it("MED-04 — leading/trailing spaces preserved if non-empty after trim", () => {
    // Le contenu original est preserve (pas de trim cote retour).
    expect(computeRetenu("  150  ", "200")).toBe("  150  ");
  });
});
