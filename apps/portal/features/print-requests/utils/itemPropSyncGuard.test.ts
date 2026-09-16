import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { shouldAcceptIncomingItemProp } from './itemPropSyncGuard';

/**
 * Portal re-export smoke + pending-local-edit coverage for the shared guard.
 * Broader cases live in packages/shared/.../printRequestItemPropSyncGuard.test.ts.
 */
describe('shouldAcceptIncomingItemProp (Portal re-export)', () => {
  it('rejects stale reload props and pending local edits', () => {
    assert.equal(
      shouldAcceptIncomingItemProp({
        incomingSignature: JSON.stringify({ quantity: 2, width: 1, height: 1 }),
        lastSavedSignature: JSON.stringify({ quantity: 5, width: 1, height: 1 }),
        incomingUpdatedAtMs: 100,
        lastAcceptedUpdatedAtMs: 200,
      }),
      false,
    );

    assert.equal(
      shouldAcceptIncomingItemProp({
        incomingSignature: JSON.stringify({ quantity: 15, width: 1, height: 1 }),
        lastSavedSignature: JSON.stringify({ quantity: 14, width: 1, height: 1 }),
        incomingUpdatedAtMs: 400,
        lastAcceptedUpdatedAtMs: 300,
        hasPendingLocalEdit: true,
      }),
      false,
    );
  });

  it('accepts a genuine newer external update when local draft is clean', () => {
    assert.equal(
      shouldAcceptIncomingItemProp({
        incomingSignature: JSON.stringify({ quantity: 8, width: 1, height: 1 }),
        lastSavedSignature: JSON.stringify({ quantity: 5, width: 1, height: 1 }),
        incomingUpdatedAtMs: 300,
        lastAcceptedUpdatedAtMs: 200,
      }),
      true,
    );
  });
});
