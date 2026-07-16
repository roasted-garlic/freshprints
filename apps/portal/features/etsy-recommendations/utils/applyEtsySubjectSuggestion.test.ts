import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { applyEtsySubjectSuggestion } from './applyEtsySubjectSuggestion';

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

describe('applyEtsySubjectSuggestion', () => {
  it('replaces a single-letter filter that matches a suggestion word', () => {
    assert.equal(applyEtsySubjectSuggestion('q', harley), 'harley quinn');
  });

  it('replaces a typed prefix of the suggestion phrase', () => {
    assert.equal(applyEtsySubjectSuggestion('high', highland), 'highland cow');
    assert.equal(applyEtsySubjectSuggestion('harley', harley), 'harley quinn');
  });

  it('appends a distinct second subject', () => {
    assert.equal(applyEtsySubjectSuggestion('grinch', christmas), 'grinch christmas');
  });

  it('replaces only the trailing filter when prior subject is complete', () => {
    assert.equal(applyEtsySubjectSuggestion('grinch har', harley), 'grinch harley quinn');
  });
});
