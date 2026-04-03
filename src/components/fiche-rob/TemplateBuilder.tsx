"use client";

import { useState, useTransition } from "react";
import {
  FIELDS,
  FIELD_MAP,
  DEFAULT_TEMPLATE,
  type FicheRobTemplate,
} from "@/lib/domain/fiche-rob-fields";
import FichePreviewStatic from "./FichePreviewStatic";

interface Props {
  projectId: string;
  initial: FicheRobTemplate;
}

export default function TemplateBuilder({ projectId, initial }: Props) {
  const [carac, setCarac] = useState<string[]>(initial.caracteristiques);
  const [trav, setTrav] = useState<string[]>(initial.travaux);
  const [saving, startSave] = useTransition();
  const [toast, setToast] = useState<string | null>(null);

  const assigned = new Set([...carac, ...trav]);
  const available = FIELDS.filter((f) => !assigned.has(f.key));

  const template: FicheRobTemplate = {
    caracteristiques: carac,
    travaux: trav,
  };

  function moveUp(list: string[], setList: (l: string[]) => void, idx: number) {
    if (idx === 0) return;
    const next = [...list];
    [next[idx - 1], next[idx]] = [next[idx], next[idx - 1]];
    setList(next);
  }

  function moveDown(list: string[], setList: (l: string[]) => void, idx: number) {
    if (idx === list.length - 1) return;
    const next = [...list];
    [next[idx], next[idx + 1]] = [next[idx + 1], next[idx]];
    setList(next);
  }

  function remove(list: string[], setList: (l: string[]) => void, idx: number) {
    setList(list.filter((_, i) => i !== idx));
  }

  function addTo(key: string, target: "caracteristiques" | "travaux") {
    if (target === "caracteristiques") setCarac([...carac, key]);
    else setTrav([...trav, key]);
  }

  function handleSave() {
    startSave(async () => {
      const res = await fetch(`/api/projects/${projectId}/fiche-template`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(template),
      });
      if (res.ok) {
        showToast("Template sauvegardé");
      } else {
        const data = await res.json();
        showToast(`Erreur : ${data.error}`);
      }
    });
  }

  function handleReset() {
    setCarac([...DEFAULT_TEMPLATE.caracteristiques]);
    setTrav([...DEFAULT_TEMPLATE.travaux]);
  }

  function showToast(msg: string) {
    setToast(msg);
    setTimeout(() => setToast(null), 3000);
  }

  return (
    <div className="flex gap-6 p-6 h-full min-h-0">
      {/* ── Left: Editor ── */}
      <div className="flex-1 flex flex-col gap-4 min-h-0 overflow-auto">
        <div className="flex gap-4">
          <ColumnEditor
            title="CARACTERISTIQUES"
            keys={carac}
            setKeys={setCarac}
            moveUp={(i) => moveUp(carac, setCarac, i)}
            moveDown={(i) => moveDown(carac, setCarac, i)}
            remove={(i) => remove(carac, setCarac, i)}
            color="blue"
          />
          <ColumnEditor
            title="TRAVAUX"
            keys={trav}
            setKeys={setTrav}
            moveUp={(i) => moveUp(trav, setTrav, i)}
            moveDown={(i) => moveDown(trav, setTrav, i)}
            remove={(i) => remove(trav, setTrav, i)}
            color="emerald"
          />
          <AvailablePool fields={available} addTo={addTo} />
        </div>

        {/* Actions */}
        <div className="flex gap-3">
          <button
            onClick={handleSave}
            disabled={saving}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50 transition-colors"
          >
            {saving ? "Sauvegarde..." : "Sauvegarder"}
          </button>
          <button
            onClick={handleReset}
            className="px-4 py-2 bg-slate-100 text-slate-700 rounded-lg text-sm font-medium hover:bg-slate-200 transition-colors"
          >
            Réinitialiser
          </button>
        </div>

        {/* Toast */}
        {toast && (
          <div className="fixed bottom-6 right-6 px-4 py-2 bg-slate-800 text-white rounded-lg text-sm shadow-lg animate-fade-in">
            {toast}
          </div>
        )}
      </div>

      {/* ── Right: Read-only preview ── */}
      <div className="w-[300px] shrink-0 flex flex-col min-h-0 gap-3">
        <h3 className="text-xs font-medium text-slate-500 uppercase tracking-wide">Aperçu PDF</h3>
        <div className="flex-1 overflow-auto">
          <FichePreviewStatic template={template} />
        </div>
      </div>
    </div>
  );
}

/* ── Column Editor ── */
function ColumnEditor({
  title,
  keys,
  moveUp,
  moveDown,
  remove,
  color,
}: {
  title: string;
  keys: string[];
  setKeys: (k: string[]) => void;
  moveUp: (i: number) => void;
  moveDown: (i: number) => void;
  remove: (i: number) => void;
  color: "blue" | "emerald";
}) {
  const borderColor = color === "blue" ? "border-blue-200" : "border-emerald-200";
  const headerBg = color === "blue" ? "bg-blue-50" : "bg-emerald-50";
  const headerText = color === "blue" ? "text-blue-800" : "text-emerald-800";

  return (
    <div className={`flex-1 border rounded-lg ${borderColor} overflow-hidden`}>
      <div
        className={`px-3 py-2 ${headerBg} ${headerText} font-semibold text-sm border-b ${borderColor}`}
      >
        {title}
        <span className="ml-2 text-xs font-normal opacity-70">({keys.length})</span>
      </div>
      <ul className="divide-y divide-slate-100">
        {keys.map((key, i) => {
          const field = FIELD_MAP.get(key);
          return (
            <li
              key={key}
              className="flex items-center gap-1 px-2 py-1.5 text-sm group hover:bg-slate-50"
            >
              <span className="flex-1 truncate">{field?.label ?? key}</span>
              <button
                onClick={() => moveUp(i)}
                disabled={i === 0}
                className="p-0.5 text-slate-400 hover:text-slate-700 disabled:opacity-20"
                title="Monter"
              >
                <ChevronUp />
              </button>
              <button
                onClick={() => moveDown(i)}
                disabled={i === keys.length - 1}
                className="p-0.5 text-slate-400 hover:text-slate-700 disabled:opacity-20"
                title="Descendre"
              >
                <ChevronDown />
              </button>
              <button
                onClick={() => remove(i)}
                className="p-0.5 text-slate-400 hover:text-red-600"
                title="Retirer"
              >
                <XMark />
              </button>
            </li>
          );
        })}
        {keys.length === 0 && (
          <li className="px-3 py-4 text-sm text-slate-400 text-center">Aucun champ</li>
        )}
      </ul>
    </div>
  );
}

/* ── Available Pool ── */
function AvailablePool({
  fields,
  addTo,
}: {
  fields: { key: string; label: string }[];
  addTo: (key: string, target: "caracteristiques" | "travaux") => void;
}) {
  return (
    <div className="w-52 border border-slate-200 rounded-lg overflow-hidden shrink-0">
      <div className="px-3 py-2 bg-slate-50 text-slate-600 font-semibold text-sm border-b border-slate-200">
        Disponibles
        <span className="ml-2 text-xs font-normal opacity-70">({fields.length})</span>
      </div>
      <ul className="divide-y divide-slate-100">
        {fields.map((f) => (
          <li key={f.key} className="px-2 py-1.5 text-sm flex items-center gap-1">
            <span className="flex-1 truncate text-slate-500">{f.label}</span>
            <button
              onClick={() => addTo(f.key, "caracteristiques")}
              className="px-1.5 py-0.5 text-[10px] bg-blue-50 text-blue-600 rounded hover:bg-blue-100"
              title="Ajouter aux caractéristiques"
            >
              CAR
            </button>
            <button
              onClick={() => addTo(f.key, "travaux")}
              className="px-1.5 py-0.5 text-[10px] bg-emerald-50 text-emerald-600 rounded hover:bg-emerald-100"
              title="Ajouter aux travaux"
            >
              TRA
            </button>
          </li>
        ))}
        {fields.length === 0 && (
          <li className="px-3 py-4 text-sm text-slate-400 text-center">
            Tous les champs sont assignés
          </li>
        )}
      </ul>
    </div>
  );
}

/* ── Mini SVG Icons ── */
function ChevronUp() {
  return (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M5 15l7-7 7 7" />
    </svg>
  );
}

function ChevronDown() {
  return (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
    </svg>
  );
}

function XMark() {
  return (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
    </svg>
  );
}
