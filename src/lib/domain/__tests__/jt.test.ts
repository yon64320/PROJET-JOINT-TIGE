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
});
