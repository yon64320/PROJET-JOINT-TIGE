import { describe, it, expect } from "vitest";
import { OPERATIONS_TABLE, getOperationQuantities } from "../operations";

describe("OPERATIONS_TABLE", () => {
  it("contains 28 unique operations extracted from J&T REV E", () => {
    expect(OPERATIONS_TABLE.length).toBe(28);
  });

  it("operation_type values are unique (no duplicate after Excel dedup)", () => {
    const types = OPERATIONS_TABLE.map((o) => o.operation_type);
    expect(new Set(types).size).toBe(types.length);
  });

  it("all quantities are non-negative integers", () => {
    for (const op of OPERATIONS_TABLE) {
      expect(Number.isInteger(op.nb_jp)).toBe(true);
      expect(Number.isInteger(op.nb_bp)).toBe(true);
      expect(Number.isInteger(op.nb_joints_prov)).toBe(true);
      expect(Number.isInteger(op.nb_joints_def)).toBe(true);
      expect(op.nb_jp).toBeGreaterThanOrEqual(0);
      expect(op.nb_bp).toBeGreaterThanOrEqual(0);
      expect(op.nb_joints_prov).toBeGreaterThanOrEqual(0);
      expect(op.nb_joints_def).toBeGreaterThanOrEqual(0);
    }
  });

  it("operation_type strings are trimmed (no leading/trailing whitespace)", () => {
    for (const op of OPERATIONS_TABLE) {
      expect(op.operation_type).toBe(op.operation_type.trim());
    }
  });
});

describe("getOperationQuantities", () => {
  it("finds simple 'DECONNEXION/RECONNEXION' (1 joint def only)", () => {
    expect(getOperationQuantities("DECONNEXION/RECONNEXION")).toEqual({
      nb_jp: 0,
      nb_bp: 0,
      nb_joints_prov: 0,
      nb_joints_def: 1,
    });
  });

  it("finds 'POSE/DEPOSE JP' (1 JP, 2 prov, 1 def)", () => {
    expect(getOperationQuantities("POSE/DEPOSE JP")).toEqual({
      nb_jp: 1,
      nb_bp: 0,
      nb_joints_prov: 2,
      nb_joints_def: 1,
    });
  });

  it("finds 'OUVERTURE TH' (1 joint def only)", () => {
    expect(getOperationQuantities("OUVERTURE TH")).toEqual({
      nb_jp: 0,
      nb_bp: 0,
      nb_joints_prov: 0,
      nb_joints_def: 1,
    });
  });

  it("returns null for unknown operation", () => {
    expect(getOperationQuantities("OPERATION_INEXISTANTE")).toBeNull();
  });

  it("returns null for empty string", () => {
    expect(getOperationQuantities("")).toBeNull();
  });

  it("returns null for whitespace-only string", () => {
    expect(getOperationQuantities("   ")).toBeNull();
  });

  it("returns null for null input", () => {
    expect(getOperationQuantities(null)).toBeNull();
  });

  it("returns null for undefined input", () => {
    expect(getOperationQuantities(undefined)).toBeNull();
  });

  it("normalizes leading/trailing whitespace", () => {
    expect(getOperationQuantities("  DECONNEXION/RECONNEXION  ")).toEqual({
      nb_jp: 0,
      nb_bp: 0,
      nb_joints_prov: 0,
      nb_joints_def: 1,
    });
  });

  it("normalizes lowercase input", () => {
    expect(getOperationQuantities("deconnexion/reconnexion")).toEqual({
      nb_jp: 0,
      nb_bp: 0,
      nb_joints_prov: 0,
      nb_joints_def: 1,
    });
  });

  it("normalizes mixed case input", () => {
    expect(getOperationQuantities("Deconnexion/Reconnexion")).toEqual({
      nb_jp: 0,
      nb_bp: 0,
      nb_joints_prov: 0,
      nb_joints_def: 1,
    });
  });

  it("returns null for the parasite saisie '+' seen in the J&T", () => {
    // Saisie utilisateur dégradée — finding F-002 de l'audit correctness.
    expect(getOperationQuantities("+")).toBeNull();
  });

  it("returns null for 'Non trouvé' (saisie dégradée)", () => {
    expect(getOperationQuantities("Non trouvé")).toBeNull();
  });

  it("returns null for an operation used in the J&T but missing from the table ('DEPOSE BOUCHON')", () => {
    expect(getOperationQuantities("DEPOSE BOUCHON")).toBeNull();
  });
});
