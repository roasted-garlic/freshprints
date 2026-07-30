/**
 * Regression coverage for items 2/5/7's shared structural fix: usePrintRequestDetail's own
 * mutation handlers (removeItem, updateItem, duplicateItem) must delegate to the context's
 * existing beginPendingItemRemovals/endPendingItemRemovals/patchWorkingItems mechanisms while
 * viewing the working request, and must guard every reload/restore with the per-item
 * ItemMutationGenerationTracker so a stale completion cannot overwrite a newer mutation.
 *
 * usePrintRequestDetail itself is a stateful React hook (useState/useEffect/context) and is not
 * DOM-rendered in this repo's test suite (docs/standards/TESTING.md's no-DOM-rendering
 * convention). The pure logic it depends on — ItemMutationGenerationTracker and
 * mergeServerWorkingItemsWithLocal — is covered directly in itemMutationGeneration.test.ts and
 * mergeServerWorkingItemsWithLocal.test.ts. This file verifies, via static source inspection
 * (the same pattern already used in PortalPrintRequestContext.boundary.test.ts), that the actual
 * wiring those pure-logic tests assume is present in the shipped hook source — not merely that
 * the pure helpers behave correctly in isolation.
 */
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { describe, it } from 'node:test';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const source = readFileSync(join(here, 'usePrintRequestDetail.ts'), 'utf8');

function sliceFunctionBody(functionName: string): string {
  const start = source.indexOf(`const ${functionName} = useCallback(`);
  assert.ok(start >= 0, `expected to find ${functionName} in usePrintRequestDetail.ts`);
  // Grab a generous window past the declaration — enough to cover the whole callback body
  // without needing a full parser; each handler below is well under this window in practice.
  // updateItem grew past 4000 chars after Amendment 2's server-authoritative quantity
  // reconciliation (Plan Section 20.2/20.4) — widened accordingly. Widened again after Amendment
  // 4's clamp-bypass fix (Plan Section 22.2) added further explanatory comments.
  return source.slice(start, start + 7000);
}

describe('usePrintRequestDetail — items 2/5/7 structural fix (source wiring)', () => {
  it('removeItem calls beginPendingItemRemovals before its callable and endPendingItemRemovals after', () => {
    const removeItemBody = sliceFunctionBody('removeItem');
    assert.match(removeItemBody, /beginPendingItemRemovals\(\[itemId\]\)/);
    assert.match(removeItemBody, /endPendingItemRemovals\(\[itemId\]\)/);
    // beginPendingItemRemovals must run before the removal callable, not after — otherwise a
    // concurrent reload could still resurrect the row during the callable's own round trip.
    const beginIndex = removeItemBody.indexOf('beginPendingItemRemovals([itemId])');
    const callableIndex = removeItemBody.indexOf('removePrintRequestItem(');
    assert.ok(beginIndex >= 0 && callableIndex >= 0 && beginIndex < callableIndex);
  });

  it('removeItem patches the shared workingItems (context) in addition to local items while viewing the working request', () => {
    const removeItemBody = sliceFunctionBody('removeItem');
    assert.match(removeItemBody, /if \(isViewingWorkingRequest\) \{\s*patchWorkingItems/);
  });

  it('removeItem is guarded by the per-item mutation generation tracker', () => {
    const removeItemBody = sliceFunctionBody('removeItem');
    assert.match(removeItemBody, /beginItemMutation\(itemId\)/);
  });

  it('updateItem always patches workingItems while viewing the working request (not only on a subset of paths)', () => {
    const updateItemBody = sliceFunctionBody('updateItem');
    assert.match(updateItemBody, /if \(isViewingWorkingRequest\) \{\s*\/\/[^\n]*\n(\s*\/\/[^\n]*\n)*\s*patchWorkingItems\(applyLocalItemPatch\)/);
  });

  it("updateItem's failure-path reload only applies for the still-latest mutation of that item id", () => {
    const updateItemBody = sliceFunctionBody('updateItem');
    assert.match(updateItemBody, /catch \(error\) \{\s*\/\/[^\n]*\n(\s*\/\/[^\n]*\n)*\s*if \(isLatestItemMutation\(itemId, generation\)\) \{/);
    // The failure path must re-throw so the caller (PortalPrintRequestItemCard's saveDraft) can
    // surface an honest "Save failed" state instead of silently swallowing the error.
    assert.match(updateItemBody, /throw error;/);
  });

  it('duplicateItem patches workingItems for both its optimistic insert and its real-id swap while viewing the working request', () => {
    const duplicateItemBody = sliceFunctionBody('duplicateItem');
    const patchCalls = duplicateItemBody.match(/patchWorkingItems\(/g) ?? [];
    assert.ok(
      patchCalls.length >= 2,
      `expected duplicateItem to call patchWorkingItems at least twice (optimistic insert + real-id swap), found ${patchCalls.length}`,
    );
  });
});
