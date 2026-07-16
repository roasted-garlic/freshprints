import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  applyEtsyMultiValueSuggestion,
  applyEtsySubjectSuggestion,
  commitEtsyMultiValueDraft,
  listEtsyMultiValueInputValues,
  parseEtsyMultiValueInput,
  serializeEtsyMultiValueInput,
} from './applyEtsySubjectSuggestion';

const harley = {
  id: 'harley_quinn',
  label: 'Harley Quinn',
  apiToken: 'harley quinn',
};

const highland = {
  id: 'highland_cow',
  label: 'Highland cow',
  apiToken: 'highland cow',
};

const christmas = {
  id: 'occasion_christmas',
  label: 'Christmas',
  apiToken: 'christmas',
};

describe('etsy multi-value input helpers', () => {
  it('keeps spaces inside the draft and splits only on commas', () => {
    assert.deepEqual(parseEtsyMultiValueInput('highland cow'), {
      selected: [],
      draft: 'highland cow',
    });
    assert.deepEqual(parseEtsyMultiValueInput('highland cow, funny'), {
      selected: ['highland cow'],
      draft: 'funny',
    });
  });

  it('commits drafts with comma/enter semantics and blocks duplicates', () => {
    assert.equal(commitEtsyMultiValueDraft('highland cow', 3), 'highland cow, ');
    assert.equal(
      commitEtsyMultiValueDraft(serializeEtsyMultiValueInput(['highland cow'], 'highland cow'), 3),
      'highland cow, ',
    );
  });

  it('applies suggestion pills as selected chips and drops the draft filter', () => {
    assert.equal(applyEtsySubjectSuggestion('high', highland), 'highland cow, ');
    assert.equal(
      applyEtsySubjectSuggestion('highland cow, har', harley),
      'highland cow, harley quinn, ',
    );
    assert.equal(applyEtsySubjectSuggestion('grinch', christmas), 'grinch, christmas, ');
  });

  it('does not re-add an already selected suggestion', () => {
    assert.equal(
      applyEtsyMultiValueSuggestion('highland cow, ', 'highland cow', 3),
      'highland cow, ',
    );
  });

  it('lists committed values including a trailing draft', () => {
    assert.deepEqual(listEtsyMultiValueInputValues('highland cow, funny'), [
      'highland cow',
      'funny',
    ]);
  });
});
