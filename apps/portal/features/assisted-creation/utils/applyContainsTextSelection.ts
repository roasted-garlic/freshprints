import type { AssistedCreationContainsText } from '@fresh-prints/shared/constants/assistedCreation/assistedCreation.constants';
import type { AssistedCreationAnswers } from '@fresh-prints/shared/types/assistedCreation/assistedCreation.types';

/**
 * Switch the Words-on-the-design radio without wiping nested exact-wording draft
 * fields (exactText, notes, checkboxes). Submit-time parsing still strips
 * exactText when the selected mode is not exact_wording.
 */
export function applyContainsTextSelection(
  current: AssistedCreationAnswers,
  containsText: AssistedCreationContainsText,
): AssistedCreationAnswers {
  return {
    ...current,
    containsText,
  };
}
