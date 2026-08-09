/**
 * Bounded monotonic reconciliation for AI Processing list loads.
 *
 * Once a terminal AI patch has confirmed a design left `pending` during the current processing
 * run, a later list response must not reinsert that design as `pending` (stale Firestore lag or
 * 15s designPageCache hit). Explicit retry/rerun clears the ledger entry so the same design may
 * legitimately return to Processing later.
 */

export type TerminalAiProcessingLedger = Map<string, { leftPendingAtMs: number }>;

export function createTerminalAiProcessingLedger(): TerminalAiProcessingLedger {
  return new Map();
}

/** True when a patch moves aiReviewStatus off `pending` (typical: needs_review). */
export function patchLeavesAiProcessingPending(
  patch: Readonly<{ aiReviewStatus?: string | null }>,
): boolean {
  return typeof patch.aiReviewStatus === "string" && patch.aiReviewStatus !== "pending";
}

export function recordTerminalAiProcessingPatch(
  ledger: TerminalAiProcessingLedger,
  designId: string,
  patch: Readonly<{ aiReviewStatus?: string | null }>,
  nowMs: number = Date.now(),
): boolean {
  const id = designId.trim();
  if (!id || !patchLeavesAiProcessingPending(patch)) {
    return false;
  }
  ledger.set(id, { leftPendingAtMs: nowMs });
  return true;
}

export function clearTerminalAiProcessingLedgerEntry(
  ledger: TerminalAiProcessingLedger,
  designId: string,
): void {
  const id = designId.trim();
  if (!id) {
    return;
  }
  ledger.delete(id);
}

export function hasTerminalAiProcessingLedgerEntry(
  ledger: TerminalAiProcessingLedger,
  designId: string,
): boolean {
  return ledger.has(designId.trim());
}

/**
 * For Processing tab pending-list accepts: drop incoming designs that the ledger already recorded
 * as having left pending in this run. No-op when the query is not a pending Processing list or the
 * ledger is empty (Design Library and other callers unaffected).
 */
export function applyMonotonicPendingProcessingListMerge<T extends { id: string; aiReviewStatus?: string }>(input: {
  incoming: readonly T[];
  ledger: TerminalAiProcessingLedger;
  /** When true, this load is the AI Review Processing `aiReviewStatus: "pending"` query. */
  isPendingProcessingQuery: boolean;
}): T[] {
  if (!input.isPendingProcessingQuery || input.ledger.size === 0) {
    return [...input.incoming];
  }

  return input.incoming.filter((design) => {
    if (!input.ledger.has(design.id)) {
      return true;
    }
    // Ledgered designs must not re-enter the pending Processing list via stale confirmation.
    // If the server already advanced them, they typically won't appear in a pending query; if a
    // stale/cached page still lists them as pending, omit them.
    return design.aiReviewStatus !== undefined && design.aiReviewStatus !== "pending";
  });
}
