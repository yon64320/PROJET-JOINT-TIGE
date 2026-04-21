"use client";

import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { useOfflineMutate, useBoltPrediction } from "@/lib/offline/hooks";
import { useSessionContext } from "@/lib/offline/context";
import { type TerrainFieldKey } from "@/lib/terrain/fields";
import type { OfflineFlange } from "@/lib/offline/db";
import { CaloShortcutStep } from "./wizard-steps/CaloShortcutStep";
import { DnPnStep } from "./wizard-steps/DnPnStep";
import { PredictedNumericStep } from "./wizard-steps/PredictedNumericStep";
import { FaceBrideStep } from "./wizard-steps/FaceBrideStep";
import { MatiereJointStep } from "./wizard-steps/MatiereJointStep";
import { BigToggleStep } from "./wizard-steps/BigToggleStep";
import { EchafaudageDimensionsStep } from "./wizard-steps/EchafaudageDimensionsStep";
import { CommentairesStep } from "./wizard-steps/CommentairesStep";
import { RecapStep } from "./wizard-steps/RecapStep";
import { useWizardNavigation } from "./wizard-steps/useWizardNavigation";
import type { Step, WizardValues } from "./wizard-steps/types";

interface Props {
  sessionId: string;
  flange: OfflineFlange;
  onComplete: () => void;
  onBack: () => void;
  initialStep?: "recap";
}

/** Map step → field name for numeric keypad steps */
const STEP_FIELD: Partial<Record<Step, string>> = {
  dn: "dn_emis",
  pn: "pn_emis",
  nb_tiges: "nb_tiges_emis",
  diametre_tige: "diametre_tige",
  longueur_tige: "longueur_tige",
};

export function DataEntryWizard({ sessionId, flange, onComplete, onBack, initialStep }: Props) {
  const [caloMode, setCaloMode] = useState(false);
  const initialStepApplied = useRef(false);
  const [values, setValues] = useState<WizardValues>({
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

  const mutate = useOfflineMutate(sessionId, flange.id);

  // Read selected_fields from session context (null = all fields)
  const { session } = useSessionContext();
  const selectedFields = session?.selected_fields as TerrainFieldKey[] | null;

  // Dynamic steps — calo_shortcut first, face_bride after longueur_tige
  const STEPS = useMemo<Step[]>(() => {
    if (caloMode) {
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

  const nav = useWizardNavigation(STEPS);
  const {
    currentStep,
    setCurrentStepDirect,
    returnToRecap,
    setReturnToRecap,
    goNext,
    goPrev,
    jumpTo,
  } = nav;

  // Jump to recap on mount when opened from completed bride
  useEffect(() => {
    if (initialStep === "recap" && !initialStepApplied.current) {
      initialStepApplied.current = true;
      jumpTo("recap");
    }
  }, [initialStep, jumpTo]);

  const step = STEPS[currentStep];

  // Bolt prediction — default to RF if face not yet selected
  const dn = parseFloat(values.dn_emis) || null;
  const pn = values.pn_emis || null;
  const face = values.face_bride || flange.face_bride || "RF";
  const prediction = useBoltPrediction(dn, pn, face);

  // Sync keypadValue when step changes
  useEffect(() => {
    const field = STEP_FIELD[STEPS[currentStep]];
    if (field) {
      const v = (valuesRef.current as unknown as Record<string, unknown>)[field];
      setKeypadValue(typeof v === "string" ? v : "");
    } else {
      setKeypadValue("");
    }
    setShowKeypad(false);
  }, [currentStep, STEPS]);

  const saveField = useCallback(
    (field: string, value: string | number | boolean | null) => {
      setValues((prev) => ({ ...prev, [field]: value }) as WizardValues);
      mutate(field, value);
    },
    [mutate],
  );

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

  const editStep = useCallback(
    (target: Step) => {
      const idx = STEPS.indexOf(target);
      if (idx >= 0) {
        setCurrentStepDirect(idx);
        setReturnToRecap(true);
      }
    },
    [STEPS, setCurrentStepDirect, setReturnToRecap],
  );

  const renderStep = () => {
    switch (step) {
      case "calo_shortcut":
        return (
          <CaloShortcutStep
            flange={flange}
            saveField={saveField}
            onCaloYes={() => {
              setCaloMode(true);
              setCurrentStepDirect(1);
            }}
            onCaloNo={() => {
              setCaloMode(false);
              setCurrentStepDirect(1);
            }}
          />
        );

      case "dn":
        return (
          <DnPnStep
            label="DN (Diamètre Nominal)"
            field="dn_emis"
            butaValue={flange.dn_buta}
            currentValue={values.dn_emis}
            keypadValue={keypadValue}
            setKeypadValue={setKeypadValue}
            saveField={saveField}
            goNext={goNext}
            confirmNumeric={confirmNumeric}
          />
        );

      case "pn":
        return (
          <DnPnStep
            label="PN (Pression Nominale)"
            field="pn_emis"
            butaValue={flange.pn_buta}
            currentValue={values.pn_emis}
            keypadValue={keypadValue}
            setKeypadValue={setKeypadValue}
            saveField={saveField}
            goNext={goNext}
            confirmNumeric={confirmNumeric}
          />
        );

      case "nb_tiges":
        return (
          <PredictedNumericStep
            predictionLabel="Nb tiges (prédit)"
            keypadLabel="Nombre de tiges"
            field="nb_tiges_emis"
            predictedValue={prediction?.nb_tiges}
            keypadValue={keypadValue}
            setKeypadValue={setKeypadValue}
            showKeypad={showKeypad}
            setShowKeypad={setShowKeypad}
            saveField={saveField}
            goNext={goNext}
            confirmNumeric={confirmNumeric}
          />
        );

      case "diametre_tige":
        return (
          <PredictedNumericStep
            predictionLabel="Diamètre tige (prédit)"
            keypadLabel="Diamètre tige (mm)"
            field="diametre_tige"
            predictedValue={prediction?.diametre_tige}
            keypadValue={keypadValue}
            setKeypadValue={setKeypadValue}
            showKeypad={showKeypad}
            setShowKeypad={setShowKeypad}
            saveField={saveField}
            goNext={goNext}
            confirmNumeric={confirmNumeric}
            allowDecimal
          />
        );

      case "longueur_tige":
        return (
          <PredictedNumericStep
            predictionLabel="Longueur tige (prédit)"
            keypadLabel="Longueur tige (mm)"
            field="longueur_tige"
            predictedValue={prediction?.longueur_tige}
            keypadValue={keypadValue}
            setKeypadValue={setKeypadValue}
            showKeypad={showKeypad}
            setShowKeypad={setShowKeypad}
            saveField={saveField}
            goNext={goNext}
            confirmNumeric={confirmNumeric}
            allowDecimal
          />
        );

      case "face_bride":
        return (
          <FaceBrideStep currentValue={values.face_bride} saveField={saveField} goNext={goNext} />
        );

      case "matiere_joint":
        return (
          <MatiereJointStep
            currentValue={values.matiere_joint_emis}
            saveField={saveField}
            goNext={goNext}
          />
        );

      case "rondelle":
        return (
          <BigToggleStep
            label="Rondelle ?"
            field="rondelle"
            on={values.rondelle === "OUI"}
            onValue="OUI"
            offValue="NON"
            saveField={saveField}
            goNext={goNext}
          />
        );

      case "calorifuge":
        return (
          <BigToggleStep
            label="Calorifugé ?"
            field="calorifuge"
            on={!!values.calorifuge}
            onValue="OUI"
            offValue={null}
            saveField={saveField}
            goNext={goNext}
          />
        );

      case "echafaudage":
        return (
          <BigToggleStep
            label="Échafaudage nécessaire ?"
            field="echafaudage"
            on={!!values.echafaudage}
            onValue="OUI"
            offValue={null}
            saveField={saveField}
            goNext={goNext}
          />
        );

      case "echafaudage_dimensions":
        return (
          <EchafaudageDimensionsStep
            values={values}
            setValues={setValues}
            saveField={saveField}
            goNext={goNext}
          />
        );

      case "commentaires":
        return (
          <CommentairesStep
            value={values.commentaires}
            setValues={setValues}
            saveField={saveField}
            goNext={goNext}
          />
        );

      case "recap":
        return (
          <RecapStep
            values={values}
            steps={STEPS}
            selectedFields={selectedFields}
            caloMode={caloMode}
            editStep={editStep}
            handleComplete={handleComplete}
          />
        );
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
                  jumpTo("recap");
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
