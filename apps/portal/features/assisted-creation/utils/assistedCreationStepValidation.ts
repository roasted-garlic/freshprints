import {
  ASSISTED_CREATION_FIELD_LIMITS,
  type AssistedCreationWizardStepId,
} from '@fresh-prints/shared/constants/assistedCreation/assistedCreation.constants';
import type { AssistedCreationAnswers } from '@fresh-prints/shared/types/assistedCreation/assistedCreation.types';

export function validateAssistedCreationWizardStep(
  stepId: AssistedCreationWizardStepId,
  answers: AssistedCreationAnswers,
  options?: { referenceFileCount?: number },
): string | null {
  switch (stepId) {
    case 'description': {
      const text = answers.rawDescription.trim();
      if (!text) {
        return 'Describe the design you want in your own words.';
      }
      if (text.length > ASSISTED_CREATION_FIELD_LIMITS.rawDescription) {
        return `Keep your description under ${ASSISTED_CREATION_FIELD_LIMITS.rawDescription} characters.`;
      }
      return null;
    }
    case 'requestType':
      return answers.requestType ? null : 'Select the option that best describes your request.';
    case 'wording': {
      if (!answers.containsText) {
        return 'Tell us whether the design should contain words.';
      }
      if (answers.containsText === 'exact_wording' && !answers.exactText.trim()) {
        return 'Enter the exact wording that should appear on the design.';
      }
      return null;
    }
    case 'personalization': {
      if (answers.personalizationTypes.length === 0) {
        return 'Choose a personalization option, or select “No personalization.”';
      }
      return null;
    }
    case 'exactnessFlexibility':
      return answers.flexibilityLevel
        ? null
        : 'Tell us how flexible you are about the final look.';
    case 'composition':
      return answers.composition ? null : 'Choose a composition preference (or No preference).';
    case 'references': {
      if (!answers.hasReferences) {
        return null;
      }
      if (answers.referenceUsage.length === 0) {
        return 'Select how you would use the reference images.';
      }
      if (
        answers.referenceUsage.includes('clone_with_subtle_changes') &&
        (options?.referenceFileCount ?? 0) < 1
      ) {
        return 'Upload at least one reference image for a clone with subtle changes.';
      }
      return null;
    }
    default:
      return null;
  }
}
