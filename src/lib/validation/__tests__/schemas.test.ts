import { describe, it, expect } from "vitest";
import {
  PatchBodySchema,
  ConfirmedMappingSchema,
  FicheTemplateSchema,
  ALLOWED_EXCEL_MIMES,
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
      photoPosition: "left",
    });
    expect(result.photoPosition).toBe("left");
  });

  it("defaults photoPosition to right", () => {
    const result = FicheTemplateSchema.parse({
      caracteristiques: [],
      travaux: [],
    });
    expect(result.photoPosition).toBe("right");
  });

  it("rejects invalid photoPosition", () => {
    expect(() =>
      FicheTemplateSchema.parse({
        caracteristiques: [],
        travaux: [],
        photoPosition: "center",
      }),
    ).toThrow();
  });
});

describe("ALLOWED_EXCEL_MIMES", () => {
  it("includes .xlsm MIME", () => {
    expect(ALLOWED_EXCEL_MIMES.has("application/vnd.ms-excel.sheet.macroEnabled.12")).toBe(true);
  });
  it("includes .xlsx MIME", () => {
    expect(
      ALLOWED_EXCEL_MIMES.has("application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"),
    ).toBe(true);
  });
});
