import type { OperationalWipeTarget } from "../types/admin/wipeOperationalTestData.types";

/** Collections deleted for operational wipes, in safe child→parent order. */
export const OPERATIONAL_WIPE_DELETE_COLLECTION_ORDER = [
  "staffInboxAcks",
  "staffInboxAlertDeliveries",
  "assistedCreationUpdateAcks",
  "customerNotifications",
  "emailDeliveryJobs",
  "gangSheetItems",
  "gangSheets",
  "showAllocations",
  "printRequestItems",
  "printRequests",
  "upcomingShows",
  "customerRequests",
  "showQueues",
  "showQueueItems",
  "customerUploadIdempotency",
  "customerUploadFinalizeLeases",
  "customerUploadRateLimits",
  "printRequestDesignDailyLimits",
  "customerUploads",
  "customerUploadBatches",
  "designs",
  "customRequestEtsySearchRateLimits",
  "customRequests",
  "etsySuggestionRequests",
  "etsyRecommendationSuggestions",
  "etsyWebsiteSearchCache",
  "etsyRecommendationConfig",
  "etsyRecommendationRateLimits",
  "etsyRecommendationRequests",
  "assistedCreationRequests",
] as const;

export type OperationalWipeDeleteCollection =
  (typeof OPERATIONAL_WIPE_DELETE_COLLECTION_ORDER)[number];

export interface ExpandedOperationalWipePlan {
  deleteCollections: OperationalWipeDeleteCollection[];
  resetSequences: boolean;
  resetDesignRequestStats: boolean;
  wipeDesignStorage: boolean;
  /**
   * Selectively delete AI Processing page designs (imported/processing/rejected inbox)
   * and their Storage objects only. Skipped when full `wipeDesignStorage` / designs
   * collection wipe is also selected.
   */
  wipeAiProcessingDesigns: boolean;
  wipeCustomerUploadStorage: boolean;
  wipeAssistedCreationStorage: boolean;
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
  "printRequestDesignDailyLimits",
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
    return "Wiping designs requires wiping print requests first (select Print Requests).";
  }

  return null;
}

/**
 * When enabling designs, also enable printRequests and clear aiProcessingDesigns
 * (full catalog wipe supersedes selective AI Processing wipe).
 * When enabling aiProcessingDesigns, clear designs (selective vs full are mutually exclusive).
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
      next.delete("aiProcessingDesigns");
    }
    if (target === "aiProcessingDesigns") {
      next.delete("designs");
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
  "aiProcessingDesigns",
  "customerUploads",
  "printRequestDesignDailyLimits",
  "etsySearches",
  "assistedCreationRequests",
];

/**
 * Expands user-selected wipe targets into concrete collection deletes + field resets.
 * `printRequests` always clears queue attachments/gang data so shows are not left pointing
 * at deleted requests; `upcomingShows` docs themselves are only removed when that target is set.
 * `designs` deletes catalog docs and Storage originals/thumbnails/previews (requires printRequests).
 * `aiProcessingDesigns` selectively deletes AI Processing page designs + their Storage only
 * (keeps ready/archived); skipped when full `designs` is also selected.
 * `customerUploads` deletes upload docs/ops collections and `customer-uploads/` Storage.
 * `printRequestDesignDailyLimits` deletes obsolete Cap A Chicago-day counter leftovers only.
 * Those counters are no longer written or enforced, and cleanup does not affect current limit L,
 * customer room, or show capacity. Keeps print requests / stash and is also cleared when
 * `printRequests` is wiped.
 * `etsySearches` deletes Portal Find a design request docs, Open API rate-limit docs, inert
 * legacy Etsy cache/config / customRequest rate-limit leftovers, suggestion overlays, and
 * pending suggestion requests.
 * `assistedCreationRequests` deletes Assisted Creation docs, `assisted-creation/` Storage,
 * staff update acks, customer notifications, email delivery jobs, and legacy `customRequests`.
 */
export function expandOperationalWipePlan(
  targets: readonly OperationalWipeTarget[],
): ExpandedOperationalWipePlan {
  const uniqueTargets = [...new Set(targets)];
  const deleteSet = new Set<OperationalWipeDeleteCollection>();

  for (const target of uniqueTargets) {
    if (target === "printRequests") {
      deleteSet.add("staffInboxAcks");
      deleteSet.add("staffInboxAlertDeliveries");
      for (const collectionName of PRINT_REQUEST_STACK_COLLECTIONS) {
        deleteSet.add(collectionName);
      }
      continue;
    }

    if (target === "showQueueAttachments") {
      deleteSet.add("staffInboxAcks");
      deleteSet.add("staffInboxAlertDeliveries");
      for (const collectionName of SHOW_QUEUE_ATTACHMENT_COLLECTIONS) {
        deleteSet.add(collectionName);
      }
      continue;
    }

    if (target === "upcomingShows") {
      deleteSet.add("staffInboxAcks");
      deleteSet.add("staffInboxAlertDeliveries");
      for (const collectionName of UPCOMING_SHOW_COLLECTIONS) {
        deleteSet.add(collectionName);
      }
      continue;
    }

    if (target === "designs") {
      deleteSet.add("designs");
      continue;
    }

    if (target === "aiProcessingDesigns") {
      // Selective wipe — handled via wipeAiProcessingDesigns flag, not full collection delete.
      continue;
    }

    if (target === "customerUploads") {
      deleteSet.add("customerUploadIdempotency");
      deleteSet.add("customerUploadFinalizeLeases");
      deleteSet.add("customerUploadRateLimits");
      deleteSet.add("customerUploads");
      deleteSet.add("customerUploadBatches");
      continue;
    }

    if (target === "printRequestDesignDailyLimits") {
      deleteSet.add("printRequestDesignDailyLimits");
      continue;
    }

    if (target === "etsySearches") {
      deleteSet.add("customRequestEtsySearchRateLimits");
      deleteSet.add("etsySuggestionRequests");
      deleteSet.add("etsyRecommendationSuggestions");
      deleteSet.add("etsyWebsiteSearchCache");
      deleteSet.add("etsyRecommendationConfig");
      deleteSet.add("etsyRecommendationRateLimits");
      deleteSet.add("etsyRecommendationRequests");
      continue;
    }

    if (target === "assistedCreationRequests") {
      deleteSet.add("assistedCreationUpdateAcks");
      deleteSet.add("customerNotifications");
      deleteSet.add("emailDeliveryJobs");
      deleteSet.add("customRequests");
      deleteSet.add("assistedCreationRequests");
    }
  }

  const wipeDesigns = uniqueTargets.includes("designs");
  const wipePrintRequests = uniqueTargets.includes("printRequests");
  const wipeCustomerUploads = uniqueTargets.includes("customerUploads");
  const wipeAssistedCreation = uniqueTargets.includes("assistedCreationRequests");
  const wipeAiProcessingDesigns =
    uniqueTargets.includes("aiProcessingDesigns") && !wipeDesigns;
  const deleteCollections = OPERATIONAL_WIPE_DELETE_COLLECTION_ORDER.filter((collectionName) =>
    deleteSet.has(collectionName),
  );

  return {
    deleteCollections,
    // Wiping print requests always resets naming counters so the next request restarts at 001.
    resetSequences: uniqueTargets.includes("sequences") || wipePrintRequests,
    // Stats reset is pointless if the entire designs collection is deleted.
    resetDesignRequestStats: uniqueTargets.includes("designRequestStats") && !wipeDesigns,
    wipeDesignStorage: wipeDesigns,
    wipeAiProcessingDesigns,
    wipeCustomerUploadStorage: wipeCustomerUploads,
    wipeAssistedCreationStorage: wipeAssistedCreation,
    resetShowAllocationTotals:
      deleteSet.has("showAllocations") && !deleteSet.has("upcomingShows"),
  };
}

export const PRINT_REQUEST_RESET_PRESET_TARGETS: OperationalWipeTarget[] = [
  "printRequests",
  "sequences",
  "designRequestStats",
];

/** Alias for UI “Print Requests” preset (keep upcoming shows). */
export const PRINT_REQUESTS_WIPE_PRESET_TARGETS = PRINT_REQUEST_RESET_PRESET_TARGETS;

export const ETSY_WIPE_PRESET_TARGETS: OperationalWipeTarget[] = ["etsySearches"];

export const CUSTOM_REQUESTS_WIPE_PRESET_TARGETS: OperationalWipeTarget[] = [
  "assistedCreationRequests",
];

export const CUSTOMER_UPLOADS_WIPE_PRESET_TARGETS: OperationalWipeTarget[] = ["customerUploads"];

/** Optional cleanup of obsolete, unenforced print-limit counters (keeps stash / requests). */
export const LEGACY_PRINT_LIMIT_COUNTERS_WIPE_PRESET_TARGETS: OperationalWipeTarget[] = [
  "printRequestDesignDailyLimits",
];

/** Designs wipe always requires print requests + sequences (same as toggle). */
export const DESIGNS_WIPE_PRESET_TARGETS: OperationalWipeTarget[] = [
  "printRequests",
  "sequences",
  "designs",
];

/** AI Processing inbox designs only (keeps ready / archived catalog). */
export const AI_PROCESSING_DESIGNS_WIPE_PRESET_TARGETS: OperationalWipeTarget[] = [
  "aiProcessingDesigns",
];

export const ALL_OPERATIONAL_WIPE_TARGETS: OperationalWipeTarget[] = [
  "printRequests",
  "showQueueAttachments",
  "upcomingShows",
  "sequences",
  "designRequestStats",
  "designs",
  "aiProcessingDesigns",
  "customerUploads",
  "printRequestDesignDailyLimits",
  "etsySearches",
  "assistedCreationRequests",
];

/**
 * UI “All (-) Designs” preset: all operational wipe checkboxes except full Designs
 * (keeps ready catalog docs + design Storage prefixes). Still includes selective
 * AI Processing wipe, upcoming shows, queue attachments, uploads, Etsy, custom requests, etc.
 */
export const EVERYTHING_EXCEPT_DESIGNS_WIPE_PRESET_TARGETS: OperationalWipeTarget[] =
  ALL_OPERATIONAL_WIPE_TARGETS.filter((target) => target !== "designs");

/** Storage prefixes removed when wiping designs (catalog assets only). */
export const DESIGN_STORAGE_WIPE_PREFIXES = ["originals/", "thumbnails/", "previews/"] as const;

/** Storage prefix removed when wiping customer uploads. */
export const CUSTOMER_UPLOAD_STORAGE_WIPE_PREFIXES = ["customer-uploads/"] as const;

/** Storage prefix removed when wiping Assisted Creation requests (references + proofs). */
export const ASSISTED_CREATION_STORAGE_WIPE_PREFIXES = ["assisted-creation/"] as const;
