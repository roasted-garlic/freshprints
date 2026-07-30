import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { resolveSavedDraftReconciliation } from './resolveSavedDraftReconciliation';

function buildSignature(quantity: number, width: number, height: number): string {
  return JSON.stringify({
    quantity,
    width: Number.isFinite(width) ? Number(width.toFixed(2)) : width,
    height: Number.isFinite(height) ? Number(height.toFixed(2)) : height,
  });
}

describe('resolveSavedDraftReconciliation (item-card saveDraft success, Plan Section 21.1/21.4 Fix 1)', () => {
  it('rewrites quantityInput to the server-accepted value when the server clamped a rejected request', () => {
    // Typed 7, server accepted 5 (over-cap clamp).
    const result = resolveSavedDraftReconciliation({
      acceptedQuantity: 5,
      printWidthInches: 4,
      printHeightInches: 4,
      currentQuantityInput: '7',
      buildSignature,
    });

    assert.equal(result.quantityInput, '5', 'field must show the accepted value, not the rejected typed value');
    assert.equal(result.lastSavedSignature, buildSignature(5, 4, 4));
  });

  it('leaves quantityInput untouched when the accepted value matches what was typed', () => {
    const result = resolveSavedDraftReconciliation({
      acceptedQuantity: 5,
      printWidthInches: 4,
      printHeightInches: 4,
      currentQuantityInput: '5',
      buildSignature,
    });

    assert.equal(result.quantityInput, '5');
  });

  it('the resulting signature is built from the ACCEPTED value, never the requested one', () => {
    const result = resolveSavedDraftReconciliation({
      acceptedQuantity: 1,
      printWidthInches: 4,
      printHeightInches: 4,
      currentQuantityInput: '30',
      buildSignature,
    });

    assert.equal(result.lastSavedSignature, buildSignature(1, 4, 4));
    assert.notEqual(result.lastSavedSignature, buildSignature(30, 4, 4));
  });
});
