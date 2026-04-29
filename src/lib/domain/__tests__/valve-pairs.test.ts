import { describe, it, expect } from "vitest";
import { groupIntoValves, getValveFlangeIds, getValveLabel } from "../valve-pairs";
import type { RobFlangeRow, ValvePair } from "@/types/rob";

function row(overrides: Partial<RobFlangeRow>): RobFlangeRow {
  return {
    id: overrides.id ?? "id-default",
    ot_item_id: overrides.ot_item_id ?? "ot-1",
    nom: null,
    zone: null,
    type: null,
    repere_buta: null,
    repere_emis: null,
    operation: null,
    dn_emis: null,
    dn_buta: null,
    pn_emis: null,
    pn_buta: null,
    nb_tiges_emis: null,
    nb_tiges_buta: null,
    matiere_tiges_emis: null,
    matiere_tiges_buta: null,
    matiere_joint_emis: null,
    matiere_joint_buta: null,
    nb_joints_prov_emis: null,
    nb_joints_prov_buta: null,
    nb_joints_prov_retenu: null,
    nb_joints_def_emis: null,
    nb_joints_def_buta: null,
    nb_joints_def_retenu: null,
    responsable: null,
    rondelle_emis: null,
    rondelle_buta: null,
    rondelle_retenu: null,
    commentaires: null,
    num_rob: null,
    rob_side: null,
    ...overrides,
  };
}

describe("groupIntoValves", () => {
  it("ignores rows with null num_rob", () => {
    const rows = [row({ id: "a", num_rob: null }), row({ id: "b", num_rob: "" })];
    expect(groupIntoValves(rows)).toEqual([]);
  });

  it("groups two flanges of the same OT sharing the same num_rob into one valve", () => {
    const rows = [
      row({ id: "a", ot_item_id: "ot-1", num_rob: "V-100", rob_side: "ADM" }),
      row({ id: "b", ot_item_id: "ot-1", num_rob: "V-100", rob_side: "REF" }),
    ];
    const valves = groupIntoValves(rows);
    expect(valves.length).toBe(1);
    expect(valves[0].admission?.id).toBe("a");
    expect(valves[0].refoulement?.id).toBe("b");
  });

  it("does NOT pair across different OTs even with same num_rob", () => {
    const rows = [
      row({ id: "a", ot_item_id: "ot-1", num_rob: "V-100", rob_side: "ADM" }),
      row({ id: "b", ot_item_id: "ot-2", num_rob: "V-100", rob_side: "REF" }),
    ];
    const valves = groupIntoValves(rows);
    expect(valves.length).toBe(2);
    for (const v of valves) {
      const single = v.admission ?? v.refoulement;
      expect(single).not.toBeNull();
    }
  });

  it("solo flange with rob_side='ADM' goes to admission", () => {
    const rows = [row({ id: "a", num_rob: "V-100", rob_side: "ADM" })];
    const [v] = groupIntoValves(rows);
    expect(v.admission?.id).toBe("a");
    expect(v.refoulement).toBeNull();
  });

  it("solo flange with rob_side='REF' goes to refoulement", () => {
    const rows = [row({ id: "a", num_rob: "V-100", rob_side: "REF" })];
    const [v] = groupIntoValves(rows);
    expect(v.admission).toBeNull();
    expect(v.refoulement?.id).toBe("a");
  });

  it("solo flange with null rob_side defaults to admission", () => {
    const rows = [row({ id: "a", num_rob: "V-100", rob_side: null })];
    const [v] = groupIntoValves(rows);
    expect(v.admission?.id).toBe("a");
    expect(v.refoulement).toBeNull();
  });

  it("pair without explicit sides: 1st row → ADM, 2nd → REF", () => {
    const rows = [
      row({ id: "a", num_rob: "V-100", rob_side: null }),
      row({ id: "b", num_rob: "V-100", rob_side: null }),
    ];
    const [v] = groupIntoValves(rows);
    expect(v.admission?.id).toBe("a");
    expect(v.refoulement?.id).toBe("b");
  });

  it("pair with one explicit ADM, one missing → second slot gets the unsided one", () => {
    const rows = [
      row({ id: "a", num_rob: "V-100", rob_side: null }),
      row({ id: "b", num_rob: "V-100", rob_side: "ADM" }),
    ];
    const [v] = groupIntoValves(rows);
    expect(v.admission?.id).toBe("b");
    expect(v.refoulement?.id).toBe("a");
  });

  it("3+ flanges in a group: 1st pair grabs ADM/REF, surplus exposed as solo extras", () => {
    const rows = [
      row({ id: "a", num_rob: "V-100", rob_side: "ADM" }),
      row({ id: "b", num_rob: "V-100", rob_side: "REF" }),
      row({ id: "c", num_rob: "V-100", rob_side: null }),
    ];
    const valves = groupIntoValves(rows);
    expect(valves.length).toBe(2);
    expect(valves[0].admission?.id).toBe("a");
    expect(valves[0].refoulement?.id).toBe("b");
    expect(valves[1].admission?.id).toBe("c");
    expect(valves[1].refoulement).toBeNull();
    expect(valves[1].pairKey).toMatch(/extra-/);
  });

  it("preserves output flange count = input flange count (no duplication, no loss)", () => {
    const rows = [
      row({ id: "a", num_rob: "V-100", rob_side: "ADM" }),
      row({ id: "b", num_rob: "V-100", rob_side: "REF" }),
      row({ id: "c", num_rob: "V-200", rob_side: "ADM" }),
      row({ id: "d", num_rob: "V-200", rob_side: null }),
      row({ id: "e", num_rob: "V-300", rob_side: null }),
    ];
    const valves = groupIntoValves(rows);
    const ids = getValveFlangeIds(valves);
    expect(ids.sort()).toEqual(["a", "b", "c", "d", "e"]);
  });

  it("trims whitespace? — currently does NOT (documented behavior, num_rob='V-1 ' ≠ 'V-1')", () => {
    // Le code actuel ne trim pas num_rob — documenté pour signaler la limite.
    const rows = [
      row({ id: "a", ot_item_id: "ot-1", num_rob: "V-1", rob_side: "ADM" }),
      row({ id: "b", ot_item_id: "ot-1", num_rob: "V-1 ", rob_side: "REF" }),
    ];
    expect(groupIntoValves(rows).length).toBe(2);
  });
});

describe("getValveFlangeIds", () => {
  it("returns flat list of all flange IDs from valves", () => {
    const valves: ValvePair[] = [
      { pairKey: "k1", admission: row({ id: "a" }), refoulement: row({ id: "b" }) },
      { pairKey: "k2", admission: row({ id: "c" }), refoulement: null },
    ];
    expect(getValveFlangeIds(valves)).toEqual(["a", "b", "c"]);
  });

  it("returns empty array for empty input", () => {
    expect(getValveFlangeIds([])).toEqual([]);
  });
});

describe("getValveLabel", () => {
  it("returns '---' when both sides null", () => {
    expect(getValveLabel({ pairKey: "k", admission: null, refoulement: null })).toBe("---");
  });

  it("returns 'nom-rep1 / rep2' when both sides have repere_buta", () => {
    const valve: ValvePair = {
      pairKey: "k",
      admission: row({ id: "a", nom: "VANNE_A", repere_buta: "R1" }),
      refoulement: row({ id: "b", nom: "VANNE_A", repere_buta: "R2" }),
    };
    expect(getValveLabel(valve)).toBe("VANNE_A-R1 / R2");
  });

  it("falls back to repere_emis when repere_buta is missing", () => {
    const valve: ValvePair = {
      pairKey: "k",
      admission: row({ id: "a", nom: "V", repere_buta: null, repere_emis: "E1" }),
      refoulement: row({ id: "b", nom: "V", repere_buta: null, repere_emis: "E2" }),
    };
    expect(getValveLabel(valve)).toBe("V-E1 / E2");
  });

  it("returns 'nom-rep' for solo valve (admission only)", () => {
    const valve: ValvePair = {
      pairKey: "k",
      admission: row({ id: "a", nom: "VANNE_S", repere_buta: "RS" }),
      refoulement: null,
    };
    expect(getValveLabel(valve)).toBe("VANNE_S-RS");
  });

  it("returns 'nom-rep' for solo valve (refoulement only)", () => {
    const valve: ValvePair = {
      pairKey: "k",
      admission: null,
      refoulement: row({ id: "b", nom: "VANNE_S", repere_buta: "RS" }),
    };
    expect(getValveLabel(valve)).toBe("VANNE_S-RS");
  });

  it("returns just nom when no repere is set", () => {
    const valve: ValvePair = {
      pairKey: "k",
      admission: row({ id: "a", nom: "VANNE_X", repere_buta: null, repere_emis: null }),
      refoulement: null,
    };
    expect(getValveLabel(valve)).toBe("VANNE_X");
  });

  it("returns empty string when nom is null and no repere — corner case", () => {
    // Comportement actuel : '' (chaîne vide). Documenté comme finding mineur.
    const valve: ValvePair = {
      pairKey: "k",
      admission: row({ id: "a", nom: null, repere_buta: null, repere_emis: null }),
      refoulement: null,
    };
    expect(getValveLabel(valve)).toBe("");
  });
});
