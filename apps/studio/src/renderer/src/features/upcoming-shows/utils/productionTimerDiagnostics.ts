import { mapFirestoreTimestamp } from "../../firebase/utils/firestoreTimestamp";

export interface TimerParserDiagnostic {
  parserStatus: "valid" | "incomplete";
  missingRequiredFields: string[];
  legacyExtraFields: string[];
}

const SHOW_ALLOWED = new Set([
  "source", "whatnotShowId", "whatnotUrl", "title", "scheduledStartAt", "status", "syncStatus",
  "syncError", "lastSyncedAt", "lastSeenAt", "sourceBaseUrlSnapshot",
  "lastSeenInAssistedImportAt", "notes", "isArchived", "productionStatus", "maxTotalQuantity",
  "maxQuantityOverridden", "allocatedQuantity", "accumulatedPrintMs", "activePrintStartedAt",
  "printStartedAt", "printPausedAt", "printFinishedAt", "printFinishedBy", "assignedStaffUserId",
  "staffGangSheetCycleNumber", "createdBy", "updatedBy",
  "createdAt", "updatedAt",
]);
const ALLOCATION_ALLOWED = new Set([
  "upcomingShowId", "printRequestId", "printRequestItemId", "designId", "sourceType",
  "customerUploadId", "customerId", "requestNameSnapshot", "requestOriginSnapshot",
  "designTitleSnapshot", "allocatedQuantity", "sourceItemQuantitySnapshot", "printWidthInches",
  "printHeightInches", "sizeLabel", "notes", "status", "addedBy", "updatedBy", "queuedAt",
  "queuedBy", "printedAt", "printedBy", "completedAt", "completedBy", "canceledAt", "canceledBy",
  "createdAt", "updatedAt",
]);
const SHOW_SOURCES = ["whatnot", "staff_gang_sheet"];
const SHOW_STATUSES = ["scheduled", "rescheduled", "live", "completed", "canceled", "missing_upstream", "archived"];
const SYNC_STATUSES = ["idle", "syncing", "succeeded", "failed"];
const PRODUCTION_STATUSES = ["open", "full", "printing", "fully_printed", "completed", "archived", "canceled"];
const ALLOCATION_STATUSES = ["pending", "queued", "in_progress", "printed", "done", "canceled"];

type RawDocument = Record<string, unknown>;

export function diagnoseUpcomingShowForTimer(data: RawDocument): TimerParserDiagnostic {
  const source = typeof data.source === "string" ? data.source : "";
  const isStaffGangSheet = source === "staff_gang_sheet";
  const checks: Array<[string, boolean]> = [
    ["source", SHOW_SOURCES.includes(source)],
    [
      "whatnotShowId",
      isStaffGangSheet
        ? data.whatnotShowId === undefined || data.whatnotShowId === null
        : typeof data.whatnotShowId === "string",
    ],
    [
      "assignedStaffUserId",
      !isStaffGangSheet ||
        (typeof data.assignedStaffUserId === "string" && Boolean(data.assignedStaffUserId.trim())),
    ],
    [
      "staffGangSheetCycleNumber",
      !isStaffGangSheet ||
        (typeof data.staffGangSheetCycleNumber === "number" &&
          Number.isInteger(data.staffGangSheetCycleNumber) &&
          data.staffGangSheetCycleNumber >= 1),
    ],
    ["status", typeof data.status === "string" && SHOW_STATUSES.includes(data.status)],
    ["syncStatus", typeof data.syncStatus === "string" && SYNC_STATUSES.includes(data.syncStatus)],
    ["isArchived", typeof data.isArchived === "boolean"],
    ["productionStatus", typeof data.productionStatus === "string" && PRODUCTION_STATUSES.includes(data.productionStatus)],
    ["maxQuantityOverridden", typeof data.maxQuantityOverridden === "boolean"],
    ["allocatedQuantity", typeof data.allocatedQuantity === "number"],
    ["createdAt", mapFirestoreTimestamp(data.createdAt) !== undefined],
    ["updatedAt", mapFirestoreTimestamp(data.updatedAt) !== undefined],
  ];
  const missingRequiredFields = checks.filter(([, valid]) => !valid).map(([field]) => field);
  return {
    parserStatus: missingRequiredFields.length === 0 ? "valid" : "incomplete",
    missingRequiredFields,
    legacyExtraFields: Object.keys(data).filter((field) => !SHOW_ALLOWED.has(field)).sort(),
  };
}

export function diagnoseShowAllocationForTimer(data: RawDocument): TimerParserDiagnostic {
  const uploadId = typeof data.customerUploadId === "string" && data.customerUploadId.trim()
    ? data.customerUploadId.trim()
    : undefined;
  const upload = data.sourceType === "customer_upload" || Boolean(uploadId);
  const checks: Array<[string, boolean]> = [
    ["upcomingShowId", typeof data.upcomingShowId === "string"],
    ["printRequestId", typeof data.printRequestId === "string"],
    ["printRequestItemId", typeof data.printRequestItemId === "string"],
    ["requestNameSnapshot", typeof data.requestNameSnapshot === "string"],
    ["allocatedQuantity", typeof data.allocatedQuantity === "number"],
    ["sourceItemQuantitySnapshot", typeof data.sourceItemQuantitySnapshot === "number"],
    ["status", typeof data.status === "string" && ALLOCATION_STATUSES.includes(data.status)],
    ["addedBy", typeof data.addedBy === "string"],
    ["updatedBy", typeof data.updatedBy === "string"],
    ["createdAt", mapFirestoreTimestamp(data.createdAt) !== undefined],
    ["updatedAt", mapFirestoreTimestamp(data.updatedAt) !== undefined],
    [upload ? "customerUploadId" : "designId", upload
      ? Boolean(uploadId)
      : typeof data.designId === "string" && Boolean(data.designId.trim())],
  ];
  const missingRequiredFields = checks.filter(([, valid]) => !valid).map(([field]) => field);
  return {
    parserStatus: missingRequiredFields.length === 0 ? "valid" : "incomplete",
    missingRequiredFields,
    legacyExtraFields: Object.keys(data).filter((field) => !ALLOCATION_ALLOWED.has(field)).sort(),
  };
}
