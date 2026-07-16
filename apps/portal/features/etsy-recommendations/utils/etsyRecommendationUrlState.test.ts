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
      isLegacyQuery: false,
    });
  });

  it('parses find path steps', () => {
    const parsed = parseEtsyRecommendationLocation(
      '/custom-designs/find/style',
      new URLSearchParams(),
    );
    assert.equal(parsed.flow, 'find');
    assert.equal(parsed.step, 'style');
    assert.equal(parsed.isLegacyQuery, false);
    assert.equal(urlStepToView(parsed.step), 'screen2');
  });

  it('parses results with requestId', () => {
    const parsed = parseEtsyRecommendationLocation(
      '/custom-designs/find/results',
      new URLSearchParams('requestId=abc123'),
    );
    assert.equal(parsed.step, 'results');
    assert.equal(parsed.requestId, 'abc123');
  });

  it('maps legacy query step to find flow', () => {
    const parsed = parseEtsyRecommendationLocation(
      '/custom-designs',
      new URLSearchParams('step=subject'),
    );
    assert.deepEqual(parsed, {
      flow: 'find',
      step: 'subject',
      requestId: null,
      isLegacyQuery: true,
    });
  });

  it('maps legacy results query with requestId', () => {
    const parsed = parseEtsyRecommendationLocation(
      '/custom-designs',
      new URLSearchParams('step=results&requestId=req-1'),
    );
    assert.equal(parsed.isLegacyQuery, true);
    assert.equal(parsed.step, 'results');
    assert.equal(parsed.requestId, 'req-1');
  });

  it('unknown flow segments fall back to choose', () => {
    const parsed = parseEtsyRecommendationLocation(
      '/custom-designs/ai/prompt',
      new URLSearchParams(),
    );
    assert.equal(parsed.step, 'choose');
    assert.equal(parsed.flow, null);
  });

  it('builds canonical path hrefs', () => {
    assert.equal(buildEtsyRecommendationHref({ view: 'choose' }), '/custom-designs');
    assert.equal(buildEtsyRecommendationHref({ view: 'screen1' }), '/custom-designs/find/subject');
    assert.equal(
      buildEtsyRecommendationHref({ view: 'results', requestId: 'r1' }),
      '/custom-designs/find/results?requestId=r1',
    );
  });

  it('round-trips view and url step', () => {
    assert.equal(viewToUrlStep('screen3'), 'wording');
    assert.equal(urlStepToView('wording'), 'screen3');
  });
});
