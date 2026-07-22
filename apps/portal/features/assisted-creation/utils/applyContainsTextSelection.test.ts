import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { createEmptyAssistedCreationAnswers } from '@fresh-prints/shared/utils/assistedCreationValidation';

import { applyContainsTextSelection } from './applyContainsTextSelection';

describe('applyContainsTextSelection', () => {
  it('preserves exact wording nested draft fields when switching away and back', () => {
    const filled = {
      ...createEmptyAssistedCreationAnswers(),
      containsText: 'exact_wording' as const,
      exactText: "this ain't yo mama's poop",
      textCapitalizationNotes: 'Title case',
      textPunctuationNotes: 'Keep apostrophe',
      textLineBreaksExact: true,
      textLayoutFlexible: false,
    };

    const switchedAway = applyContainsTextSelection(filled, 'need_help_with_wording');
    assert.equal(switchedAway.containsText, 'need_help_with_wording');
    assert.equal(switchedAway.exactText, filled.exactText);
    assert.equal(switchedAway.textCapitalizationNotes, filled.textCapitalizationNotes);
    assert.equal(switchedAway.textPunctuationNotes, filled.textPunctuationNotes);
    assert.equal(switchedAway.textLineBreaksExact, true);
    assert.equal(switchedAway.textLayoutFlexible, false);

    const switchedBack = applyContainsTextSelection(switchedAway, 'exact_wording');
    assert.equal(switchedBack.containsText, 'exact_wording');
    assert.equal(switchedBack.exactText, filled.exactText);
    assert.equal(switchedBack.textCapitalizationNotes, filled.textCapitalizationNotes);
    assert.equal(switchedBack.textPunctuationNotes, filled.textPunctuationNotes);
    assert.equal(switchedBack.textLineBreaksExact, true);
    assert.equal(switchedBack.textLayoutFlexible, false);
  });
});
