import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  buildEtsyRecommendationHref,
  parseEtsyRecommendationLocation,
  urlStepToView,
  viewToUrlStep,
} from './etsyRecommendationUrlState';

describe('etsyRecommendationUrlState', () => {
  it('parses choose at base path', () => {
    const parsed = parseEtsyRecommendationLocation('/custom-designs', new URLSearchParams());
    assert.deepEqual(parsed, {
      flow: null,
      step: 'choose',
      requestId: null,
      isLegacyPath: false,
    });
  });

  it('parses canonical flow=find query steps', () => {
    const parsed = parseEtsyRecommendationLocation(
      '/custom-designs',
      new URLSearchParams('flow=find&step=style'),
    );
    assert.equal(parsed.flow, 'find');
    assert.equal(parsed.step, 'style');
    assert.equal(parsed.isLegacyPath, false);
    assert.equal(urlStepToView(parsed.step), 'screen2');
  });

  it('marks bare ?step= as legacy (needs flow=find)', () => {
    const parsed = parseEtsyRecommendationLocation(
      '/custom-designs',
      new URLSearchParams('step=subject'),
    );
    assert.equal(parsed.flow, 'find');
    assert.equal(parsed.step, 'subject');
    assert.equal(parsed.isLegacyPath, true);
  });

  it('parses results with requestId', () => {
    const parsed = parseEtsyRecommendationLocation(
      '/custom-designs',
      new URLSearchParams('flow=find&step=results&requestId=abc123'),
    );
    assert.equal(parsed.step, 'results');
    assert.equal(parsed.requestId, 'abc123');
    assert.equal(parsed.isLegacyPath, false);
  });

  it('marks path-based find URLs as legacy', () => {
    const parsed = parseEtsyRecommendationLocation(
      '/custom-designs/find/subject',
      new URLSearchParams(),
    );
    assert.deepEqual(parsed, {
      flow: 'find',
      step: 'subject',
      requestId: null,
      isLegacyPath: true,
    });
  });

  it('unknown flow segments fall back to choose', () => {
    const parsed = parseEtsyRecommendationLocation(
      '/custom-designs/ai/prompt',
      new URLSearchParams(),
    );
    assert.equal(parsed.step, 'choose');
    assert.equal(parsed.flow, null);
  });

  it('ignores assisted flow for Find parser', () => {
    const parsed = parseEtsyRecommendationLocation(
      '/custom-designs',
      new URLSearchParams('flow=assisted&step=description'),
    );
    assert.equal(parsed.step, 'choose');
    assert.equal(parsed.flow, null);
  });

  it('builds canonical query hrefs with flow=find', () => {
    assert.equal(buildEtsyRecommendationHref({ view: 'choose' }), '/custom-designs');
    assert.equal(
      buildEtsyRecommendationHref({ view: 'screen1' }),
      '/custom-designs?flow=find&step=subject',
    );
    assert.equal(
      buildEtsyRecommendationHref({ view: 'results', requestId: 'r1' }),
      '/custom-designs?flow=find&step=results&requestId=r1',
    );
  });

  it('round-trips view and url step', () => {
    assert.equal(viewToUrlStep('screen3'), 'wording');
    assert.equal(urlStepToView('wording'), 'screen3');
  });
});
