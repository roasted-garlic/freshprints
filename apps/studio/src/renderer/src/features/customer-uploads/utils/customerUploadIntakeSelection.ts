/**
 * After a pending row leaves the list (promote / exclude), keep selection near the
 * removed card: prefer the card above; if the top card was removed, take the new top.
 */
export function resolveIntakeSelectionAfterRemoval(options: {
  selectedId: string | null;
  removedId: string;
  rowIdsBeforeRemoval: readonly string[];
}): string | null {
  const { selectedId, removedId, rowIdsBeforeRemoval } = options;
  if (selectedId !== removedId) {
    return selectedId;
  }

  const removedIndex = rowIdsBeforeRemoval.indexOf(removedId);
  if (removedIndex > 0) {
    return rowIdsBeforeRemoval[removedIndex - 1] ?? null;
  }

  const remaining = rowIdsBeforeRemoval.filter((id) => id !== removedId);
  return remaining[0] ?? null;
}
