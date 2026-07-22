export const OPERATIONAL_WIPE_CONFIRMATION_PHRASE = "WIPE TEST DATA";

export const OPERATIONAL_WIPE_ALLOWED_PROJECT_IDS = ["fresh-prints-dev"] as const;

export type OperationalWipeAllowedProjectId =
  (typeof OPERATIONAL_WIPE_ALLOWED_PROJECT_IDS)[number];

export const OPERATIONAL_WIPE_TARGETS = [
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
] as const;

export type OperationalWipeTarget = (typeof OPERATIONAL_WIPE_TARGETS)[number];

export interface WipeOperationalTestDataRequest {
  confirmationPhrase: string;
  targets: OperationalWipeTarget[];
  /** Required when `designs` is selected — proves the catalog wipe confirm modal was accepted. */
  acknowledgeDesignCatalogWipe?: boolean;
}

export interface WipeOperationalTestDataResponse {
  projectId: string;
  targets: OperationalWipeTarget[];
  deleted: Record<string, number>;
  /** Number of customer docs whose nextPrintRequestSequence was set to 1 and totalPrintRequests to 0. */
  customersReset: number;
  /** True when counters/printRequests.nextInternalRequestSequence was set to 1. */
  internalSequenceReset: boolean;
  designsRequestStatsReset: number;
  storageFilesDeleted: number;
  /** Upcoming shows whose allocatedQuantity was zeroed after attachment wipe (shows kept). */
  showsAllocationTotalsReset: number;
  /**
   * Designs matching AI Processing page tabs that were deleted by `aiProcessingDesigns`.
   * 0 when that target was not used (or skipped because full `designs` wipe ran).
   */
  aiProcessingDesignsDeleted: number;
}

export function isOperationalWipeAllowedProjectId(projectId: string): boolean {
  return (OPERATIONAL_WIPE_ALLOWED_PROJECT_IDS as readonly string[]).includes(projectId);
}

export function isOperationalWipeTarget(value: string): value is OperationalWipeTarget {
  return (OPERATIONAL_WIPE_TARGETS as readonly string[]).includes(value);
}
