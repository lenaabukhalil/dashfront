import { useCallback, useMemo, useState } from "react";

export interface WizardState {
  completedSteps: number[];
  currentStep: number;
  organizationId: string | null;
  locationId: string | null;
  chargerId: string | null;
  connectorId: string | null;
  tariffId: string | null;
}

const initialState: WizardState = {
  completedSteps: [],
  currentStep: 1,
  organizationId: null,
  locationId: null,
  chargerId: null,
  connectorId: null,
  tariffId: null,
};

export function useWizardState() {
  const [state, setState] = useState<WizardState>(initialState);

  const isStepAccessible = useCallback(
    (step: number) => {
      if (step <= 1) return true;
      return state.completedSteps.includes(step - 1);
    },
    [state.completedSteps]
  );

  const goToStep = useCallback(
    (step: number) => {
      if (!isStepAccessible(step)) return;
      setState((prev) => ({ ...prev, currentStep: step }));
    },
    [isStepAccessible]
  );

  const markStepComplete = useCallback((step: number) => {
    setState((prev) => ({
      ...prev,
      completedSteps: prev.completedSteps.includes(step)
        ? prev.completedSteps
        : [...prev.completedSteps, step].sort((a, b) => a - b),
    }));
  }, []);

  const advanceStep = useCallback(() => {
    setState((prev) => ({ ...prev, currentStep: Math.min(5, prev.currentStep + 1) }));
  }, []);

  const goBackStep = useCallback(() => {
    setState((prev) => ({ ...prev, currentStep: Math.max(1, prev.currentStep - 1) }));
  }, []);

  const setEntityId = useCallback(
    (key: "organizationId" | "locationId" | "chargerId" | "connectorId" | "tariffId", value: string | null) => {
      setState((prev) => ({ ...prev, [key]: value }));
    },
    []
  );

  const resetWizard = useCallback(() => setState(initialState), []);

  const allCompleted = useMemo(
    () =>
      state.completedSteps.includes(1) &&
      state.completedSteps.includes(2) &&
      state.completedSteps.includes(3) &&
      state.completedSteps.includes(4) &&
      state.completedSteps.includes(5),
    [state.completedSteps]
  );

  return {
    state,
    setState,
    isStepAccessible,
    goToStep,
    markStepComplete,
    advanceStep,
    goBackStep,
    setEntityId,
    resetWizard,
    allCompleted,
  };
}
