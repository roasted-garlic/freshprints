export function toggleAiReviewMultiSelectId(
  selectedIds: readonly string[],
  id: string,
): string[] {
  return selectedIds.includes(id)
    ? selectedIds.filter((existing) => existing !== id)
    : [...selectedIds, id];
}

export function seedAiReviewMultiSelectIds(selectedDesignId: string | null): string[] {
  return selectedDesignId ? [selectedDesignId] : [];
}

export function isAiReviewQueueCardHighlighted(input: {
  designId: string;
  isMultiSelectMode: boolean;
  multiSelectedIds: readonly string[];
  selectedDesignId: string | null;
}): boolean {
  if (input.isMultiSelectMode) {
    return input.multiSelectedIds.includes(input.designId);
  }

  return input.designId === input.selectedDesignId;
}

export function resolveAiReviewQueueCardClick(input: {
  isMultiSelectMode: boolean;
  shiftKey?: boolean;
}): "toggle-multi" | "range-multi" | "focus-single" {
  if (!input.isMultiSelectMode) {
    return "focus-single";
  }

  return input.shiftKey ? "range-multi" : "toggle-multi";
}

export function applyAiReviewMultiSelectRange(input: {
  anchorId: string | null;
  listIds: readonly string[];
  selectedIds: readonly string[];
  targetId: string;
}): { selectedIds: string[]; anchorId: string } {
  const targetIndex = input.listIds.indexOf(input.targetId);
  const anchorIndex =
    input.anchorId === null ? -1 : input.listIds.indexOf(input.anchorId);
  const resolvedAnchorIndex = anchorIndex >= 0 ? anchorIndex : targetIndex;

  if (targetIndex < 0 || resolvedAnchorIndex < 0) {
    const selected = input.listIds.includes(input.targetId)
      ? [...new Set([...input.selectedIds, input.targetId])]
      : [...input.selectedIds];
    return {
      selectedIds: input.listIds.filter((id) => selected.includes(id)),
      anchorId: input.anchorId ?? input.targetId,
    };
  }

  const from = Math.min(resolvedAnchorIndex, targetIndex);
  const to = Math.max(resolvedAnchorIndex, targetIndex);
  const selectedIds = input.listIds.slice(from, to + 1);

  return {
    selectedIds,
    anchorId: input.listIds[resolvedAnchorIndex] ?? input.targetId,
  };
}

export function emptyAiReviewMultiSelectState(): {
  isMultiSelectMode: boolean;
  multiSelectedIds: string[];
} {
  return {
    isMultiSelectMode: false,
    multiSelectedIds: [],
  };
}

export function resolveAiReviewHardDeleteTargets<T extends { id: string }>(input: {
  designs: readonly T[];
  isMultiSelectMode: boolean;
  multiSelectedIds: readonly string[];
  selectedDesign: T | null;
}): T[] {
  if (input.isMultiSelectMode) {
    const selected = new Set(input.multiSelectedIds);
    return input.designs.filter((design) => selected.has(design.id));
  }

  return input.selectedDesign ? [input.selectedDesign] : [];
}

export function collectSuccessfulHardDeleteIds(
  results: readonly { designId: string; status: string }[],
): string[] {
  return results
    .filter(
      (result) => result.status === "deleted" || result.status === "skipped_already_deleted",
    )
    .map((result) => result.designId);
}

/** Highest list index first so remaining-row advance stays valid after each local remove. */
export function orderHardDeleteReconcileIds(input: {
  deletedIds: readonly string[];
  listIds: readonly string[];
}): string[] {
  const deleted = new Set(input.deletedIds);
  return input.listIds.filter((id) => deleted.has(id)).reverse();
}
