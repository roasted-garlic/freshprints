import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { shouldAcceptIncomingItemProp } from './printRequestItemPropSyncGuard';

describe('shouldAcceptIncomingItemProp', () => {
  it('rejects a stale reload prop arriving after this card already accepted a newer save', () => {
    const accepted = shouldAcceptIncomingItemProp({
      incomingSignature: JSON.stringify({ quantity: 2, width: 1, height: 1 }),
      lastSavedSignature: JSON.stringify({ quantity: 5, width: 1, height: 1 }),
      incomingUpdatedAtMs: 100,
      lastAcceptedUpdatedAtMs: 200,
    });

    assert.equal(accepted, false);
  });

  it('accepts a genuine newer external update when local draft is clean', () => {
    const accepted = shouldAcceptIncomingItemProp({
      incomingSignature: JSON.stringify({ quantity: 8, width: 1, height: 1 }),
      lastSavedSignature: JSON.stringify({ quantity: 5, width: 1, height: 1 }),
      incomingUpdatedAtMs: 300,
      lastAcceptedUpdatedAtMs: 200,
    });

    assert.equal(accepted, true);
  });

  it('rejects remote apply while a local edit is still pending', () => {
    const accepted = shouldAcceptIncomingItemProp({
      incomingSignature: JSON.stringify({ quantity: 15, width: 1, height: 1 }),
      lastSavedSignature: JSON.stringify({ quantity: 14, width: 1, height: 1 }),
      incomingUpdatedAtMs: 400,
      lastAcceptedUpdatedAtMs: 300,
      hasPendingLocalEdit: true,
    });

    assert.equal(accepted, false);
  });

  it('accepts equal updatedAt when signatures differ and local is clean', () => {
    const accepted = shouldAcceptIncomingItemProp({
      incomingSignature: JSON.stringify({ quantity: 5, width: 2, height: 2 }),
      lastSavedSignature: JSON.stringify({ quantity: 5, width: 1, height: 1 }),
      incomingUpdatedAtMs: 200,
      lastAcceptedUpdatedAtMs: 200,
    });

    assert.equal(accepted, true);
  });

  it('is a no-op when the incoming signature matches the last saved one', () => {
    const accepted = shouldAcceptIncomingItemProp({
      incomingSignature: JSON.stringify({ quantity: 5, width: 1, height: 1 }),
      lastSavedSignature: JSON.stringify({ quantity: 5, width: 1, height: 1 }),
      incomingUpdatedAtMs: 50,
      lastAcceptedUpdatedAtMs: 200,
    });

    assert.equal(accepted, false);
  });

  it('falls back to signature-only when updatedAt is unavailable on either side', () => {
    const acceptedNoIncoming = shouldAcceptIncomingItemProp({
      incomingSignature: JSON.stringify({ quantity: 3, width: 1, height: 1 }),
      lastSavedSignature: JSON.stringify({ quantity: 5, width: 1, height: 1 }),
      incomingUpdatedAtMs: null,
      lastAcceptedUpdatedAtMs: 200,
    });
    const acceptedNoLastAccepted = shouldAcceptIncomingItemProp({
      incomingSignature: JSON.stringify({ quantity: 3, width: 1, height: 1 }),
      lastSavedSignature: JSON.stringify({ quantity: 5, width: 1, height: 1 }),
      incomingUpdatedAtMs: 200,
      lastAcceptedUpdatedAtMs: null,
    });

    assert.equal(acceptedNoIncoming, true);
    assert.equal(acceptedNoLastAccepted, true);
  });
});
