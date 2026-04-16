"use client";

import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { useOfflineMutate, useBoltPrediction } from "@/lib/offline/hooks";
import { offlineDb, type OfflineFlange, type OfflineDropdownItem } from "@/lib/offline/db";
import { useSessionContext } from "@/lib/offline/context";
import { type TerrainFieldKey } from "@/lib/terrain/fields";
import { NumericKeypad } from "./NumericKeypad";
import { PredictionBadge } from "./PredictionBadge";
import { BigToggle } from "./BigToggle";
import { TouchDropdown } from "./TouchDropdown";

interface Props {
  sessionId: string;
  flange: OfflineFlange;
  onComplete: () => void;
  onBack: () => void;
  initialStep?: "recap";
}

type Step =
  | "calo_shortcut"
  | "dn"
  | "pn"
  | "nb_tiges"
  | "diametre_tige"
  | "longueur_tige"
  | "face_bride"
  | "matiere_joint"
  | "rondelle"
  | "calorifuge"
  | "echafaudage"
  | "echafaudage_dimensions"
  | "commentaires"
  | "recap";

/** Map step → field name for numeric keypad steps */
const STEP_FIELD: Partial<Record<Step, string>> = {
  dn: "dn_emis",
  pn: "pn_emis",
  nb_tiges: "nb_tiges_emis",
  diametre_tige: "diametre_tige",
  longueur_tige: "longueur_tige",
};

export function DataEntryWizard({ sessionId, flange, onComplete, onBack, initialStep }: Props) {
  const [currentStep, setCurrentStep] = useState(0);
  const stepRef = useRef(0);
  const [returnToRecap, setReturnToRecap] = useState(false);
  const [caloMode, setCaloMode] = useState(false);
  const initialStepApplied = useRef(false);
  const [values, setValues] = useState({
    dn_emis: flange.dn_emis ?? "",
    pn_emis: flange.pn_emis ?? "",
    face_bride: flange.face_bride ?? "",
    nb_tiges_emis: flange.nb_tiges_emis ?? "",
    diametre_tige: flange.diametre_tige ?? "",
    longueur_tige: flange.longueur_tige ?? "",
    matiere_joint_emis: flange.matiere_joint_emis ?? "",
    rondelle: flange.rondelle ?? "",
    calorifuge: flange.calorifuge ?? "",
    echafaudage: flange.echafaudage ?? "",
    echaf_longueur: flange.echaf_longueur ?? "",
    echaf_largeur: flange.echaf_largeur ?? "",
    echaf_hauteur: flange.echaf_hauteur ?? "",
    commentaires: flange.commentaires ?? "",
  });
  const valuesRef = useRef(values);
  valuesRef.current = values;

  const [keypadValue, setKeypadValue] = useState(flange.dn_emis ?? "");
  const [showKeypad, setShowKeypad] = useState(false);
  const [dropdownOptions, setDropdownOptions] = useState<OfflineDropdownItem[]>([]);

  const mutate = useOfflineMutate(sessionId, flange.id);

  // Read selected_fields from session context (null = all fields)
  const { session } = useSessionContext();
  const selectedFields = session?.selected_fields as TerrainFieldKey[] | null;

  // Dynamic steps — calo_shortcut first, face_bride after longueur_tige
  const STEPS = useMemo<Step[]>(() => {
    if (caloMode) {
      // Calo mode: shortcut → only echafaudage + commentaires + recap
      const result: Step[] = ["calo_shortcut"];
      if (!selectedFields || selectedFields.includes("echafaudage")) {
        result.push("echafaudage");
        if (values.echafaudage) result.push("echafaudage_dimensions");
      }
      if (!selectedFields || selectedFields.includes("commentaires")) {
        result.push("commentaires");
      }
      result.push("recap");
      return result;
    }

    // Normal mode — face_bride after longueur_tige, before matiere_joint
    const allBase: Step[] = [
      "calo_shortcut",
      "dn",
      "pn",
      "nb_tiges",
      "diametre_tige",
      "longueur_tige",
      "face_bride",
      "matiere_joint",
      "rondelle",
      "calorifuge",
      "echafaudage",
      "commentaires",
    ];
    const filtered = selectedFields
      ? allBase.filter(
          (s) => s === "calo_shortcut" || selectedFields.includes(s as TerrainFieldKey),
        )
      : allBase;
    const result: Step[] = [];
    for (const s of filtered) {
      result.push(s);
      if (s === "echafaudage" && !!values.echafaudage) {
        result.push("echafaudage_dimensions");
      }
    }
    result.push("recap");
    return result;
  }, [selectedFields, values.echafaudage, caloMode]);

  const stepsRef = useRef(STEPS);
  stepsRef.current = STEPS;

  // Jump to recap on mount when opened from completed bride
  useEffect(() => {
    if (initialStep === "recap" && !initialStepApplied.current) {
      const recapIdx = STEPS.indexOf("recap");
      if (recapIdx >= 0) {
        initialStepApplied.current = true;
        stepRef.current = recapIdx;
        setCurrentStep(recapIdx);
      }
    }
  }, [initialStep, STEPS]);

  const step = STEPS[currentStep];

  // Bolt prediction — default to RF if face not yet selected (face_bride comes after bolt steps)
  const dn = parseFloat(values.dn_emis) || null;
  const pn = values.pn_emis || null;
  const face = values.face_bride || flange.face_bride || "RF";
  const prediction = useBoltPrediction(dn, pn, face);

  // Load dropdown options
  useEffect(() => {
    offlineDb.dropdownLists.toArray().then(setDropdownOptions);
  }, []);

  // Sync keypadValue when step changes
  useEffect(() => {
    const field = STEP_FIELD[STEPS[currentStep]];
    if (field) {
      const v = (valuesRef.current as Record<string, unknown>)[field];
      setKeypadValue(typeof v === "string" ? v : "");
    } else {
      setKeypadValue("");
    }
    setShowKeypad(false);
  }, [currentStep, STEPS]);

  const saveField = useCallback(
    (field: string, value: string | number | boolean | null) => {
      setValues((prev) => ({ ...prev, [field]: value }));
      mutate(field, value);
    },
    [mutate],
  );

  const goNext = useCallback(() => {
    if (returnToRecap) {
      const recapIdx = stepsRef.current.indexOf("recap");
      if (recapIdx >= 0) {
        stepRef.current = recapIdx;
        setCurrentStep(recapIdx);
        setReturnToRecap(false);
        return;
      }
    }
    const cur = stepRef.current;
    const len = stepsRef.current.length;
    if (cur < len - 1) {
      const next = cur + 1;
      stepRef.current = next;
      setCurrentStep(next);
    }
  }, [returnToRecap]);

  const goPrev = useCallback(() => {
    const cur = stepRef.current;
    if (cur > 0) {
      const prev = cur - 1;
      stepRef.current = prev;
      setCurrentStep(prev);
    }
  }, []);

  const confirmNumeric = useCallback(
    (field: string) => {
      if (keypadValue) {
        saveField(field, keypadValue);
      }
      goNext();
    },
    [keypadValue, saveField, goNext],
  );

  const handleComplete = useCallback(() => {
    mutate("field_status", "completed");
    onComplete();
  }, [mutate, onComplete]);

  // Mark as in_progress on first interaction (skip when opening completed bride at recap)
  useEffect(() => {
    if (flange.field_status === "pending" && initialStep !== "recap") {
      mutate("field_status", "in_progress");
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const renderStep = () => {
    switch (step) {
      case "calo_shortcut":
        return (
          <div className="p-4">
            <p className="text-sm text-mcm-warm-gray text-center mb-4">
              Cette bride est-elle calorifugée ?
            </p>
            <p className="text-xs text-mcm-warm-gray text-center mb-6">
              Si oui, les données client seront reprises telles quelles. Seul l&apos;échafaudage
              restera à renseigner.
            </p>
            <div className="space-y-3">
              <button
                onClick={() => {
                  // Copy BUTA data → EMIS (can't verify under insulation)
                  if (flange.dn_buta) saveField("dn_emis", String(flange.dn_buta));
                  if (flange.pn_buta) saveField("pn_emis", String(flange.pn_buta));
                  if (flange.nb_tiges_buta)
                    saveField("nb_tiges_emis", String(flange.nb_tiges_buta));
                  saveField("calorifuge", "OUI");
                  setCaloMode(true);
                  stepRef.current = 1;
                  setCurrentStep(1);
                }}
                className="w-full h-20 rounded-xl bg-amber-500 text-white text-xl font-bold
                           active:bg-amber-600 transition-colors"
              >
                Calorifugée
              </button>
              <button
                onClick={() => {
                  setCaloMode(false);
                  stepRef.current = 1;
                  setCurrentStep(1);
                }}
                className="w-full h-20 rounded-xl bg-white border-2 border-mcm-warm-gray-border
                           text-mcm-charcoal text-xl font-bold active:bg-mcm-warm-gray-bg transition-colors"
              >
                Saisie normale
              </button>
            </div>
          </div>
        );

      case "dn":
        return (
          <div className="p-4">
            {flange.dn_buta && !values.dn_emis && (
              <div className="mb-4 p-3 bg-blue-50 rounded-xl text-center">
                <p className="text-sm text-mcm-warm-gray mb-1">Valeur client (BUTA)</p>
                <p className="text-2xl font-bold text-blue-700">{flange.dn_buta}</p>
                <button
                  onClick={() => {
                    saveField("dn_emis", flange.dn_buta!);
                    goNext();
                  }}
                  className="mt-2 h-12 px-6 rounded-xl bg-mcm-teal text-white font-semibold active:bg-mcm-teal-dark"
                >
                  Confirmer valeur client
                </button>
              </div>
            )}
            <NumericKeypad
              label="DN (Diamètre Nominal)"
              value={keypadValue}
              onChange={setKeypadValue}
              onConfirm={() => confirmNumeric("dn_emis")}
              allowDecimal
            />
          </div>
        );

      case "pn":
        return (
          <div className="p-4">
            {flange.pn_buta && !values.pn_emis && (
              <div className="mb-4 p-3 bg-blue-50 rounded-xl text-center">
                <p className="text-sm text-mcm-warm-gray mb-1">Valeur client (BUTA)</p>
                <p className="text-2xl font-bold text-blue-700">{flange.pn_buta}</p>
                <button
                  onClick={() => {
                    saveField("pn_emis", flange.pn_buta!);
                    goNext();
                  }}
                  className="mt-2 h-12 px-6 rounded-xl bg-mcm-teal text-white font-semibold active:bg-mcm-teal-dark"
                >
                  Confirmer valeur client
                </button>
              </div>
            )}
            <NumericKeypad
              label="PN (Pression Nominale)"
              value={keypadValue}
              onChange={setKeypadValue}
              onConfirm={() => confirmNumeric("pn_emis")}
              allowDecimal
            />
          </div>
        );

      case "nb_tiges":
        return (
          <div className="p-4">
            {prediction && !showKeypad ? (
              <PredictionBadge
                label="Nb tiges (prédit)"
                predictedValue={prediction.nb_tiges}
                onAccept={() => {
                  saveField("nb_tiges_emis", String(prediction.nb_tiges));
                  goNext();
                }}
                onOverride={() => {
                  setShowKeypad(true);
                  setKeypadValue("");
                }}
              />
            ) : (
              <NumericKeypad
                label="Nombre de tiges"
                value={keypadValue}
                onChange={setKeypadValue}
                onConfirm={() => confirmNumeric("nb_tiges_emis")}
              />
            )}
          </div>
        );

      case "diametre_tige":
        return (
          <div className="p-4">
            {prediction && !showKeypad ? (
              <PredictionBadge
                label="Diamètre tige (prédit)"
                predictedValue={prediction.diametre_tige}
                onAccept={() => {
                  saveField("diametre_tige", String(prediction.diametre_tige));
                  goNext();
                }}
                onOverride={() => {
                  setShowKeypad(true);
                  setKeypadValue("");
                }}
              />
            ) : (
              <NumericKeypad
                label="Diamètre tige (mm)"
                value={keypadValue}
                onChange={setKeypadValue}
                onConfirm={() => confirmNumeric("diametre_tige")}
                allowDecimal
              />
            )}
          </div>
        );

      case "longueur_tige":
        return (
          <div className="p-4">
            {prediction?.longueur_tige && !showKeypad ? (
              <PredictionBadge
                label="Longueur tige (prédit)"
                predictedValue={prediction.longueur_tige}
                onAccept={() => {
                  saveField("longueur_tige", String(prediction.longueur_tige));
                  goNext();
                }}
                onOverride={() => {
                  setShowKeypad(true);
                  setKeypadValue("");
                }}
              />
            ) : (
              <NumericKeypad
                label="Longueur tige (mm)"
                value={keypadValue}
                onChange={setKeypadValue}
                onConfirm={() => confirmNumeric("longueur_tige")}
                allowDecimal
              />
            )}
          </div>
        );

      case "face_bride":
        return (
          <div className="p-4">
            <p className="text-sm text-mcm-warm-gray text-center mb-4">Type de face</p>
            <div className="flex gap-3">
              {["RF", "RTJ"].map((ft) => (
                <button
                  key={ft}
                  onClick={() => {
                    saveField("face_bride", ft);
                    goNext();
                  }}
                  className={`flex-1 h-20 rounded-xl text-2xl font-bold transition-colors
                    ${
                      values.face_bride === ft
                        ? "bg-mcm-mustard text-white"
                        : "bg-white border-2 border-mcm-warm-gray-border text-mcm-charcoal active:bg-mcm-warm-gray-bg"
                    }`}
                >
                  {ft}
                </button>
              ))}
            </div>
          </div>
        );

      case "matiere_joint":
        return (
          <div className="p-4">
            <TouchDropdown
              label="Matière joint"
              options={[
                { value: "GRAPHITE", label: "Graphite" },
                { value: "PTFE", label: "PTFE" },
                { value: "SPIRALE", label: "Spiralé" },
                { value: "KLINGERSIL", label: "Klingersil" },
                { value: "CAF", label: "CAF" },
                { value: "METAL", label: "Métallique" },
              ]}
              selected={values.matiere_joint_emis}
              onSelect={(v) => {
                saveField("matiere_joint_emis", v);
                goNext();
              }}
              allowCustom
              customPlaceholder="Autre matière…"
            />
          </div>
        );

      case "rondelle":
        return (
          <div className="p-4">
            <BigToggle
              label="Rondelle ?"
              value={values.rondelle === "OUI"}
              onChange={(v) => {
                saveField("rondelle", v ? "OUI" : "NON");
                goNext();
              }}
            />
          </div>
        );

      case "calorifuge":
        return (
          <div className="p-4">
            <BigToggle
              label="Calorifugé ?"
              value={!!values.calorifuge}
              onChange={(v) => {
                saveField("calorifuge", v ? "OUI" : null);
                goNext();
              }}
            />
          </div>
        );

      case "echafaudage":
        return (
          <div className="p-4">
            <BigToggle
              label="Échafaudage nécessaire ?"
              value={!!values.echafaudage}
              onChange={(v) => {
                saveField("echafaudage", v ? "OUI" : null);
                goNext();
              }}
            />
          </div>
        );

      case "echafaudage_dimensions":
        return (
          <div className="p-4">
            <p className="text-sm text-mcm-warm-gray text-center mb-4">Dimensions échafaudage</p>
            <div className="space-y-4">
              {(
                [
                  { field: "echaf_longueur", label: "Longueur (L)" },
                  { field: "echaf_largeur", label: "Largeur (l)" },
                  { field: "echaf_hauteur", label: "Hauteur (H)" },
                ] as const
              ).map(({ field, label }) => (
                <div key={field}>
                  <label className="block text-sm text-mcm-warm-gray mb-1">{label}</label>
                  <div className="relative">
                    <input
                      inputMode="decimal"
                      value={((values as Record<string, unknown>)[field] as string) ?? ""}
                      onChange={(e) => setValues((prev) => ({ ...prev, [field]: e.target.value }))}
                      onBlur={() =>
                        saveField(
                          field,
                          ((values as Record<string, unknown>)[field] as string) || null,
                        )
                      }
                      placeholder="—"
                      className="w-full h-16 px-4 pr-12 text-2xl rounded-xl border border-mcm-warm-gray-border
                                 bg-white text-mcm-charcoal text-center"
                    />
                    <span className="absolute right-4 top-1/2 -translate-y-1/2 text-lg text-mcm-warm-gray">
                      m
                    </span>
                  </div>
                </div>
              ))}
            </div>
            <button
              onClick={goNext}
              className="mt-4 w-full h-14 rounded-xl bg-mcm-mustard text-white text-lg font-semibold
                         active:bg-mcm-mustard-hover transition-colors"
            >
              Continuer
            </button>
          </div>
        );

      case "commentaires":
        return (
          <div className="p-4">
            <p className="text-sm text-mcm-warm-gray mb-2">Commentaire (optionnel)</p>
            <textarea
              value={values.commentaires}
              onChange={(e) => setValues((prev) => ({ ...prev, commentaires: e.target.value }))}
              onBlur={() => saveField("commentaires", values.commentaires || null)}
              placeholder="Observations terrain..."
              rows={4}
              className="w-full p-3 text-lg rounded-xl border border-mcm-warm-gray-border
                         bg-white text-mcm-charcoal resize-none"
            />
            <button
              onClick={goNext}
              className="mt-3 w-full h-14 rounded-xl bg-mcm-mustard text-white text-lg font-semibold
                         active:bg-mcm-mustard-hover transition-colors"
            >
              Continuer
            </button>
          </div>
        );

      case "recap": {
        const show = (field: TerrainFieldKey) => !selectedFields || selectedFields.includes(field);
        const canEdit = (target: Step) => STEPS.includes(target);
        const editStep = (target: Step) => {
          const idx = STEPS.indexOf(target);
          if (idx >= 0) {
            stepRef.current = idx;
            setCurrentStep(idx);
            setReturnToRecap(true);
          }
        };
        return (
          <div className="p-4 space-y-3">
            <h2 className="text-xl font-bold text-mcm-charcoal text-center mb-4">Récapitulatif</h2>
            {caloMode && (
              <div className="mb-2 px-3 py-2 bg-amber-50 rounded-xl text-center">
                <span className="text-sm font-medium text-amber-700">
                  Bride calorifugée — données client reprises
                </span>
              </div>
            )}
            {show("dn") && (
              <RecapRow
                label="DN"
                value={values.dn_emis}
                onEdit={canEdit("dn") ? () => editStep("dn") : undefined}
              />
            )}
            {show("pn") && (
              <RecapRow
                label="PN"
                value={values.pn_emis}
                onEdit={canEdit("pn") ? () => editStep("pn") : undefined}
              />
            )}
            {show("nb_tiges") && (
              <RecapRow
                label="Nb tiges"
                value={values.nb_tiges_emis}
                onEdit={canEdit("nb_tiges") ? () => editStep("nb_tiges") : undefined}
              />
            )}
            {show("diametre_tige") && (
              <RecapRow
                label="Diam. tige"
                value={values.diametre_tige}
                onEdit={canEdit("diametre_tige") ? () => editStep("diametre_tige") : undefined}
              />
            )}
            {show("longueur_tige") && (
              <RecapRow
                label="Long. tige"
                value={values.longueur_tige}
                onEdit={canEdit("longueur_tige") ? () => editStep("longueur_tige") : undefined}
              />
            )}
            {show("face_bride") && (
              <RecapRow
                label="Face"
                value={values.face_bride}
                onEdit={canEdit("face_bride") ? () => editStep("face_bride") : undefined}
              />
            )}
            {show("matiere_joint") && (
              <RecapRow
                label="Matière joint"
                value={values.matiere_joint_emis}
                onEdit={canEdit("matiere_joint") ? () => editStep("matiere_joint") : undefined}
              />
            )}
            {show("rondelle") && (
              <RecapRow
                label="Rondelle"
                value={values.rondelle}
                onEdit={canEdit("rondelle") ? () => editStep("rondelle") : undefined}
              />
            )}
            {show("calorifuge") && (
              <RecapRow
                label="Calorifugé"
                value={values.calorifuge ? "Oui" : "Non"}
                onEdit={canEdit("calorifuge") ? () => editStep("calorifuge") : undefined}
              />
            )}
            {show("echafaudage") && (
              <>
                <RecapRow
                  label="Échafaudage"
                  value={values.echafaudage ? "Oui" : "Non"}
                  onEdit={() => editStep("echafaudage")}
                />
                {!!values.echafaudage && (
                  <>
                    {values.echaf_longueur && (
                      <RecapRow
                        label="Échaf. L"
                        value={`${values.echaf_longueur} m`}
                        onEdit={() => editStep("echafaudage_dimensions")}
                      />
                    )}
                    {values.echaf_largeur && (
                      <RecapRow
                        label="Échaf. l"
                        value={`${values.echaf_largeur} m`}
                        onEdit={() => editStep("echafaudage_dimensions")}
                      />
                    )}
                    {values.echaf_hauteur && (
                      <RecapRow
                        label="Échaf. H"
                        value={`${values.echaf_hauteur} m`}
                        onEdit={() => editStep("echafaudage_dimensions")}
                      />
                    )}
                  </>
                )}
              </>
            )}
            {show("commentaires") && values.commentaires && (
              <RecapRow
                label="Commentaire"
                value={values.commentaires}
                onEdit={() => editStep("commentaires")}
              />
            )}
            <button
              onClick={handleComplete}
              className="w-full h-16 rounded-xl bg-mcm-teal text-white text-xl font-bold
                         active:bg-mcm-teal-dark transition-colors mt-4"
            >
              Valider la bride
            </button>
          </div>
        );
      }
    }
  };

  return (
    <div className="flex flex-col h-full">
      {/* Progress bar */}
      <div className="px-4 pt-3 pb-2 bg-white border-b border-mcm-warm-gray-border">
        <div className="flex items-center justify-between mb-1">
          <span className="text-xs text-mcm-warm-gray">
            Étape {currentStep + 1}/{STEPS.length}
          </span>
          <span className="text-xs font-medium text-mcm-charcoal">
            {flange.repere_buta ?? flange.nom ?? "Bride"}
          </span>
        </div>
        <div className="h-1.5 bg-slate-200 rounded-full overflow-hidden">
          <div
            className="h-full bg-mcm-mustard rounded-full transition-all duration-300"
            style={{ width: `${((currentStep + 1) / STEPS.length) * 100}%` }}
          />
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 min-h-0 overflow-y-auto">{renderStep()}</div>

      {/* Navigation */}
      <div className="flex gap-3 p-4 bg-white border-t border-mcm-warm-gray-border">
        <button
          onClick={
            returnToRecap
              ? () => {
                  const recapIdx = STEPS.indexOf("recap");
                  if (recapIdx >= 0) {
                    stepRef.current = recapIdx;
                    setCurrentStep(recapIdx);
                  }
                  setReturnToRecap(false);
                }
              : currentStep === 0
                ? onBack
                : goPrev
          }
          className="flex-1 h-14 rounded-xl bg-white border border-mcm-warm-gray-border
                     text-mcm-charcoal text-lg font-semibold active:bg-mcm-warm-gray-bg transition-colors"
        >
          {returnToRecap ? "Annuler" : currentStep === 0 ? "Retour" : "Précédent"}
        </button>
        {step !== "recap" && (
          <button
            onClick={goNext}
            className="flex-1 h-14 rounded-xl bg-mcm-warm-gray-bg text-mcm-charcoal
                       text-lg font-semibold active:bg-mcm-warm-gray-border transition-colors"
          >
            {returnToRecap ? "Garder" : "Passer"}
          </button>
        )}
      </div>
    </div>
  );
}

function RecapRow({ label, value, onEdit }: { label: string; value: string; onEdit?: () => void }) {
  return (
    <div className="flex justify-between items-center py-2 border-b border-mcm-warm-gray-border last:border-0">
      <span className="text-sm text-mcm-warm-gray">{label}</span>
      <div className="flex items-center gap-2">
        <span className="text-base font-semibold text-mcm-charcoal">{value || "—"}</span>
        {onEdit && (
          <button
            onClick={onEdit}
            className="p-1 -mr-1 text-mcm-warm-gray active:text-mcm-charcoal"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 20 20"
              fill="currentColor"
              className="w-4 h-4"
            >
              <path d="M2.695 14.763l-1.262 3.154a.5.5 0 00.65.65l3.155-1.262a4 4 0 001.343-.885L17.5 5.5a2.121 2.121 0 00-3-3L3.58 13.42a4 4 0 00-.885 1.343z" />
            </svg>
          </button>
        )}
      </div>
    </div>
  );
}
