import type { Design } from "../../designs/types/design.types";
import type { AiProcessingQueueRunState } from "../types/aiProcessingQueue.types";
import { isDesignAwaitingAiStart } from "./aiProcessingQueueEligibility";

export function findNextAwaitingIndex(designs: Design[], startIndex: number): number {
  for (let index = Math.max(0, startIndex); index < designs.length; index += 1) {
    if (isDesignAwaitingAiStart(designs[index]!)) {
      return index;
    }
  }

  return -1;
}

/** Index of the next awaiting design after one finishes processing. */
export function resolveAdvanceIndexAfterProcessing(
  designs: Design[],
  processedIndex: number,
  failed: boolean,
): number {
  const startIndex = failed ? processedIndex + 1 : processedIndex;
  return findNextAwaitingIndex(designs, startIndex);
}

export function shouldAutoQueueContinue(runState: AiProcessingQueueRunState): boolean {
  return runState === "running" || runState === "pausing";
}

/** When true, the auto-queue must not enqueue another design. */
export function shouldHaltAutoQueue(stopRequested: boolean): boolean {
  return stopRequested;
}

export type AutoQueueLoadMorePage = {
  appendedDesigns: readonly Design[];
  hasMore: boolean;
} | null;

export type AutoQueueLoadMoreContinuation =
  | { action: "continue"; nextIndex: number }
  | { action: "stop" };

/**
 * After a cursor page resolves during auto-queue, keep running when:
 * - newly loaded (or already loaded) awaiting designs remain, or
 * - the source still has more pages (possibly empty under the client filter).
 *
 * A final page (`hasMore: false`) that appended designs must still be processed — do not treat
 * end-of-cursor as end-of-work.
 */
export function resolveAutoQueueContinuationAfterLoadMore(input: {
  designs: readonly Design[];
  searchFromIndex: number;
  page: AutoQueueLoadMorePage;
}): AutoQueueLoadMoreContinuation {
  const searchFrom = Math.min(Math.max(0, input.searchFromIndex), input.designs.length);
  const nextIndex = findNextAwaitingIndex(input.designs as Design[], searchFrom);

  if (nextIndex >= 0) {
    return { action: "continue", nextIndex };
  }

  if (input.page?.hasMore) {
    return { action: "continue", nextIndex: searchFrom };
  }

  return { action: "stop" };
}

/**
 * Merge cursor-appended designs into the live ref immediately so the auto-queue does not wait on
 * a React effect flush (setTimeout(0) alone is not enough under concurrent rendering).
 */
export function mergeAppendedDesignsIntoList(
  current: readonly Design[],
  appended: readonly Design[],
): Design[] {
  if (appended.length === 0) {
    return current as Design[];
  }

  const knownIds = new Set(current.map((design) => design.id));
  const missing = appended.filter((design) => !knownIds.has(design.id));
  if (missing.length === 0) {
    return current as Design[];
  }

  return [...current, ...missing];
}

/** Prefetch the next cursor page when few awaiting designs remain in the loaded window. */
export const AI_PROCESSING_QUEUE_PREFETCH_AWAITING_THRESHOLD = 10;

export function shouldPrefetchNextAiProcessingPage(input: {
  hasMore: boolean;
  isLoadingMore: boolean;
  remainingAwaitingCount: number;
  threshold?: number;
}): boolean {
  if (!input.hasMore || input.isLoadingMore) {
    return false;
  }

  const threshold = input.threshold ?? AI_PROCESSING_QUEUE_PREFETCH_AWAITING_THRESHOLD;
  return input.remainingAwaitingCount <= threshold;
}
