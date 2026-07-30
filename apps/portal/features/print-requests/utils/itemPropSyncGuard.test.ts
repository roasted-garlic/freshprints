import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { shouldAcceptIncomingItemProp } from './itemPropSyncGuard';

/**
 * Amendment (Plan Section 19.1 second contributing cause / 19.2 item 2 / 19.6): proves the
 * actual state transition PortalPrintRequestItemCard's prop-sync effect must get right — not
 * just that a function was called. Models the real sequence: a card saves a newer value (its
 * own `saveDraft` success branch advances the accepted marker), then a LATER, independent,
 * unguarded reload (e.g. CurrentRequestDrawer's own reloadWorkingItems, out of scope to remove)
 * delivers a stale pre-save `item` prop for the same item. The guard must reject that stale
 * prop, while still accepting a genuinely newer external update that arrives afterward.
 */
describe('shouldAcceptIncomingItemProp (item-card prop-sync guard, Section 19.2 item 2)', () => {
  it('rejects a stale reload prop arriving after this card already accepted a newer save', () => {
    // Card saved quantity 5 at t=200 (saveDraft's success branch recorded updatedAtMs=200).
    // A stale reload (e.g. from CurrentRequestDrawer, triggered by removing a different item)
    // resolves afterward and delivers a prop still carrying the pre-save quantity (2) at t=100.
    const accepted = shouldAcceptIncomingItemProp({
      incomingSignature: JSON.stringify({ quantity: 2, width: 1, height: 1 }),
      lastSavedSignature: JSON.stringify({ quantity: 5, width: 1, height: 1 }),
      incomingUpdatedAtMs: 100,
      lastAcceptedUpdatedAtMs: 200,
    });

    assert.equal(
      accepted,
      false,
      'a prop older than the last accepted update must not overwrite the newer local save',
    );
  });

  it('accepts a genuine newer external update (not a stale reload artifact)', () => {
    // A real newer edit — e.g. from another device/tab, or a legitimate later save — carries a
    // strictly newer updatedAt than what this card last accepted. The guard must not permanently
    // freeze the card against real updates.
    const accepted = shouldAcceptIncomingItemProp({
      incomingSignature: JSON.stringify({ quantity: 8, width: 1, height: 1 }),
      lastSavedSignature: JSON.stringify({ quantity: 5, width: 1, height: 1 }),
      incomingUpdatedAtMs: 300,
      lastAcceptedUpdatedAtMs: 200,
    });

    assert.equal(accepted, true, 'a genuinely newer external update must still be applied');
  });

  it('accepts a prop carrying the same updatedAt as the last accepted one (equal, not older)', () => {
    // Equal timestamps arise e.g. right after this card's own save round-trips back through
    // props with the same Date.now() stand-in — must not be treated as "older" and rejected.
    const accepted = shouldAcceptIncomingItemProp({
      incomingSignature: JSON.stringify({ quantity: 5, width: 2, height: 2 }),
      lastSavedSignature: JSON.stringify({ quantity: 5, width: 1, height: 1 }),
      incomingUpdatedAtMs: 200,
      lastAcceptedUpdatedAtMs: 200,
    });

    assert.equal(accepted, true);
  });

  it('is a no-op (rejects, but harmlessly) when the incoming signature matches the last saved one', () => {
    const accepted = shouldAcceptIncomingItemProp({
      incomingSignature: JSON.stringify({ quantity: 5, width: 1, height: 1 }),
      lastSavedSignature: JSON.stringify({ quantity: 5, width: 1, height: 1 }),
      incomingUpdatedAtMs: 50, // older, but irrelevant — nothing actually changed
      lastAcceptedUpdatedAtMs: 200,
    });

    assert.equal(accepted, false);
  });

  it('falls back to signature-only behavior when updatedAt is unavailable on either side (e.g. optimistic rows)', () => {
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
