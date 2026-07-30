/**
 * Per-item monotonic mutation generation, extracted as a pure/directly-testable class so a
 * stale reload/sync resolving after a newer removeItem/updateItem/duplicateItem call for the
 * same item id can be detected and discarded — mirrors the reloadEpochRef pattern already
 * proven in useWorkingCurrentRequestItems.ts, scoped per item id instead of per hook instance.
 *
 * Used by usePrintRequestDetail.ts (items 2/5 stale-completion guard). Kept in its own module,
 * pure of React, so it can be unit-tested directly per this repo's hook-testing convention
 * (docs/standards/TESTING.md) without rendering the hook.
 */
export class ItemMutationGenerationTracker {
  private readonly generationByItemId = new Map<string, number>();

  /** Call at the start of a mutation for `itemId`; returns the generation token to check later. */
  begin(itemId: string): number {
    const next = (this.generationByItemId.get(itemId) ?? 0) + 1;
    this.generationByItemId.set(itemId, next);
    return next;
  }

  /** True only if no newer mutation for `itemId` has started since `generation` was issued. */
  isLatest(itemId: string, generation: number): boolean {
    return this.generationByItemId.get(itemId) === generation;
  }
}
