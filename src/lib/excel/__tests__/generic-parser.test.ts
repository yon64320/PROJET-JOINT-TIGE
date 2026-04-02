import { describe, it, expect } from "vitest";
import * as XLSX from "xlsx";
import { parseWithMapping, readExcelData } from "../generic-parser";
import type { ConfirmedMapping } from "../generic-parser";

/** Create a synthetic XLSX buffer for testing */
function createTestXlsx(data: unknown[][]): ArrayBuffer {
  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.aoa_to_sheet(data);
  XLSX.utils.book_append_sheet(wb, ws, "Sheet1");
  const out = XLSX.write(wb, { type: "array", bookType: "xlsx" });
  return out;
}

describe("readExcelData", () => {
  it("reads rows from synthetic XLSX", () => {
    const data = [
      ["ITEM", "UNITE", "TITRE"],
      ["E-101", "U100", "Test gamme"],
      ["E-102", "U200", "Autre gamme"],
    ];
    const buffer = createTestXlsx(data);
    const result = readExcelData(buffer);
    expect(result.length).toBe(3);
    expect(result[0][0]).toBe("ITEM");
    expect(result[1][0]).toBe("E-101");
  });
});

describe("parseWithMapping", () => {
  it("parses rows with confirmed mapping", () => {
    const data = [
      ["ITEM", "UNITE", "TITRE GAMME"],
      ["E-101", "U100", "Gamme test"],
      ["E-102", "U200", "Autre gamme"],
    ];
    const buffer = createTestXlsx(data);
    const mapping: ConfirmedMapping = {
      fileType: "lut",
      headerRow: 0,
      columnMap: { item: 0, unite: 1, titre_gamme: 2 },
      extraColumns: [],
      primaryKeyField: "item",
      headers: { 0: "ITEM", 1: "UNITE", 2: "TITRE GAMME" },
    };
    const { rows } = parseWithMapping(buffer, mapping);
    expect(rows.length).toBe(2);
    expect(rows[0].item).toBe("E-101");
    expect(rows[0].unite).toBe("U100");
    expect(rows[1].titre_gamme).toBe("Autre gamme");
  });

  it("handles extra columns", () => {
    const data = [
      ["ITEM", "CUSTOM COL"],
      ["E-101", "custom value"],
    ];
    const buffer = createTestXlsx(data);
    const mapping: ConfirmedMapping = {
      fileType: "lut",
      headerRow: 0,
      columnMap: { item: 0 },
      extraColumns: [{ index: 1, header: "CUSTOM COL" }],
      primaryKeyField: "item",
      headers: { 0: "ITEM", 1: "CUSTOM COL" },
    };
    const { rows, extraColumnHeaders } = parseWithMapping(buffer, mapping);
    expect(rows.length).toBe(1);
    expect(rows[0].extra_columns["CUSTOM COL"]).toBe("custom value");
    expect(extraColumnHeaders).toContain("CUSTOM COL");
  });

  it("skips rows without primary key", () => {
    const data = [
      ["ITEM", "UNITE"],
      [null, "U100"],
      ["E-101", "U200"],
    ];
    const buffer = createTestXlsx(data);
    const mapping: ConfirmedMapping = {
      fileType: "lut",
      headerRow: 0,
      columnMap: { item: 0, unite: 1 },
      extraColumns: [],
      primaryKeyField: "item",
      headers: { 0: "ITEM", 1: "UNITE" },
    };
    const { rows } = parseWithMapping(buffer, mapping);
    expect(rows.length).toBe(1);
    expect(rows[0].item).toBe("E-101");
  });

  it("skips Réservation rows in LUT", () => {
    const data = [
      ["ITEM", "UNITE"],
      ["Réservation", "U100"],
      ["E-101", "U200"],
    ];
    const buffer = createTestXlsx(data);
    const mapping: ConfirmedMapping = {
      fileType: "lut",
      headerRow: 0,
      columnMap: { item: 0, unite: 1 },
      extraColumns: [],
      primaryKeyField: "item",
      headers: { 0: "ITEM", 1: "UNITE" },
    };
    const { rows } = parseWithMapping(buffer, mapping);
    expect(rows.length).toBe(1);
  });

  it("handles boolean fields (corps de métier)", () => {
    const data = [
      ["ITEM", "ECHAF"],
      ["E-101", "X"],
      ["E-102", ""],
    ];
    const buffer = createTestXlsx(data);
    const mapping: ConfirmedMapping = {
      fileType: "lut",
      headerRow: 0,
      columnMap: { item: 0, corps_metier_echaf: 1 },
      extraColumns: [],
      primaryKeyField: "item",
      headers: { 0: "ITEM", 1: "ECHAF" },
    };
    const { rows } = parseWithMapping(buffer, mapping);
    expect(rows[0].corps_metier_echaf).toBe(true);
    expect(rows[1].corps_metier_echaf).toBe(false);
  });

  it("filters null values (#REF!, #N/A)", () => {
    const data = [
      ["ITEM", "UNITE"],
      ["E-101", "#REF!"],
    ];
    const buffer = createTestXlsx(data);
    const mapping: ConfirmedMapping = {
      fileType: "lut",
      headerRow: 0,
      columnMap: { item: 0, unite: 1 },
      extraColumns: [],
      primaryKeyField: "item",
      headers: { 0: "ITEM", 1: "UNITE" },
    };
    const { rows } = parseWithMapping(buffer, mapping);
    expect(rows[0].unite).toBeNull();
  });

  it("handles headerRow offset", () => {
    const data = [["Titre du fichier"], ["Date: 2024"], ["ITEM", "UNITE"], ["E-101", "U100"]];
    const buffer = createTestXlsx(data);
    const mapping: ConfirmedMapping = {
      fileType: "lut",
      headerRow: 2,
      columnMap: { item: 0, unite: 1 },
      extraColumns: [],
      primaryKeyField: "item",
      headers: { 0: "ITEM", 1: "UNITE" },
    };
    const { rows } = parseWithMapping(buffer, mapping);
    expect(rows.length).toBe(1);
    expect(rows[0].item).toBe("E-101");
  });
});
