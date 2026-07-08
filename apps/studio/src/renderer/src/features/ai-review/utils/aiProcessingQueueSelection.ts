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
