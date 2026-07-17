'use client';

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';

import {
  ASSISTED_CREATION_WIZARD_STEPS,
  type AssistedCreationWizardStepId,
} from '@fresh-prints/shared/constants/assistedCreation/assistedCreation.constants';
import type { AssistedCreationAnswers } from '@fresh-prints/shared/types/assistedCreation/assistedCreation.types';
import { createEmptyAssistedCreationAnswers } from '@fresh-prints/shared/utils/assistedCreationValidation';

import { assistedCreationService } from '../services/assistedCreationService';
import { readAssistedCreationStepFromWindow } from '../utils/assistedCreationUrlState';
import {
  clearAssistedCreationDraft,
  readAssistedCreationDraft,
  stepIndexForId,
  writeAssistedCreationDraft,
} from '../utils/assistedCreationDraftStorage';
import { validateAssistedCreationWizardStep } from '../utils/assistedCreationStepValidation';

function cloneAnswers(source: AssistedCreationAnswers): AssistedCreationAnswers {
  return {
    ...createEmptyAssistedCreationAnswers(),
    ...source,
    answersVersion: 1,
    personalizationTypes: Array.isArray(source.personalizationTypes)
      ? [...source.personalizationTypes]
      : ['no_personalization'],
    exactRequirements: Array.isArray(source.exactRequirements) ? [...source.exactRequirements] : [],
    stylePreferences: Array.isArray(source.stylePreferences) ? [...source.stylePreferences] : [],
    referenceUsage: Array.isArray(source.referenceUsage) ? [...source.referenceUsage] : [],
  };
}

function resolveInitialStepIndex(
  initialStepId: AssistedCreationWizardStepId | null | undefined,
): number {
  const fromWindow = readAssistedCreationStepFromWindow();
  if (fromWindow) {
    return stepIndexForId(fromWindow);
  }
  if (initialStepId) {
    return stepIndexForId(initialStepId);
  }
  const draft = readAssistedCreationDraft();
  if (draft) {
    return Math.min(draft.stepIndex, ASSISTED_CREATION_WIZARD_STEPS.length - 1);
  }
  return 0;
}

interface UseAssistedCreationWizardOptions {
  enabled: boolean;
  initialStepId?: AssistedCreationWizardStepId | null;
  onStepChange?: (stepId: AssistedCreationWizardStepId) => void;
}

export function useAssistedCreationWizard({
  enabled,
  initialStepId = null,
  onStepChange,
}: UseAssistedCreationWizardOptions) {
  const [stepIndex, setStepIndex] = useState(() => resolveInitialStepIndex(initialStepId));
  const [answers, setAnswersState] = useState<AssistedCreationAnswers>(() => {
    const draft = readAssistedCreationDraft();
    return draft ? cloneAnswers(draft.answers) : createEmptyAssistedCreationAnswers();
  });
  const [referenceFiles, setReferenceFilesState] = useState<File[]>([]);
  const [referenceFilesError, setReferenceFilesError] = useState<string | null>(null);
  const [stepError, setStepError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitStatusMessage, setSubmitStatusMessage] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submittedRequestId, setSubmittedRequestId] = useState<string | null>(null);
  const [urlSyncReady, setUrlSyncReady] = useState(false);
  const hasHydratedRef = useRef(false);
  const skipNextDraftWriteRef = useRef(true);
  /** When true, URL sync writes the earlier step instead of snapping stepIndex forward. */
  const intentionalBackRef = useRef(false);

  // Restore from the live browser URL before paint so URL sync cannot clobber deep links.
  useLayoutEffect(() => {
    if (hasHydratedRef.current) {
      return;
    }
    hasHydratedRef.current = true;
    skipNextDraftWriteRef.current = true;

    const draft = readAssistedCreationDraft();
    if (draft) {
      setAnswersState(cloneAnswers(draft.answers));
    }

    const fromWindow = readAssistedCreationStepFromWindow();
    if (fromWindow) {
      setStepIndex(stepIndexForId(fromWindow));
    } else if (initialStepId) {
      setStepIndex(stepIndexForId(initialStepId));
    } else if (draft) {
      setStepIndex(Math.min(draft.stepIndex, ASSISTED_CREATION_WIZARD_STEPS.length - 1));
    }
    setUrlSyncReady(true);
  }, [initialStepId]);

  useEffect(() => {
    if (!enabled) {
      return;
    }
    if (skipNextDraftWriteRef.current) {
      skipNextDraftWriteRef.current = false;
      return;
    }
    try {
      writeAssistedCreationDraft({ stepIndex, answers });
    } catch {
      // Ignore draft persistence failures.
    }
  }, [answers, enabled, stepIndex]);

  const step = ASSISTED_CREATION_WIZARD_STEPS[stepIndex] ?? ASSISTED_CREATION_WIZARD_STEPS[0];
  const stepId = step.id;

  useEffect(() => {
    if (!enabled || !urlSyncReady) {
      return;
    }

    // Intentional Back: push the earlier step to the URL; do not snap stepIndex forward.
    if (intentionalBackRef.current) {
      intentionalBackRef.current = false;
      onStepChange?.(stepId);
      return;
    }

    // If state lagged behind the browser URL (refresh race), snap forward — never rewrite
    // a deeper deep-link back to description.
    const windowStep = readAssistedCreationStepFromWindow();
    if (windowStep && stepIndexForId(windowStep) > stepIndex) {
      setStepIndex(stepIndexForId(windowStep));
      return;
    }

    onStepChange?.(stepId);
  }, [enabled, onStepChange, stepId, stepIndex, urlSyncReady]);

  const setAnswers = useCallback(
    (updater: (current: AssistedCreationAnswers) => AssistedCreationAnswers) => {
      setAnswersState((current) => updater(current));
      setStepError(null);
      setSubmitError(null);
    },
    [],
  );

  const setReferenceFiles = useCallback((files: File[]) => {
    const validationError = assistedCreationService.validateReferenceFiles(files);
    if (validationError) {
      setReferenceFilesError(validationError);
      return;
    }
    setReferenceFilesError(null);
    setReferenceFilesState(files);
    setStepError(null);
  }, []);

  const goNext = useCallback((): boolean => {
    const validationError = validateAssistedCreationWizardStep(stepId, answers, {
      referenceFileCount: referenceFiles.length,
    });
    if (validationError) {
      setStepError(validationError);
      return false;
    }
    setStepError(null);
    setStepIndex((current) => Math.min(current + 1, ASSISTED_CREATION_WIZARD_STEPS.length - 1));
    return true;
  }, [answers, referenceFiles.length, stepId]);

  const goBack = useCallback(() => {
    setStepError(null);
    intentionalBackRef.current = true;
    setStepIndex((current) => Math.max(current - 1, 0));
  }, []);

  const goToStep = useCallback((targetStepId: AssistedCreationWizardStepId) => {
    setStepError(null);
    const nextIndex = stepIndexForId(targetStepId);
    setStepIndex((current) => {
      if (nextIndex < current) {
        intentionalBackRef.current = true;
      }
      return nextIndex;
    });
  }, []);

  const resetWizard = useCallback(() => {
    clearAssistedCreationDraft();
    skipNextDraftWriteRef.current = true;
    setAnswersState(createEmptyAssistedCreationAnswers());
    setReferenceFilesState([]);
    setReferenceFilesError(null);
    setStepIndex(0);
    setStepError(null);
    setSubmitError(null);
    setSubmitStatusMessage(null);
    setSubmittedRequestId(null);
    setUrlSyncReady(true);
  }, []);

  const submit = useCallback(async (): Promise<string | null> => {
    const validationError = validateAssistedCreationWizardStep('review', answers, {
      referenceFileCount: referenceFiles.length,
    });
    // Also re-validate references step rules at submit time
    const refsError = validateAssistedCreationWizardStep('references', answers, {
      referenceFileCount: referenceFiles.length,
    });
    if (validationError || refsError) {
      setStepError(validationError ?? refsError);
      return null;
    }

    setIsSubmitting(true);
    setSubmitError(null);
    try {
      if (answers.hasReferences && referenceFiles.length > 0) {
        setSubmitStatusMessage('Uploading reference images…');
      } else {
        setSubmitStatusMessage('Submitting request…');
      }
      const result = await assistedCreationService.submitRequest(answers, referenceFiles);
      clearAssistedCreationDraft();
      setSubmittedRequestId(result.requestId);
      setReferenceFilesState([]);
      setSubmitStatusMessage(null);
      return result.requestId;
    } catch (error) {
      setSubmitError(error instanceof Error ? error.message : 'Unable to submit request.');
      setSubmitStatusMessage(null);
      return null;
    } finally {
      setIsSubmitting(false);
    }
  }, [answers, referenceFiles]);

  return {
    steps: ASSISTED_CREATION_WIZARD_STEPS,
    stepIndex,
    stepId,
    stepTitle: step.title,
    answers,
    referenceFiles,
    referenceFilesError,
    stepError: stepError ?? submitError,
    isFirstStep: stepIndex === 0,
    isLastStep: stepIndex === ASSISTED_CREATION_WIZARD_STEPS.length - 1,
    isSubmitting,
    submitStatusMessage,
    submittedRequestId,
    setAnswers,
    setReferenceFiles,
    goNext,
    goBack,
    goToStep,
    resetWizard,
    submit,
  };
}
