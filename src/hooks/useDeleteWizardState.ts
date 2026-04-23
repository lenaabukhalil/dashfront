import { useCallback, useMemo, useState } from "react";

export interface DeleteWizardState {
  currentStep: number;
  completedSteps: number[];
  organizationId: string | null;
  organizationName: string;
}

const initialState: DeleteWizardState = {
  currentStep: 0,
  completedSteps: [],
  organizationId: null,
  organizationName: "",
};

export function useDeleteWizardState() {
  const [state, setState] = useState<DeleteWizardState>(initialState);

  const isStepAccessible = useCallback(
    (step: number) => {
      if (step === 0) return true;
      if (!state.organizationId) return false;
      if (step === 1) return true;
      return state.completedSteps.includes(step - 1);
    },
    [state.completedSteps, state.organizationId]
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
    setState((prev) => ({ ...prev, currentStep: Math.min(6, prev.currentStep + 1) }));
  }, []);

  const goBackStep = useCallback(() => {
    setState((prev) => ({ ...prev, currentStep: Math.max(0, prev.currentStep - 1) }));
  }, []);

  const setScope = useCallback((organizationId: string, organizationName: string) => {
    setState((prev) => ({
      ...prev,
      organizationId,
      organizationName,
      completedSteps: [],
      currentStep: 1,
    }));
  }, []);

  const resetWizard = useCallback(() => setState(initialState), []);

  const allCompleted = useMemo(
    () => [1, 2, 3, 4, 5, 6].every((step) => state.completedSteps.includes(step)),
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
    setScope,
    resetWizard,
    allCompleted,
  };
}
