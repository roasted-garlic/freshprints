import {
  ASSISTED_CREATION_DRAFT_STORAGE_KEY,
  ASSISTED_CREATION_WIZARD_STEPS,
  type AssistedCreationWizardStepId,
} from '@fresh-prints/shared/constants/assistedCreation/assistedCreation.constants';
import type { AssistedCreationAnswers } from '@fresh-prints/shared/types/assistedCreation/assistedCreation.types';
import { createEmptyAssistedCreationAnswers } from '@fresh-prints/shared/utils/assistedCreationValidation';

export interface AssistedCreationDraft {
  stepIndex: number;
  answers: AssistedCreationAnswers;
}

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

export function readAssistedCreationDraft(): AssistedCreationDraft | null {
  if (typeof window === 'undefined') {
    return null;
  }
  try {
    const raw = window.localStorage.getItem(ASSISTED_CREATION_DRAFT_STORAGE_KEY);
    if (!raw) {
      return null;
    }
    const parsed = JSON.parse(raw) as Partial<AssistedCreationDraft>;
    if (!parsed || typeof parsed !== 'object' || !parsed.answers) {
      return null;
    }
    const stepIndex =
      typeof parsed.stepIndex === 'number'
        ? Math.min(Math.max(0, Math.floor(parsed.stepIndex)), ASSISTED_CREATION_WIZARD_STEPS.length - 1)
        : 0;
    return {
      stepIndex,
      answers: cloneAnswers(parsed.answers as AssistedCreationAnswers),
    };
  } catch {
    return null;
  }
}

export function writeAssistedCreationDraft(draft: AssistedCreationDraft): void {
  if (typeof window === 'undefined') {
    return;
  }
  window.localStorage.setItem(
    ASSISTED_CREATION_DRAFT_STORAGE_KEY,
    JSON.stringify({
      stepIndex: draft.stepIndex,
      answers: draft.answers,
    }),
  );
}

export function clearAssistedCreationDraft(): void {
  if (typeof window === 'undefined') {
    return;
  }
  window.localStorage.removeItem(ASSISTED_CREATION_DRAFT_STORAGE_KEY);
}

/**
 * True when a local wizard draft has progress worth Resume/Reset on the hub
 * (mirrors Find's `hasResumableEtsyRecommendationDraft`).
 */
export function hasResumableAssistedCreationDraft(
  draft: AssistedCreationDraft | null = readAssistedCreationDraft(),
): boolean {
  if (!draft) {
    return false;
  }
  if (draft.stepIndex > 0) {
    return true;
  }
  const empty = createEmptyAssistedCreationAnswers();
  const { answers } = draft;
  const stringKeys = [
    'rawDescription',
    'exactText',
    'textCapitalizationNotes',
    'textPunctuationNotes',
    'primarySubject',
    'additionalSubjects',
    'subjectAction',
    'props',
    'setting',
    'occasion',
    'audience',
    'mood',
    'includedColors',
    'excludedColors',
    'garmentColor',
  ] as const;
  for (const key of stringKeys) {
    if (answers[key].trim().length > 0) {
      return true;
    }
  }
  if (answers.requestType !== empty.requestType) {
    return true;
  }
  if (answers.containsText !== empty.containsText) {
    return true;
  }
  if (answers.flexibilityLevel !== empty.flexibilityLevel) {
    return true;
  }
  if (answers.composition !== empty.composition) {
    return true;
  }
  if (answers.hasReferences !== empty.hasReferences) {
    return true;
  }
  if (answers.textLineBreaksExact !== empty.textLineBreaksExact) {
    return true;
  }
  if (answers.textLayoutFlexible !== empty.textLayoutFlexible) {
    return true;
  }
  if (answers.exactRequirements.length > 0) {
    return true;
  }
  if (answers.stylePreferences.length > 0) {
    return true;
  }
  if (answers.referenceUsage.length > 0) {
    return true;
  }
  const personalization = answers.personalizationTypes;
  if (
    personalization.length !== 1 ||
    personalization[0] !== 'no_personalization'
  ) {
    return true;
  }
  return false;
}

export function stepIndexForId(stepId: AssistedCreationWizardStepId): number {
  const index = ASSISTED_CREATION_WIZARD_STEPS.findIndex((step) => step.id === stepId);
  return index >= 0 ? index : 0;
}
