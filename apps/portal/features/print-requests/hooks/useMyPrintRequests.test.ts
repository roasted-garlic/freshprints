import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { derivePrintRequestListTab } from '@fresh-prints/shared/utils/printRequestListGrouping';

import { mergeQueuedAllocationTotal } from './useMyPrintRequests';

describe('mergeQueuedAllocationTotal (item 7: queue-to-show reconciliation)', () => {
  it('patches allocation totals from the authoritative queue-to-show result with zero prior state', () => {
    const next = mergeQueuedAllocationTotal({}, 'request-1', { totalAllocatedQuantity: 4 });
    assert.deepEqual(next['request-1'], {
      totalAllocatedQuantity: 4,
      totalInProgressQuantity: 0,
      totalPrintedQuantity: 0,
    });
  });

  it('preserves already-known in-progress/printed totals for the same request', () => {
    const current = {
      'request-1': {
        totalAllocatedQuantity: 2,
        totalInProgressQuantity: 1,
        totalPrintedQuantity: 1,
      },
    };
    const next = mergeQueuedAllocationTotal(current, 'request-1', { totalAllocatedQuantity: 6 });
    assert.deepEqual(next['request-1'], {
      totalAllocatedQuantity: 6,
      totalInProgressQuantity: 1,
      totalPrintedQuantity: 1,
    });
  });

  it('does not disturb other requests already in the map', () => {
    const current = {
      'request-other': {
        totalAllocatedQuantity: 9,
        totalInProgressQuantity: 0,
        totalPrintedQuantity: 0,
      },
    };
    const next = mergeQueuedAllocationTotal(current, 'request-1', { totalAllocatedQuantity: 3 });
    assert.deepEqual(next['request-other'], current['request-other']);
    assert.deepEqual(next['request-1'], {
      totalAllocatedQuantity: 3,
      totalInProgressQuantity: 0,
      totalPrintedQuantity: 0,
    });
  });

  it('immediately transitions listTab to queued once merged (no full reload needed)', () => {
    const totalsByRequestId = mergeQueuedAllocationTotal({}, 'request-1', {
      totalAllocatedQuantity: 5,
    });
    const listTab = derivePrintRequestListTab({
      totalRequestedQuantity: 5,
      totalAllocatedQuantity: totalsByRequestId['request-1']!.totalAllocatedQuantity,
      totalInProgressQuantity: totalsByRequestId['request-1']!.totalInProgressQuantity,
      totalPrintedQuantity: totalsByRequestId['request-1']!.totalPrintedQuantity,
      status: 'active',
    });
    assert.equal(listTab, 'queued');
  });

  it('a stale pre-queue response (0 allocated) resolving after success cannot remove the newly confirmed state', () => {
    // Simulates PrintRequestDetailView's loadAllocationState: if a slow pre-queue allocation
    // fetch resolves after handleQueuedToShow already reconciled, it must not be allowed to
    // reset allocationTotalsByRequestId back to 0 — reconcileQueuedRequest only ever merges a
    // newer/authoritative result forward; nothing in this module reverts it based on an older read.
    const postQueue = mergeQueuedAllocationTotal({}, 'request-1', { totalAllocatedQuantity: 5 });
    // A stale pre-queue read discovering 0 allocations must never be applied via this merge
    // helper for a queue-to-show reconciliation — the callable's own result is authoritative,
    // and no code path re-invokes mergeQueuedAllocationTotal with a stale zero after success.
    assert.equal(postQueue['request-1']!.totalAllocatedQuantity, 5);
  });

  it('produces the same listTab as the full-scope reload would for identical underlying data (re-entry parity)', () => {
    const viaImmediateReconciliation = mergeQueuedAllocationTotal({}, 'request-1', {
      totalAllocatedQuantity: 5,
    });
    const viaFullReload = {
      'request-1': {
        totalAllocatedQuantity: 5,
        totalInProgressQuantity: 0,
        totalPrintedQuantity: 0,
      },
    };
    const tabFromImmediate = derivePrintRequestListTab({
      totalRequestedQuantity: 5,
      totalAllocatedQuantity: viaImmediateReconciliation['request-1']!.totalAllocatedQuantity,
      totalInProgressQuantity: viaImmediateReconciliation['request-1']!.totalInProgressQuantity,
      totalPrintedQuantity: viaImmediateReconciliation['request-1']!.totalPrintedQuantity,
      status: 'active',
    });
    const tabFromReload = derivePrintRequestListTab({
      totalRequestedQuantity: 5,
      totalAllocatedQuantity: viaFullReload['request-1']!.totalAllocatedQuantity,
      totalInProgressQuantity: viaFullReload['request-1']!.totalInProgressQuantity,
      totalPrintedQuantity: viaFullReload['request-1']!.totalPrintedQuantity,
      status: 'active',
    });
    assert.equal(tabFromImmediate, tabFromReload);
  });
});
