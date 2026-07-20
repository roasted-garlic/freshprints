import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { resolveCurrentRequestReviewId } from './resolveCurrentRequestReviewId';

describe('resolveCurrentRequestReviewId', () => {
  it('prefers working request id over pending', () => {
    assert.equal(resolveCurrentRequestReviewId('working-1', 'pending-1'), 'working-1');
  });

  it('uses pending when working is null', () => {
    assert.equal(resolveCurrentRequestReviewId(null, 'pending-1'), 'pending-1');
  });

  it('returns null when neither id is known', () => {
    assert.equal(resolveCurrentRequestReviewId(null, null), null);
    assert.equal(resolveCurrentRequestReviewId(undefined, undefined), null);
    assert.equal(resolveCurrentRequestReviewId('  ', ''), null);
  });
});
