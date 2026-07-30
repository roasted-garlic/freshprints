import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { shouldApplyReloadedItems } from './printRequestDetailItemsReloadAuthority';

describe('shouldApplyReloadedItems (Root Cause 1 — reload() item-authority gate)', () => {
  it('rejects reload-fetched items while viewing the working request', () => {
    assert.equal(
      shouldApplyReloadedItems({ isViewingWorkingRequestAtApplyTime: true }),
      false,
    );
  });

  it('accepts reload-fetched items for a historical/non-working request', () => {
    assert.equal(
      shouldApplyReloadedItems({ isViewingWorkingRequestAtApplyTime: false }),
      true,
    );
  });
});
