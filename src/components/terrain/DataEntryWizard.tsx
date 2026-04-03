"use client";

import { useState, useEffect, useCallback } from "react";
import { useOfflineMutate, useBoltPrediction } from "@/lib/offline/hooks";
import { offlineDb, type OfflineFlange, type OfflineDropdownItem } from "@/lib/offline/db";
import { NumericKeypad } from "./NumericKeypad";
import { PredictionBadge } from "./PredictionBadge";
import { BigToggle } from "./BigToggle";
import { TouchDropdown } from "./TouchDropdown";

interface Props {
  sessionId: string;
  flange: OfflineFlange;
  onComplete: () => void;
  onBack: () => void;
}

const STEPS = [
  "dn",
  "pn",
  "face_bride",
  "nb_tiges",
  "diametre_tige",
  "longueur_tige",
  "matiere_joint",
  "rondelle",
  "calorifuge",
  "echafaudage",
  "commentaires",
  "recap",
] as const;

type Step = (typeof STEPS)[number];

export function DataEntryWizard({ sessionId, flange, onComplete, onBack }: Props) {
  const [currentStep, setCurrentStep] = useState(0);
  const [values, setValues] = useState({
    dn_emis: flange.dn_emis ?? "",
    pn_emis: flange.pn_emis ?? "",
    face_bride: flange.face_bride ?? "",
    nb_tiges_emis: flange.nb_tiges_emis ?? "",
    diametre_tige: flange.diametre_tige ?? "",
    longueur_tige: flange.longueur_tige ?? "",
    matiere_joint_emis: flange.matiere_joint_emis ?? "",
    rondelle: flange.rondelle ?? "",
    calorifuge: flange.calorifuge,
    echafaudage: flange.echafaudage,
    commentaires: flange.commentaires ?? "",
  });
  const [keypadValue, setKeypadValue] = useState("");
  const [showKeypad, setShowKeypad] = useState(false);
  const [dropdownOptions, setDropdownOptions] = useState<OfflineDropdownItem[]>([]);

  const mutate = useOfflineMutate(sessionId, flange.id);
  const step = STEPS[currentStep];

  // Bolt prediction
  const dn = parseFloat(values.dn_emis) || null;
  const pn = values.pn_emis || null;
  const face = values.face_bride || null;
  const prediction = useBoltPrediction(dn, pn, face);

  // Load dropdown options
  useEffect(() => {
    offlineDb.dropdownLists.toArray().then(setDropdownOptions);
  }, []);

  const saveField = useCallback(
    async (field: string, value: string | number | boolean | null) => {
      setValues((prev) => ({ ...prev, [field]: value }));
      await mutate(field, value);
    },
    [mutate],
  );

  const goNext = useCallback(() => {
    if (currentStep < STEPS.length - 1) setCurrentStep((s) => s + 1);
    setShowKeypad(false);
    setKeypadValue("");
  }, [currentStep]);

  const goPrev = useCallback(() => {
    if (currentStep > 0) setCurrentStep((s) => s - 1);
    setShowKeypad(false);
    setKeypadValue("");
  }, [currentStep]);

  const confirmNumeric = useCallback(
    async (field: string) => {
      if (keypadValue) {
        await saveField(field, keypadValue);
      }
      goNext();
    },
    [keypadValue, saveField, goNext],
  );

  const handleComplete = useCallback(async () => {
    await mutate("field_status", "completed");
    onComplete();
  }, [mutate, onComplete]);

  // Mark as in_progress on first interaction
  useEffect(() => {
    if (flange.field_status === "pending") {
      mutate("field_status", "in_progress");
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const renderStep = () => {
    switch (step) {
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
              value={keypadValue || values.dn_emis}
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
              value={keypadValue || values.pn_emis}
              onChange={setKeypadValue}
              onConfirm={() => confirmNumeric("pn_emis")}
              allowDecimal
            />
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
                onOverride={() => setShowKeypad(true)}
              />
            ) : (
              <NumericKeypad
                label="Nombre de tiges"
                value={keypadValue || values.nb_tiges_emis}
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
                onOverride={() => setShowKeypad(true)}
              />
            ) : (
              <NumericKeypad
                label="Diamètre tige (mm)"
                value={keypadValue || values.diametre_tige}
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
                onOverride={() => setShowKeypad(true)}
              />
            ) : (
              <NumericKeypad
                label="Longueur tige (mm)"
                value={keypadValue || values.longueur_tige}
                onChange={setKeypadValue}
                onConfirm={() => confirmNumeric("longueur_tige")}
                allowDecimal
              />
            )}
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
              value={values.rondelle === "OUI" || values.rondelle === true}
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
              value={values.calorifuge}
              onChange={(v) => {
                saveField("calorifuge", v);
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
              value={values.echafaudage}
              onChange={(v) => {
                saveField("echafaudage", v);
                goNext();
              }}
            />
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

      case "recap":
        return (
          <div className="p-4 space-y-3">
            <h2 className="text-xl font-bold text-mcm-charcoal text-center mb-4">Récapitulatif</h2>
            <RecapRow label="DN" value={values.dn_emis} />
            <RecapRow label="PN" value={values.pn_emis} />
            <RecapRow label="Face" value={values.face_bride} />
            <RecapRow label="Nb tiges" value={values.nb_tiges_emis} />
            <RecapRow label="Diam. tige" value={values.diametre_tige} />
            <RecapRow label="Long. tige" value={values.longueur_tige} />
            <RecapRow label="Matière joint" value={values.matiere_joint_emis} />
            <RecapRow label="Rondelle" value={values.rondelle} />
            <RecapRow label="Calorifugé" value={values.calorifuge ? "Oui" : "Non"} />
            <RecapRow label="Échafaudage" value={values.echafaudage ? "Oui" : "Non"} />
            {values.commentaires && <RecapRow label="Commentaire" value={values.commentaires} />}
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
          onClick={currentStep === 0 ? onBack : goPrev}
          className="flex-1 h-14 rounded-xl bg-white border border-mcm-warm-gray-border
                     text-mcm-charcoal text-lg font-semibold active:bg-mcm-warm-gray-bg transition-colors"
        >
          {currentStep === 0 ? "Retour" : "Précédent"}
        </button>
        {step !== "recap" && (
          <button
            onClick={goNext}
            className="flex-1 h-14 rounded-xl bg-mcm-warm-gray-bg text-mcm-charcoal
                       text-lg font-semibold active:bg-mcm-warm-gray-border transition-colors"
          >
            Passer
          </button>
        )}
      </div>
    </div>
  );
}

function RecapRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between items-center py-2 border-b border-mcm-warm-gray-border last:border-0">
      <span className="text-sm text-mcm-warm-gray">{label}</span>
      <span className="text-base font-semibold text-mcm-charcoal">{value || "—"}</span>
    </div>
  );
}
