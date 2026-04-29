import type { RobFlangeRow, ValvePair } from "@/types/rob";

/**
 * Groupe les brides robinetterie en vannes (paires ADM/REF).
 *
 * Règle : au sein d'un même item (ot_item_id), deux brides partageant le
 * même `num_rob` forment une vanne. `rob_side` distingue ADM et REF.
 *
 * Cas dégénérés :
 * - 1 seule bride avec un `num_rob` donné → vanne solo (paire incomplète)
 * - 3+ brides avec le même `num_rob` → seules les 2 premières sont
 *   appariées, les autres apparaissent en vannes solo (anomalie de saisie
 *   à signaler dans l'UI).
 */
export function groupIntoValves(rows: RobFlangeRow[]): ValvePair[] {
  const groups = new Map<string, RobFlangeRow[]>();

  for (const row of rows) {
    if (!row.num_rob || row.num_rob === "") continue;
    const key = `${row.ot_item_id}::${row.num_rob}`;
    const list = groups.get(key) ?? [];
    list.push(row);
    groups.set(key, list);
  }

  const valves: ValvePair[] = [];

  for (const [pairKey, list] of groups) {
    if (list.length === 1) {
      const r = list[0];
      valves.push({
        pairKey,
        admission: r.rob_side === "REF" ? null : r,
        refoulement: r.rob_side === "REF" ? r : null,
      });
      continue;
    }

    // 2+ brides : on cherche un ADM explicite, un REF explicite, sinon
    // on prend la 1re comme ADM et la 2nde comme REF.
    const adm = list.find((r) => r.rob_side === "ADM") ?? null;
    const ref = list.find((r) => r.rob_side === "REF") ?? null;
    const remaining = list.filter((r) => r !== adm && r !== ref);
    const finalAdm = adm ?? remaining.shift() ?? null;
    const finalRef = ref ?? remaining.shift() ?? null;

    valves.push({ pairKey, admission: finalAdm, refoulement: finalRef });

    // Brides surnuméraires (3+) : exposées chacune en vanne solo, en
    // suffixant la clé pour rester unique.
    remaining.forEach((extra, idx) => {
      valves.push({
        pairKey: `${pairKey}::extra-${idx}`,
        admission: extra,
        refoulement: null,
      });
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
