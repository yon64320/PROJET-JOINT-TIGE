import { describe, it, expect } from "vitest";
import { validateTemplate, FIELDS, DEFAULT_TEMPLATE, FIELD_MAP } from "../fiche-rob-fields";

describe("validateTemplate", () => {
  it("validates default template", () => {
    const result = validateTemplate(DEFAULT_TEMPLATE);
    expect(result).toEqual({ valid: true });
  });

  it("rejects unknown field key", () => {
    const tpl = {
      caracteristiques: ["unknown_field"],
      travaux: [],
      photoPosition: "right" as const,
    };
    const result = validateTemplate(tpl);
    expect(result.valid).toBe(false);
    if (!result.valid) {
      expect(result.error).toContain("unknown_field");
    }
  });

  it("rejects duplicate keys across columns", () => {
    const tpl = {
      caracteristiques: ["zone", "type"],
      travaux: ["zone"],
      photoPosition: "right" as const,
    };
    const result = validateTemplate(tpl);
    expect(result.valid).toBe(false);
    if (!result.valid) {
      expect(result.error).toContain("zone");
    }
  });

  it("accepts partial template (subset of fields)", () => {
    const tpl = {
      caracteristiques: ["zone"],
      travaux: ["responsable"],
      photoPosition: "left" as const,
    };
    const result = validateTemplate(tpl);
    expect(result).toEqual({ valid: true });
  });

  it("accepts empty arrays", () => {
    const tpl = {
      caracteristiques: [],
      travaux: [],
      photoPosition: "right" as const,
    };
    const result = validateTemplate(tpl);
    expect(result).toEqual({ valid: true });
  });
});

describe("FIELDS registry", () => {
  it("has 24 fields total", () => {
    expect(FIELDS.length).toBe(24);
  });

  it("has 12 caracteristiques and 12 travaux", () => {
    const carac = FIELDS.filter((f) => f.defaultColumn === "caracteristiques");
    const travaux = FIELDS.filter((f) => f.defaultColumn === "travaux");
    expect(carac.length).toBe(12);
    expect(travaux.length).toBe(12);
  });

  it("FIELD_MAP contains all fields", () => {
    expect(FIELD_MAP.size).toBe(24);
    for (const f of FIELDS) {
      expect(FIELD_MAP.has(f.key)).toBe(true);
    }
  });
});
