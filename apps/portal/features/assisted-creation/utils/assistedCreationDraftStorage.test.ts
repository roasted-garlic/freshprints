import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { createEmptyAssistedCreationAnswers } from '@fresh-prints/shared/utils/assistedCreationValidation';

import { hasResumableAssistedCreationDraft } from './assistedCreationDraftStorage';

describe('hasResumableAssistedCreationDraft', () => {
  it('is false for null or empty step-0 draft', () => {
    assert.equal(hasResumableAssistedCreationDraft(null), false);
    assert.equal(
      hasResumableAssistedCreationDraft({
        stepIndex: 0,
        answers: createEmptyAssistedCreationAnswers(),
      }),
      false,
    );
  });

  it('is true when stepIndex is past the first step', () => {
    assert.equal(
      hasResumableAssistedCreationDraft({
        stepIndex: 1,
        answers: createEmptyAssistedCreationAnswers(),
      }),
      true,
    );
  });

  it('is true when description or subject has content', () => {
    const withDescription = createEmptyAssistedCreationAnswers();
    withDescription.rawDescription = 'A highland cow on a hill';
    assert.equal(
      hasResumableAssistedCreationDraft({ stepIndex: 0, answers: withDescription }),
      true,
    );

    const withSubject = createEmptyAssistedCreationAnswers();
    withSubject.primarySubject = 'cow';
    assert.equal(
      hasResumableAssistedCreationDraft({ stepIndex: 0, answers: withSubject }),
      true,
    );
  });

  it('is true when enums move off defaults', () => {
    const answers = createEmptyAssistedCreationAnswers();
    answers.requestType = 'phrase_or_saying';
    assert.equal(hasResumableAssistedCreationDraft({ stepIndex: 0, answers }), true);
  });
});
