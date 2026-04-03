"use client";

import { useMemo, useState, useCallback } from "react";
import type { RobFlangeRow } from "@/types/rob";

interface PairingModalProps {
  rows: RobFlangeRow[];
  projectId: string;
  onClose: () => void;
  onPaired: () => void;
}

interface ItemGroup {
  item: string;
  flanges: RobFlangeRow[];
}

function getRepere(r: RobFlangeRow): string {
  return r.repere_buta || r.repere_emis || r.id.slice(0, 8);
}

export default function PairingModal({ rows, projectId, onClose, onPaired }: PairingModalProps) {
  const [autoPairing, setAutoPairing] = useState(false);
  const [pairingOne, setPairingOne] = useState<string | null>(null);

  // Group by ot_item (only items with 2+ flanges)
  const groups = useMemo(() => {
    const map = new Map<string, RobFlangeRow[]>();
    for (const r of rows) {
      const item = r.ot_items?.item ?? "?";
      if (!map.has(item)) map.set(item, []);
      map.get(item)!.push(r);
    }
    const result: ItemGroup[] = [];
    for (const [item, flanges] of map) {
      if (flanges.length >= 2) {
        result.push({ item, flanges });
      }
    }
    return result.sort((a, b) => a.item.localeCompare(b.item, "fr", { numeric: true }));
  }, [rows]);

  // Unpaired flanges
  const unpairedGroups = useMemo(
    () =>
      groups
        .map((g) => ({
          ...g,
          flanges: g.flanges.filter((f) => !f.rob_pair_id),
        }))
        .filter((g) => g.flanges.length >= 2),
    [groups],
  );

  // Auto-pair eligible count
  const autoEligible = useMemo(
    () => unpairedGroups.filter((g) => g.flanges.length === 2).length,
    [unpairedGroups],
  );

  const handleAutoPair = useCallback(async () => {
    setAutoPairing(true);
    try {
      const res = await fetch("/api/flanges/pair/auto", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ projectId }),
      });
      if (res.ok) {
        const data = await res.json();
        alert(`${data.pairedCount} paire(s) créée(s) automatiquement`);
        onPaired();
      }
    } catch (err) {
      console.error("Auto-pair error:", err);
    } finally {
      setAutoPairing(false);
    }
  }, [projectId, onPaired]);

  const handleManualPair = useCallback(
    async (flangeIdA: string, flangeIdB: string) => {
      setPairingOne(flangeIdA);
      try {
        const res = await fetch("/api/flanges/pair", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ flangeIdA, flangeIdB, sideA: "ADM" }),
        });
        if (res.ok) {
          onPaired();
        }
      } catch (err) {
        console.error("Manual pair error:", err);
      } finally {
        setPairingOne(null);
      }
    },
    [onPaired],
  );

  const handleUnpair = useCallback(
    async (pairId: string) => {
      try {
        const res = await fetch("/api/flanges/pair", {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ pairId }),
        });
        if (res.ok) {
          onPaired();
        }
      } catch (err) {
        console.error("Unpair error:", err);
      }
    },
    [onPaired],
  );

  // Already-paired groups
  const pairedGroups = useMemo(() => {
    const pairMap = new Map<string, RobFlangeRow[]>();
    for (const r of rows) {
      if (!r.rob_pair_id) continue;
      if (!pairMap.has(r.rob_pair_id)) pairMap.set(r.rob_pair_id, []);
      pairMap.get(r.rob_pair_id)!.push(r);
    }
    return [...pairMap.entries()].map(([pairId, flanges]) => ({ pairId, flanges }));
  }, [rows]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-white rounded-xl shadow-2xl w-[700px] max-h-[80vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3 border-b border-slate-200">
          <div>
            <h2 className="text-sm font-semibold text-slate-800">
              Appariement des brides robinetterie
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Lier 2 brides d&apos;un même ITEM pour former une vanne (ADM / REF)
            </p>
          </div>
          <button onClick={onClose} className="p-1 text-slate-400 hover:text-slate-600 rounded">
            <svg
              className="w-5 h-5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Auto-pair bar */}
        {autoEligible > 0 && (
          <div className="flex items-center gap-3 px-5 py-2.5 bg-amber-50 border-b border-amber-100">
            <span className="text-xs text-amber-800">
              <strong>{autoEligible}</strong> ITEM{autoEligible > 1 ? "s" : ""} avec exactement 2
              brides non appariées
            </span>
            <button
              onClick={handleAutoPair}
              disabled={autoPairing}
              className="ml-auto px-3 py-1 text-xs font-medium bg-amber-600 text-white rounded hover:bg-amber-700 disabled:opacity-50 transition-colors"
            >
              {autoPairing ? "En cours..." : "Apparier automatiquement"}
            </button>
          </div>
        )}

        {/* Content */}
        <div className="flex-1 overflow-auto px-5 py-3 space-y-4">
          {/* Already paired */}
          {pairedGroups.length > 0 && (
            <div>
              <h3 className="text-xs font-semibold text-emerald-700 uppercase tracking-wide mb-2">
                Paires existantes ({pairedGroups.length})
              </h3>
              <div className="space-y-1">
                {pairedGroups.map(({ pairId, flanges }) => (
                  <div
                    key={pairId}
                    className="flex items-center gap-2 px-3 py-1.5 bg-emerald-50 rounded text-xs"
                  >
                    <span className="inline-block w-2 h-2 rounded-full bg-emerald-400" />
                    {flanges.map((f) => (
                      <span key={f.id} className="font-mono font-medium text-slate-700">
                        {f.nom}-{getRepere(f)}
                        <span className="text-slate-400 ml-0.5">({f.rob_side ?? "?"})</span>
                      </span>
                    ))}
                    <button
                      onClick={() => handleUnpair(pairId)}
                      className="ml-auto text-red-500 hover:text-red-700 text-[10px] underline"
                    >
                      Défaire
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Unpaired groups */}
          {unpairedGroups.length > 0 && (
            <div>
              <h3 className="text-xs font-semibold text-slate-600 uppercase tracking-wide mb-2">
                À apparier ({unpairedGroups.length} ITEMs)
              </h3>
              <div className="space-y-3">
                {unpairedGroups.map((group) => (
                  <div key={group.item} className="border border-slate-200 rounded-lg p-3">
                    <div className="text-xs font-semibold text-slate-700 mb-2">
                      ITEM : {group.item}
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {group.flanges.map((f, idx) => (
                        <div key={f.id} className="flex items-center gap-1">
                          <span className="px-2 py-1 bg-slate-100 rounded text-xs font-mono">
                            {f.nom}-{getRepere(f)}
                          </span>
                          {/* Show pair button between consecutive flanges */}
                          {idx < group.flanges.length - 1 && (
                            <button
                              onClick={() => handleManualPair(f.id, group.flanges[idx + 1].id)}
                              disabled={pairingOne === f.id}
                              className="px-2 py-0.5 text-[10px] font-medium bg-blue-100 text-blue-700 rounded hover:bg-blue-200 disabled:opacity-50 transition-colors"
                              title={`Apparier ${getRepere(f)} avec ${getRepere(group.flanges[idx + 1])}`}
                            >
                              Lier
                            </button>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {unpairedGroups.length === 0 && pairedGroups.length === 0 && (
            <div className="text-center text-slate-400 py-8 text-sm">
              Aucune bride rob à apparier. Les ITEMs doivent avoir au moins 2 brides rob=OUI.
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex justify-end px-5 py-3 border-t border-slate-200">
          <button
            onClick={onClose}
            className="px-4 py-2 text-xs font-medium text-slate-600 bg-slate-100 rounded hover:bg-slate-200 transition-colors"
          >
            Fermer
          </button>
        </div>
      </div>
    </div>
  );
}
