/**
 * Staff Artwork hard-delete / promote-removal reference checks.
 *
 * Rule: artwork attached to a print request may be removed only when that attachment
 * was allocated to a show or internal sheet whose `productionStatus` is `completed`.
 * Attachments with no completed show/sheet allocation remain blocking.
 */

export const STAFF_ARTWORK_COMPLETED_SHOW_PRODUCTION_STATUS = "completed" as const;

export type StaffArtworkDeletionBlockerCode =
  | "print_request_item"
  | "show_allocation"
  | "gang_sheet_item"
  | "unexpected_storage_path";

export interface StaffArtworkDeletionPrintRequestItemRef {
  id: string;
}

export interface StaffArtworkDeletionAllocationRef {
  printRequestItemId?: string | null;
  upcomingShowId?: string | null;
  status?: string | null;
}

export interface StaffArtworkDeletionGangSheetItemRef {
  upcomingShowId?: string | null;
}

export function isStaffArtworkShowProductionCompleted(status: unknown): boolean {
  return status === STAFF_ARTWORK_COMPLETED_SHOW_PRODUCTION_STATUS;
}

function uniqueCodes(codes: StaffArtworkDeletionBlockerCode[]): StaffArtworkDeletionBlockerCode[] {
  return [...new Set(codes)];
}

/**
 * Returns blocker codes when Staff Artwork still has active production references.
 * Completed show/internal-sheet allocations release print-request and allocation blockers.
 */
export function resolveStaffArtworkDeletionBlockers(input: {
  printRequestItems: StaffArtworkDeletionPrintRequestItemRef[];
  allocations: StaffArtworkDeletionAllocationRef[];
  gangSheetItems: StaffArtworkDeletionGangSheetItemRef[];
  /** upcomingShowId → productionStatus */
  showProductionStatusById: Record<string, unknown>;
  hasUnexpectedStoragePath?: boolean;
}): StaffArtworkDeletionBlockerCode[] {
  const blockers: StaffArtworkDeletionBlockerCode[] = [];
  const showStatus = input.showProductionStatusById;

  const isShowCompleted = (showId: unknown): boolean => {
    if (typeof showId !== "string" || !showId.trim()) return false;
    return isStaffArtworkShowProductionCompleted(showStatus[showId.trim()]);
  };

  const nonCanceledAllocations = input.allocations.filter(
    (allocation) => allocation.status !== "canceled",
  );

  for (const item of input.printRequestItems) {
    const itemAllocations = nonCanceledAllocations.filter(
      (allocation) => allocation.printRequestItemId === item.id,
    );
    if (itemAllocations.length === 0) {
      blockers.push("print_request_item");
      continue;
    }
    const allOnCompletedShows = itemAllocations.every((allocation) =>
      isShowCompleted(allocation.upcomingShowId),
    );
    if (!allOnCompletedShows) {
      blockers.push("print_request_item");
    }
  }

  for (const allocation of nonCanceledAllocations) {
    if (!isShowCompleted(allocation.upcomingShowId)) {
      blockers.push("show_allocation");
    }
  }

  for (const gangItem of input.gangSheetItems) {
    if (!isShowCompleted(gangItem.upcomingShowId)) {
      blockers.push("gang_sheet_item");
    }
  }

  if (input.hasUnexpectedStoragePath === true) {
    blockers.push("unexpected_storage_path");
  }

  return uniqueCodes(blockers);
}

export function describeStaffArtworkDeletionBlockers(
  blockers: readonly string[],
): string {
  if (blockers.length === 0) return "";
  const labels = blockers.map((code) => {
    switch (code) {
      case "print_request_item":
        return "still on a print request that is not on a completed show or internal sheet";
      case "show_allocation":
        return "still allocated to a show or internal sheet that is not completed";
      case "gang_sheet_item":
        return "still placed on a gang sheet for a show or internal sheet that is not completed";
      case "unexpected_storage_path":
        return "has an unexpected storage path";
      default:
        return code;
    }
  });
  return labels.join("; ");
}
