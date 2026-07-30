/**
 * Source-wiring regression for ADR-FP-122 (Plan Section 23, Amendment 5): the one-Portal-request-
 * per-customer-per-show uniqueness rule (ADR-FP-102 Decision §5) is removed from
 * `queuePortalPrintRequestToShow` — a customer may now submit multiple separate print requests to
 * the same show, accumulating toward the shared per-customer-per-show limit `L`.
 *
 * This callable has no existing behavior-level test harness (it reads/writes via the Admin SDK
 * directly, no emulator wiring exists for it in this repo today) — the primary behavior-level
 * evidence for the actual boundary math lives in `printRequestPerShowCustomerCap.test.ts`
 * (`wouldExceedPerShowCustomerCap`/`sumCustomerQuantityOnShow`, which this callable calls directly
 * and unchanged). This file supplements that with a source-presence check proving the specific
 * uniqueness-blocking `if` statements were actually deleted, not just reworded — per this repo's own
 * stated convention, a regex/source check may supplement but never be sole evidence, and it is not
 * sole evidence here.
 */
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { describe, it } from 'node:test';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const source = readFileSync(join(here, 'queuePortalPrintRequestToShow.ts'), 'utf8');

describe('ADR-FP-122 — one-request-per-show uniqueness removed from queuePortalPrintRequestToShow', () => {
  it('the pre-transaction "already have a print request on this show" throw is gone', () => {
    assert.equal(
      /already have a print request on this show/.test(source),
      false,
      'the uniqueness-block error string must no longer appear anywhere in this file',
    );
  });

  it('existingOnShowQty is still computed (needed for the quantity-cap math) but no longer gates on "> 0"', () => {
    assert.match(source, /const existingOnShowQty = sumCustomerQuantityOnShow/);
    assert.equal(
      /if \(existingOnShowQty > 0\)/.test(source),
      false,
      'the removed pre-transaction uniqueness gate must not still be present',
    );
  });

  it('freshCustomerOnShowQty is still computed inside the transaction (needed for capRemaining) but no longer gates on "> 0"', () => {
    assert.match(source, /const freshCustomerOnShowQty = sumCustomerQuantityOnShow/);
    assert.equal(
      /if \(freshCustomerOnShowQty > 0\)/.test(source),
      false,
      'the removed in-transaction uniqueness gate must not still be present',
    );
  });

  it('the authoritative transaction eligibility check uses the fresh customer quantity and request allocation state', () => {
    assert.match(source, /const transactionBlockReason = getPortalQueueTransactionBlockReason\(\{/);
    assert.match(source, /requestHasExistingAllocation: freshRequestHasAllocation/);
    assert.match(source, /existingCustomerQuantityOnShow: freshCustomerOnShowQty/);
    assert.match(source, /newRequestQuantity: batchQuantity/);
    assert.match(source, /customerShowCap: L/);
    assert.match(source, /transactionBlockReason === "customer_show_cap_exceeded"/);
  });

  it('the pre-transaction planPortalShowQueueFit call (the client-visible preflight check) is unchanged and still present', () => {
    assert.match(source, /const fit = planPortalShowQueueFit\(/);
  });

  it('the separate per-request one-show structural invariant (a single request cannot be queued twice) remains untouched', () => {
    // Distinct from the removed customer-uniqueness rule — this guards against re-queuing the SAME
    // print request, which ADR-FP-122 does not affect.
    assert.match(source, /This request is already tied to a show/);
    assert.match(source, /hasExistingAllocation/);
    assert.match(source, /freshRequestHasAllocation/);
  });
});
