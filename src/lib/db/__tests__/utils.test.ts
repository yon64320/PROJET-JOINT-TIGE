import { describe, it, expect } from "vitest";
import { getStr, getBool, getNumeric, getInteger } from "../utils";

describe("getStr", () => {
  it("returns string value", () => {
    expect(getStr({ a: "hello" }, "a")).toBe("hello");
  });
  it("returns null for undefined", () => {
    expect(getStr({}, "a")).toBeNull();
  });
  it("returns null for null", () => {
    expect(getStr({ a: null }, "a")).toBeNull();
  });
  it("returns null for empty string", () => {
    expect(getStr({ a: "" }, "a")).toBeNull();
  });
  it("converts number to string", () => {
    expect(getStr({ a: 42 }, "a")).toBe("42");
  });
});

describe("getBool", () => {
  it("returns true for boolean true", () => {
    expect(getBool({ a: true }, "a")).toBe(true);
  });
  it("returns true for 'X'", () => {
    expect(getBool({ a: "X" }, "a")).toBe(true);
  });
  it("returns true for 'x' (case-insensitive)", () => {
    expect(getBool({ a: "x" }, "a")).toBe(true);
  });
  it("returns true for 'OUI'", () => {
    expect(getBool({ a: "OUI" }, "a")).toBe(true);
  });
  it("returns true for 'O'", () => {
    expect(getBool({ a: "O" }, "a")).toBe(true);
  });
  it("returns false for undefined", () => {
    expect(getBool({}, "a")).toBe(false);
  });
  it("returns false for null", () => {
    expect(getBool({ a: null }, "a")).toBe(false);
  });
  it("returns false for empty string", () => {
    expect(getBool({ a: "" }, "a")).toBe(false);
  });
  it("returns false for 'NON'", () => {
    expect(getBool({ a: "NON" }, "a")).toBe(false);
  });
});

describe("getNumeric", () => {
  it("returns number for numeric string", () => {
    expect(getNumeric({ a: "42.5" }, "a")).toBe(42.5);
  });
  it("returns number for actual number", () => {
    expect(getNumeric({ a: 150 }, "a")).toBe(150);
  });
  it("returns null for 'CALO'", () => {
    expect(getNumeric({ a: "CALO" }, "a")).toBeNull();
  });
  it("returns null for 'PAS D\\'INFO'", () => {
    expect(getNumeric({ a: "PAS D'INFO" }, "a")).toBeNull();
  });
  it("returns null for undefined", () => {
    expect(getNumeric({}, "a")).toBeNull();
  });
  it("returns null for null", () => {
    expect(getNumeric({ a: null }, "a")).toBeNull();
  });
  it("returns null for empty string", () => {
    expect(getNumeric({ a: "" }, "a")).toBeNull();
  });
  it("returns 0 for '0'", () => {
    expect(getNumeric({ a: "0" }, "a")).toBe(0);
  });
});

describe("getInteger", () => {
  it("rounds to nearest integer", () => {
    expect(getInteger({ a: 4.7 }, "a")).toBe(5);
  });
  it("returns integer for integer input", () => {
    expect(getInteger({ a: 4 }, "a")).toBe(4);
  });
  it("returns null for text", () => {
    expect(getInteger({ a: "CALO" }, "a")).toBeNull();
  });
  it("rounds string numbers", () => {
    expect(getInteger({ a: "3.2" }, "a")).toBe(3);
  });
});
