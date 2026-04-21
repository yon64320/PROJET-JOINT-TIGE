import { useCallback, useRef, useState } from "react";
import type { Step } from "./types";

interface Result {
  currentStep: number;
  setCurrentStepDirect: (idx: number) => void;
  returnToRecap: boolean;
  setReturnToRecap: (v: boolean) => void;
  stepsRef: React.RefObject<Step[]>;
  stepRef: React.RefObject<number>;
  goNext: () => void;
  goPrev: () => void;
  jumpTo: (target: Step) => void;
}

/**
 * Encapsule la navigation du wizard (step courant + historique ref + returnToRecap).
 * Les refs permettent aux callbacks mémoïsés d'accéder à la dernière valeur
 * sans dépendre de closures obsolètes.
 */
export function useWizardNavigation(steps: Step[]): Result {
  const [currentStep, setCurrentStep] = useState(0);
  const [returnToRecap, setReturnToRecap] = useState(false);
  const stepRef = useRef(0);
  const stepsRef = useRef(steps);
  stepsRef.current = steps;

  const setCurrentStepDirect = useCallback((idx: number) => {
    stepRef.current = idx;
    setCurrentStep(idx);
  }, []);

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

  const jumpTo = useCallback((target: Step) => {
    const idx = stepsRef.current.indexOf(target);
    if (idx >= 0) {
      stepRef.current = idx;
      setCurrentStep(idx);
    }
  }, []);

  return {
    currentStep,
    setCurrentStepDirect,
    returnToRecap,
    setReturnToRecap,
    stepsRef,
    stepRef,
    goNext,
    goPrev,
    jumpTo,
  };
}
