import { describe, it, expect } from "vitest";
import {
  PatchBodySchema,
  ConfirmedMappingSchema,
  FicheTemplateSchema,
  isAllowedExcelMime,
} from "../schemas";

describe("PatchBodySchema", () => {
  it("accepts valid field patch", () => {
    const result = PatchBodySchema.parse({
      id: "550e8400-e29b-41d4-a716-446655440000",
      field: "commentaires",
      value: "test",
    });
    expect(result.id).toBe("550e8400-e29b-41d4-a716-446655440000");
  });

  it("accepts valid extra_field patch", () => {
    const result = PatchBodySchema.parse({
      id: "550e8400-e29b-41d4-a716-446655440000",
      extra_field: "custom",
      value: "hello",
    });
    expect(result.extra_field).toBe("custom");
  });

  it("accepts null value", () => {
    const result = PatchBodySchema.parse({
      id: "550e8400-e29b-41d4-a716-446655440000",
      field: "commentaires",
      value: null,
    });
    expect(result.value).toBeNull();
  });

  it("accepts boolean value", () => {
    const result = PatchBodySchema.parse({
      id: "550e8400-e29b-41d4-a716-446655440000",
      field: "rob",
      value: true,
    });
    expect(result.value).toBe(true);
  });

  it("rejects missing id", () => {
    expect(() => PatchBodySchema.parse({ field: "commentaires", value: "test" })).toThrow();
  });

  it("rejects invalid UUID", () => {
    expect(() => PatchBodySchema.parse({ id: "not-a-uuid", field: "test", value: "x" })).toThrow();
  });

  it("rejects missing field and extra_field", () => {
    expect(() =>
      PatchBodySchema.parse({
        id: "550e8400-e29b-41d4-a716-446655440000",
        value: "test",
      }),
    ).toThrow();
  });
});

describe("ConfirmedMappingSchema", () => {
  const validMapping = {
    fileType: "lut",
    headerRow: 2,
    columnMap: { item: 0, unite: 1 },
    extraColumns: [{ index: 3, header: "CUSTOM" }],
    primaryKeyField: "item",
    headers: { "0": "ITEM", "1": "UNITE" },
  };

  it("accepts valid mapping", () => {
    const result = ConfirmedMappingSchema.parse(validMapping);
    expect(result.fileType).toBe("lut");
  });

  it("rejects invalid fileType", () => {
    expect(() => ConfirmedMappingSchema.parse({ ...validMapping, fileType: "invalid" })).toThrow();
  });

  it("rejects negative headerRow", () => {
    expect(() => ConfirmedMappingSchema.parse({ ...validMapping, headerRow: -1 })).toThrow();
  });

  it("rejects headerRow > 50", () => {
    expect(() => ConfirmedMappingSchema.parse({ ...validMapping, headerRow: 51 })).toThrow();
  });
});

describe("FicheTemplateSchema", () => {
  it("accepts valid template", () => {
    const result = FicheTemplateSchema.parse({
      caracteristiques: ["zone", "type"],
      travaux: ["responsable"],
    });
    expect(result.caracteristiques).toEqual(["zone", "type"]);
  });

  it("accepts empty arrays", () => {
    const result = FicheTemplateSchema.parse({
      caracteristiques: [],
      travaux: [],
    });
    expect(result.caracteristiques).toEqual([]);
  });

  it("strips unknown keys (backward compat)", () => {
    const result = FicheTemplateSchema.parse({
      caracteristiques: ["zone"],
      travaux: [],
      photoPosition: "right",
      blockLayouts: {},
    });
    expect(result.caracteristiques).toEqual(["zone"]);
    expect("photoPosition" in result).toBe(false);
  });
});

describe("isAllowedExcelMime", () => {
  it("accepts .xlsm MIME (camelCase)", () => {
    expect(isAllowedExcelMime("application/vnd.ms-excel.sheet.macroEnabled.12")).toBe(true);
  });
  it("accepts .xlsm MIME (lowercase from browser)", () => {
    expect(isAllowedExcelMime("application/vnd.ms-excel.sheet.macroenabled.12")).toBe(true);
  });
  it("accepts .xlsx MIME", () => {
    expect(
      isAllowedExcelMime("application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"),
    ).toBe(true);
  });
  it("rejects unknown MIME", () => {
    expect(isAllowedExcelMime("text/plain")).toBe(false);
  });
});
