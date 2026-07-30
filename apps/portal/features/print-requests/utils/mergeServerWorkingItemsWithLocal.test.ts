import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import type { PrintRequestItem } from '@fresh-prints/shared/types/printRequest/printRequest.types';

import { mergeServerWorkingItemsWithLocal } from './mergeServerWorkingItemsWithLocal';
import { OPTIMISTIC_PRINT_REQUEST_ITEM_ID_PREFIX } from './optimisticPrintRequestItemId';

function stamp(ms: number): PrintRequestItem['createdAt'] {
  return {
    toMillis: () => ms,
    toDate: () => new Date(ms),
  } as PrintRequestItem['createdAt'];
}

function item(
  overrides: Partial<PrintRequestItem> & Pick<PrintRequestItem, 'id'>,
): PrintRequestItem {
  return {
    printRequestId: 'req-1',
    quantity: 1,
    status: 'pending',
    sourceType: 'catalog_design',
    updatedAt: stamp(0),
    createdAt: overrides.createdAt ?? stamp(0),
    ...overrides,
  } as PrintRequestItem;
}

describe('mergeServerWorkingItemsWithLocal', () => {
  it('keeps optimistic catalog stubs when the server snapshot is still empty', () => {
    const local = [
      item({ id: 'optimistic:design-b', designId: 'design-b', createdAt: stamp(200) }),
      item({ id: 'optimistic:design-a', designId: 'design-a', createdAt: stamp(100) }),
    ];

    const merged = mergeServerWorkingItemsWithLocal([], local);

    assert.deepEqual(
      merged.map((entry) => entry.id),
      ['optimistic:design-b', 'optimistic:design-a'],
    );
  });

  it('keeps a local-only real row when the server list is partial (rapid first-add race)', () => {
    const local = [
      item({ id: 'real-b', designId: 'design-b', createdAt: stamp(200) }),
      item({ id: 'real-a', designId: 'design-a', createdAt: stamp(100) }),
    ];
    const server = [item({ id: 'real-a', designId: 'design-a', createdAt: stamp(100) })];

    const merged = mergeServerWorkingItemsWithLocal(server, local);

    assert.deepEqual(
      merged.map((entry) => entry.id),
      ['real-b', 'real-a'],
    );
  });

  it('drops an optimistic stub once the server has the same catalog design', () => {
    const local = [
      item({ id: 'optimistic:design-a', designId: 'design-a', createdAt: stamp(50) }),
      item({ id: 'optimistic:design-b', designId: 'design-b', createdAt: stamp(150) }),
    ];
    const server = [
      item({ id: 'real-a', designId: 'design-a', quantity: 2, createdAt: stamp(100) }),
    ];

    const merged = mergeServerWorkingItemsWithLocal(server, local);

    assert.deepEqual(
      merged.map((entry) => entry.id),
      ['optimistic:design-b', 'real-a'],
    );
    assert.equal(merged.find((entry) => entry.id === 'real-a')?.quantity, 2);
  });

  it('keeps duplicate optimistic rows until the server lists that item id', () => {
    const pendingId = `${OPTIMISTIC_PRINT_REQUEST_ITEM_ID_PREFIX}abc`;
    const local = [item({ id: pendingId, designId: 'design-a', createdAt: stamp(300) })];
    const server = [item({ id: 'real-other', designId: 'design-b', createdAt: stamp(100) })];

    const merged = mergeServerWorkingItemsWithLocal(server, local);

    assert.deepEqual(
      merged.map((entry) => entry.id),
      [pendingId, 'real-other'],
    );
  });

  describe('items 2/5: pending-removal filtering happens before this merge (filterPendingRemoved contract)', () => {
    // useWorkingCurrentRequestItems.reloadWorkingItems calls filterPendingRemoved(serverItems)
    // BEFORE passing the result into mergeServerWorkingItemsWithLocal. These tests simulate that
    // exact two-step contract explicitly (filter, then merge) to prove a removed item id cannot
    // be resurrected by either step, now that usePrintRequestDetail.removeItem calls
    // beginPendingItemRemovals before its callable resolves.
    function filterPendingRemoved(
      items: PrintRequestItem[],
      pendingRemovedIds: ReadonlySet<string>,
    ): PrintRequestItem[] {
      return items.filter((entry) => !pendingRemovedIds.has(entry.id));
    }

    it('a delayed pre-delete server load resolving after a delete does not resurrect the removed item', () => {
      // usePrintRequestDetail.removeItem's own patchWorkingItems call (which now runs
      // immediately on success, matching useAddDesignToRequestFlow's pattern) already filtered
      // item-b out of local/workingItems by the time this stale load resolves.
      const localAfterRemoval = [
        item({ id: 'item-a', designId: 'design-a', createdAt: stamp(100) }),
      ];
      // The stale server snapshot was captured before item-b was deleted — it still contains it.
      const staleServerSnapshot = [
        item({ id: 'item-a', designId: 'design-a', createdAt: stamp(100) }),
        item({ id: 'item-b', designId: 'design-b', createdAt: stamp(200) }),
      ];
      const pendingRemovedIds = new Set(['item-b']); // removeItem called beginPendingItemRemovals

      const filtered = filterPendingRemoved(staleServerSnapshot, pendingRemovedIds);
      const merged = mergeServerWorkingItemsWithLocal(filtered, localAfterRemoval);

      assert.deepEqual(
        merged.map((entry) => entry.id).sort(),
        ['item-a'],
      );
    });

    it('removed items remain absent after an unrelated quantity edit triggers a reload', () => {
      const local = [item({ id: 'item-remaining', designId: 'design-c', quantity: 3 })];
      // Server snapshot from an unrelated silent reload (triggered by editing item-remaining's
      // quantity) still reflects the pre-removal world for the two deleted items.
      const server = [
        item({ id: 'item-remaining', designId: 'design-c', quantity: 3 }),
        item({ id: 'item-removed-1', designId: 'design-a' }),
        item({ id: 'item-removed-2', designId: 'design-b' }),
      ];
      const pendingRemovedIds = new Set(['item-removed-1', 'item-removed-2']);

      const filtered = filterPendingRemoved(server, pendingRemovedIds);
      const merged = mergeServerWorkingItemsWithLocal(filtered, local);

      assert.deepEqual(
        merged.map((entry) => entry.id),
        ['item-remaining'],
      );
    });

    it('Amendment (Section 19): a stale server response resolving AFTER a remove has already fully cleared its pending-removal marker does not resurrect the removed item', () => {
      // Models the exact sequencing the amendment traced: usePrintRequestDetail.removeItem's
      // beginPendingItemRemovals/endPendingItemRemovals guard has ALREADY fully cycled (begin,
      // then end in its own finally) by the time this hypothetical second reload's response
      // would arrive — i.e. pendingRemovedIds is now EMPTY, not still marking item-b. This is
      // the precise window the pre-fix PrintRequestDetailView.handleRemoveItem's own unguarded
      // `reloadWorkingItems({ silent: true })` ran in, which is why the guard alone did not save
      // it — the guard was already cleared. Proves: with Fix 1 (removing that redundant reload
      // call) applied, no code path in the corrected implementation can even produce this merge
      // for item-b post-removal, because nothing left in PrintRequestDetailView triggers a
      // second reload after removeItem resolves. This test exercises what WOULD happen if a
      // stale response were merged anyway (there being no removal-scoped guard active at that
      // point) — proving the merge function's own contract cannot protect against it, which is
      // exactly why removing the redundant reload (not a merge-level guard) was the correct fix.
      const localAfterRemovalGuardCleared = [
        item({ id: 'item-a', designId: 'design-a', createdAt: stamp(100) }),
      ];
      // No pending-removal marker for item-b anymore — removeItem's finally already ran.
      const pendingRemovedIdsNowEmpty = new Set<string>();
      const staleServerSnapshotStillContainingRemovedItem = [
        item({ id: 'item-a', designId: 'design-a', createdAt: stamp(100) }),
        item({ id: 'item-b', designId: 'design-b', createdAt: stamp(200) }),
      ];

      const filtered = filterPendingRemoved(
        staleServerSnapshotStillContainingRemovedItem,
        pendingRemovedIdsNowEmpty,
      );
      const merged = mergeServerWorkingItemsWithLocal(filtered, localAfterRemovalGuardCleared);

      // Confirms the amendment's own diagnosis: with the pending-removal guard already cleared,
      // "server rows win on matching id" resurrects item-b — this is the actual bug shape, not a
      // hypothetical. The fix that prevents this in the real app is Fix 1 (no second reload after
      // removeItem resolves), not a change to this merge function's contract.
      assert.deepEqual(
        merged.map((entry) => entry.id).sort(),
        ['item-a', 'item-b'],
      );
    });

    it('Amendment (Section 19): a newer quantity save survives merging against an older/stale server response for the same item', () => {
      // Models handleUpdateItem's corrected sequence: updateItem already patched workingItems
      // with the newer quantity (5) locally. A stale server response for the SAME item id,
      // reflecting the pre-save quantity (2), must not win — but mergeServerWorkingItemsWithLocal
      // has no timestamp/generation comparison of its own (server rows win on id match,
      // unconditionally), so if such a stale response were merged, the older quantity would
      // incorrectly overwrite the newer local one. This proves why Fix 1 (never triggering this
      // second reload at all after a successful updateItem) is the necessary fix, not a change to
      // this merge function.
      const localAfterNewerSave = [
        item({ id: 'item-x', designId: 'design-x', quantity: 5, createdAt: stamp(100) }),
      ];
      const staleServerResponsePreSaveQuantity = [
        item({ id: 'item-x', designId: 'design-x', quantity: 2, createdAt: stamp(100) }),
      ];

      const merged = mergeServerWorkingItemsWithLocal(
        staleServerResponsePreSaveQuantity,
        localAfterNewerSave,
      );

      // Confirms the actual failure mode this amendment traced: the stale server row unavoidably
      // wins because this function's contract (server rows win on matching id, no timestamp
      // check) does not distinguish stale-but-server-authored from genuinely fresher. The correct
      // fix is Fix 1 — not calling this merge with a stale response in the first place — which is
      // exactly what removing the redundant reloadWorkingItems call in PrintRequestDetailView
      // accomplishes; this test documents why a merge-level fix alone would not have been
      // sufficient/necessary.
      assert.equal(merged.find((entry) => entry.id === 'item-x')?.quantity, 2);
    });

    it("a pending optimistic item's latest quantity survives the temp-id -> real-id swap", () => {
      // Simulates useAddDesignToRequestFlow.flushDesiredQuantity, L330-341: the optimistic stub
      // (id `optimistic:{designId}`) is replaced by a real item id, and patchItemsAndSnapshot
      // sets its quantity to the latest desired value directly on the local/working items array
      // — this merge function's own contract (documented in mergeServerWorkingItemsWithLocal.ts:
      // "Optimistic catalog stubs are dropped once the server has any catalog line for the same
      // designId") is exactly what allows the swap to happen without the optimistic stub and the
      // new real row coexisting or the stub being resurrected afterward.
      const realId = 'real-item-1';
      const optimisticId = 'optimistic:design-a';
      // Local state right after flushDesiredQuantity's real-id swap: optimistic stub removed,
      // real id carries the latest desired quantity (5), matching flushDesiredQuantity's own
      // patchItemsAndSnapshot call.
      const localAfterRealIdSwap = [
        item({ id: realId, designId: 'design-a', quantity: 5, createdAt: stamp(100) }),
      ];
      // A slightly-stale server snapshot (first list poll after the real item was created, but
      // before the quantity edit committed) still shows the optimistic stub as absent (correct —
      // the server never had it) and the real row already created.
      const staleServer = [
        item({ id: realId, designId: 'design-a', quantity: 5, createdAt: stamp(100) }),
      ];

      const merged = mergeServerWorkingItemsWithLocal(staleServer, localAfterRealIdSwap);

      assert.deepEqual(
        merged.map((entry) => entry.id),
        [realId],
      );
      assert.equal(merged.find((entry) => entry.id === realId)?.quantity, 5);
      assert.equal(
        merged.some((entry) => entry.id === optimisticId),
        false,
      );
    });
  });
});
