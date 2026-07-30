import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  resolveCurrentQuantityForEdit,
  resolveServerAuthoritativeQuantity,
} from './resolveQuantityCommitOutcome';

describe('resolveCurrentQuantityForEdit (Root Cause 2 — phantom `1` fallback hardening)', () => {
  it('resolves the current quantity when the item is found with a finite quantity', () => {
    const result = resolveCurrentQuantityForEdit({ quantity: 5 });
    assert.deepEqual(result, { ok: true, currentQuantity: 5 });
  });

  it('fails explicitly (not a silent `1`) when the item cannot be located', () => {
    const result = resolveCurrentQuantityForEdit(undefined);
    assert.deepEqual(result, { ok: false, reason: 'item-not-found' });
  });

  it('fails explicitly (not a silent `1`) when the located item has a non-finite quantity', () => {
    const result = resolveCurrentQuantityForEdit({ quantity: Number.NaN });
    assert.deepEqual(result, { ok: false, reason: 'item-not-found' });
  });
});

describe('resolveServerAuthoritativeQuantity (Root Cause 2 — server value must win)', () => {
  it('returns the server-accepted quantity even when it differs from any client guess', () => {
    // Server transaction-clamped the requested 7 down to 5 (room only for 5) — the client's own
    // optimistic clamp must never be committed instead of this.
    assert.equal(resolveServerAuthoritativeQuantity({ quantity: 5 }), 5);
  });

  it('returns the server value unchanged when it matches what was requested', () => {
    assert.equal(resolveServerAuthoritativeQuantity({ quantity: 1 }), 1);
  });
});
