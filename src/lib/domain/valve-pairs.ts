import type { RobFlangeRow, ValvePair } from "@/types/rob";

/**
 * Groupe les brides rob en vannes (paires ADM/REF).
 * - Brides avec rob_pair_id → groupées par paire
 * - Brides sans rob_pair_id → vanne solo (1 bride = 1 vanne)
 */
export function groupIntoValves(rows: RobFlangeRow[]): ValvePair[] {
  const pairMap = new Map<string, { adm: RobFlangeRow | null; ref: RobFlangeRow | null }>();
  const solos: RobFlangeRow[] = [];

  for (const row of rows) {
    if (row.rob_pair_id) {
      const existing = pairMap.get(row.rob_pair_id) ?? { adm: null, ref: null };
      if (row.rob_side === "ADM") {
        existing.adm = row;
      } else if (row.rob_side === "REF") {
        existing.ref = row;
      } else {
        // Side not set yet — put in ADM by default
        existing.adm = existing.adm ?? row;
      }
      pairMap.set(row.rob_pair_id, existing);
    } else {
      solos.push(row);
    }
  }

  const valves: ValvePair[] = [];

  // Paired valves
  for (const [pairId, pair] of pairMap) {
    valves.push({
      pairId,
      admission: pair.adm,
      refoulement: pair.ref,
    });
  }

  // Solo valves (no pair)
  for (const row of solos) {
    valves.push({
      pairId: row.id,
      admission: row,
      refoulement: null,
    });
  }

  return valves;
}

/** Get all flange IDs from a set of valve pairs */
export function getValveFlangeIds(valves: ValvePair[]): string[] {
  const ids: string[] = [];
  for (const v of valves) {
    if (v.admission) ids.push(v.admission.id);
    if (v.refoulement) ids.push(v.refoulement.id);
  }
  return ids;
}

/** Get display label for a valve */
export function getValveLabel(valve: ValvePair): string {
  const adm = valve.admission;
  const ref = valve.refoulement;
  const row = adm ?? ref;
  if (!row) return "---";

  const nom = row.nom ?? "";
  const repAdm = adm ? adm.repere_buta || adm.repere_emis || "" : "";
  const repRef = ref ? ref.repere_buta || ref.repere_emis || "" : "";

  if (repAdm && repRef) {
    return `${nom}-${repAdm} / ${repRef}`;
  }
  const rep = repAdm || repRef;
  return rep ? `${nom}-${rep}` : nom;
}
