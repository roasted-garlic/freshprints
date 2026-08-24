import type { ShowAllocationStatus } from "../types/showAllocation/showAllocation.enums";

/** Allocation statuses that may be transitioned to `done` when a show / gang sheet finishes. */
export const FINISHABLE_SHOW_ALLOCATION_STATUSES: readonly ShowAllocationStatus[] = [
  "pending",
  "queued",
  "in_progress",
];

export function isFinishableShowAllocationStatus(status: ShowAllocationStatus): boolean {
  return FINISHABLE_SHOW_ALLOCATION_STATUSES.includes(status);
}
