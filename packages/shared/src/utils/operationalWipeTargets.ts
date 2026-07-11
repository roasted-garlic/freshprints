import type { OperationalWipeTarget } from "../types/admin/wipeOperationalTestData.types";

/** Collections deleted for operational wipes, in safe child→parent order. */
export const OPERATIONAL_WIPE_DELETE_COLLECTION_ORDER = [
  "staffInboxAcks",
  "gangSheetItems",
  "gangSheets",
  "showAllocations",
  "printRequestItems",
  "printRequests",
  "upcomingShows",
  "customerRequests",
  "showQueues",
  "showQueueItems",
  "designs",
] as const;

export type OperationalWipeDeleteCollection =
  (typeof OPERATIONAL_WIPE_DELETE_COLLECTION_ORDER)[number];

export interface ExpandedOperationalWipePlan {
  deleteCollections: OperationalWipeDeleteCollection[];
  resetSequences: boolean;
  resetDesignRequestStats: boolean;
  wipeDesignStorage: boolean;
  /**
   * When allocations are deleted but upcoming show docs are kept, zero denormalized
   * `allocatedQuantity` (and demote `productionStatus` from `full` → `open`) so Show Queue
   * no longer looks filled.
   */
  resetShowAllocationTotals: boolean;
}

const PRINT_REQUEST_STACK_COLLECTIONS: OperationalWipeDeleteCollection[] = [
  "gangSheetItems",
  "gangSheets",
  "showAllocations",
  "printRequestItems",
  "printRequests",
];

const SHOW_QUEUE_ATTACHMENT_COLLECTIONS: OperationalWipeDeleteCollection[] = [
  "gangSheetItems",
  "gangSheets",
  "showAllocations",
];

const UPCOMING_SHOW_COLLECTIONS: OperationalWipeDeleteCollection[] = [
  "gangSheetItems",
  "gangSheets",
  "showAllocations",
  "upcomingShows",
];

/**
 * Designs may only be wiped together with print requests (attachments must be gone first).
 * Returns a user-facing error message, or null when valid.
 */
export function getDesignsWipePrerequisiteError(
  targets: readonly OperationalWipeTarget[],
): string | null {
  if (!targets.includes("designs")) {
    return null;
  }

  if (!targets.includes("printRequests")) {
    return "Wiping designs requires wiping print requests first (select Print requests & items).";
  }

  return null;
}

/**
 * When enabling designs, also enable printRequests.
 * When enabling printRequests, also enable sequences (counter + customer sequences).
 * When disabling printRequests, disable designs.
 * Sequences cannot be cleared while printRequests remains selected.
 */
export function applyOperationalWipeTargetToggle(
  current: readonly OperationalWipeTarget[],
  target: OperationalWipeTarget,
  checked: boolean,
): OperationalWipeTarget[] {
  const next = new Set(current);

  if (checked) {
    next.add(target);
    if (target === "designs") {
      next.add("printRequests");
      next.add("sequences");
    }
    if (target === "printRequests") {
      next.add("sequences");
    }
  } else {
    next.delete(target);
    if (target === "printRequests") {
      next.delete("designs");
    }
    if (target === "sequences" && next.has("printRequests")) {
      next.add("sequences");
    }
  }

  return OPERATIONAL_WIPE_TARGETS_ORDER.filter((entry) => next.has(entry));
}

const OPERATIONAL_WIPE_TARGETS_ORDER: OperationalWipeTarget[] = [
  "printRequests",
  "showQueueAttachments",
  "upcomingShows",
  "sequences",
  "designRequestStats",
  "designs",
];

/**
 * Expands user-selected wipe targets into concrete collection deletes + field resets.
 * `printRequests` always clears queue attachments/gang data so shows are not left pointing
 * at deleted requests; `upcomingShows` docs themselves are only removed when that target is set.
 * `designs` deletes catalog docs and Storage originals/thumbnails/previews (requires printRequests).
 */
export function expandOperationalWipePlan(
  targets: readonly OperationalWipeTarget[],
): ExpandedOperationalWipePlan {
  const uniqueTargets = [...new Set(targets)];
  const deleteSet = new Set<OperationalWipeDeleteCollection>();

  for (const target of uniqueTargets) {
    if (target === "printRequests") {
      deleteSet.add("staffInboxAcks");
      for (const collectionName of PRINT_REQUEST_STACK_COLLECTIONS) {
        deleteSet.add(collectionName);
      }
      continue;
    }

    if (target === "showQueueAttachments") {
      deleteSet.add("staffInboxAcks");
      for (const collectionName of SHOW_QUEUE_ATTACHMENT_COLLECTIONS) {
        deleteSet.add(collectionName);
      }
      continue;
    }

    if (target === "upcomingShows") {
      deleteSet.add("staffInboxAcks");
      for (const collectionName of UPCOMING_SHOW_COLLECTIONS) {
        deleteSet.add(collectionName);
      }
      continue;
    }

    if (target === "designs") {
      deleteSet.add("designs");
    }
  }

  const wipeDesigns = uniqueTargets.includes("designs");
  const wipePrintRequests = uniqueTargets.includes("printRequests");
  const deleteCollections = OPERATIONAL_WIPE_DELETE_COLLECTION_ORDER.filter((collectionName) =>
    deleteSet.has(collectionName),
  );

  return {
    deleteCollections,
    // Wiping print requests always resets naming counters so the next request restarts at 001.
    resetSequences: uniqueTargets.includes("sequences") || wipePrintRequests,
    // Stats reset is pointless if designs themselves are deleted.
    resetDesignRequestStats: uniqueTargets.includes("designRequestStats") && !wipeDesigns,
    wipeDesignStorage: wipeDesigns,
    resetShowAllocationTotals:
      deleteSet.has("showAllocations") && !deleteSet.has("upcomingShows"),
  };
}

export const PRINT_REQUEST_RESET_PRESET_TARGETS: OperationalWipeTarget[] = [
  "printRequests",
  "sequences",
  "designRequestStats",
];

export const ALL_OPERATIONAL_WIPE_TARGETS: OperationalWipeTarget[] = [
  "printRequests",
  "showQueueAttachments",
  "upcomingShows",
  "sequences",
  "designRequestStats",
  "designs",
];

/** Storage prefixes removed when wiping designs (catalog assets only). */
export const DESIGN_STORAGE_WIPE_PREFIXES = ["originals/", "thumbnails/", "previews/"] as const;
