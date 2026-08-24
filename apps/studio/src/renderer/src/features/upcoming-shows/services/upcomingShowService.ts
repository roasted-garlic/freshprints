import {
  deleteDoc,
  deleteField,
  doc,
  getDoc,
  getDocs,
  getDocsFromServer,
  onSnapshot,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
  runTransaction,
  writeBatch,
  type DocumentData,
  type Unsubscribe,
} from "firebase/firestore";

import { runTracedWrite,
  traceFirestoreListenerEmission,
  traceFirestoreOneShotComplete,
  traceFirestoreOneShotStart } from "@fresh-prints/shared/utils/firestoreUsageTrace";

import { db } from "../../../config/firebase";

import { mapFirestoreTimestamp } from "../../firebase/utils/firestoreTimestamp";
import { assertNoUndefinedFirestoreFields, withoutUndefinedFields } from "../../firebase/utils/firestoreDocument";
import { firestoreCollectionService } from "../../firebase/services/firestoreCollectionService";
import { createSharedFirestoreSubscription } from "../../firebase/utils/createSharedFirestoreSubscription";
import { permissionService } from "../../permissions/services/permissionService";
import type { User } from "../../users/types/user.types";
import { isPrintRequestOrigin } from "@fresh-prints/shared/utils/printRequestOrigin";
import { planAllocationSplit } from "@fresh-prints/shared/utils/showCapacity";
import {
  formatShowAllocationBlockedMessage,
  getShowAllocationBlockReason,
  SHOW_QUEUE_FULL_MESSAGE,
} from "@fresh-prints/shared/utils/showAllocationEligibility";
import { canRemoveRequestFromShow } from "@fresh-prints/shared/utils/showQueueEditability";
import { computeElapsedPrintMs } from "@fresh-prints/shared/utils/showPrintTimer";
import { buildShowAllocationSourceFields } from "@fresh-prints/shared/utils/showAllocationSourceFields";
import { printRequestService, assertPersistedPrintRequestItemSize } from "../../print-requests/services/printRequestService";
import type { ShowReconciliationReadSource } from "../../print-requests/services/printRequestService";
import type {
  ShowProductionStatus,
  UpcomingShowSource,
  UpcomingShowStatus,
  UpcomingShowSyncStatus,
} from "@fresh-prints/shared/types/upcomingShow/upcomingShow.enums";
import type { UpcomingShow } from "@fresh-prints/shared/types/upcomingShow/upcomingShow.types";
import { isStaffGangSheetShow } from "@fresh-prints/shared/types/upcomingShow/upcomingShow.types";
import {
  canAllocateOriginToShowSource,
  DEFAULT_INTERNAL_GANG_SHEET_MAX_TOTAL_QUANTITY,
  formatStaffGangSheetTitle,
  isStaffGangSheetActiveProductionStatus,
  resolveInternalGangSheetMaxTotalQuantity,
  resolveNextStaffGangSheetCycleNumber,
} from "@fresh-prints/shared/utils/staffGangSheet";
import type { ShowAllocationStatus } from "@fresh-prints/shared/types/showAllocation/showAllocation.enums";
import type { ShowAllocation } from "@fresh-prints/shared/types/showAllocation/showAllocation.types";
import { findMatchingUpcomingShow } from "../utils/upcomingShowUpsert";
import { canStartShowPrinting, canAllocatePrintRequestToShow, PAST_SHOW_READ_ONLY_MESSAGE } from "../utils/groupShowsByUpcomingPast";
import { sortUpcomingShowsForDisplay } from "../utils/upcomingShowListSort";
import {
  diagnoseShowAllocationForTimer,
  diagnoseUpcomingShowForTimer,
} from "../utils/productionTimerDiagnostics";
import {
  reconcileCompletedPrintRequest,
  ShowCompletionReconciliationRemediationError,
  summarizeShowCompletionReconciliation,
  type ShowCompletionReconciliationResult,
} from "../utils/showCompletionReconciliation";
import { showQueueSettingsService } from "./showQueueSettingsService";
import { ProductionDiagnosticWarningDeduper } from "../utils/productionDiagnosticWarningDeduper";
import { reconcileShowCompletionWithCommittedVerification } from "../utils/postFinishCommittedVerification";
import { resolveShowFinishMutationPlan } from "../utils/showFinishMutationPlan";
import {
  planWhatnotImportExistingShowUpdate,
  type WhatnotImportUpdateInput,
} from "../utils/whatnotShowImportUpdate";
import { callTracedFunction } from "../../../config/tracedCallable";
import { FirebaseError } from "firebase/app";

function isGenericFirebaseCallableMessage(message: string): boolean {
  return new Set([
    "internal",
    "INTERNAL",
    "unknown",
    "unavailable",
    "failed-precondition",
    "invalid-argument",
    "permission-denied",
    "not-found",
  ]).has(message.trim());
}

/** Callable missing/crashing — fall back to Rules-allowed client create for initial sheet. */
function shouldFallbackToClientStaffGangSheetCreate(error: unknown): boolean {
  if (!(error instanceof FirebaseError)) {
    const message = error instanceof Error ? error.message.trim().toLowerCase() : "";
    return message === "internal" || message.includes("not-found");
  }
  return (
    error.code === "functions/not-found" ||
    error.code === "functions/unavailable" ||
    error.code === "functions/internal" ||
    (error.code === "functions/failed-precondition" &&
      /index/i.test(error.message ?? ""))
  );
}

function toStaffGangSheetCreateError(error: unknown): Error {
  if (error instanceof FirebaseError) {
    const message = error.message?.trim() ?? "";
    if (message && !isGenericFirebaseCallableMessage(message)) {
      return new Error(message);
    }
    switch (error.code) {
      case "functions/permission-denied":
        return new Error(
          "You do not have permission to create Internal Gang Sheets. Active Studio staff (owner, admin, or helper) can create them after Rules are deployed.",
        );
      case "functions/unauthenticated":
        return new Error("You must be signed in to create an Internal Gang Sheet.");
      case "functions/failed-precondition":
        return new Error(
          message && !isGenericFirebaseCallableMessage(message)
            ? message
            : "Unable to create Internal Gang Sheet. An active sheet may already exist.",
        );
      default:
        return new Error(
          "Unable to create Internal Gang Sheet. Confirm DEV Functions are deployed (createInitialStaffGangSheet), then try again.",
        );
    }
  }
  if (error instanceof Error && error.message.trim()) {
    return error;
  }
  return new Error("Unable to create Internal Gang Sheet. Please try again.");
}

function hashShowIdForPostFinishVerification(showId: string): string {
  let hash = 2166136261;
  for (const character of showId) {
    hash ^= character.charCodeAt(0);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(16).padStart(8, "0");
}

function classifyReconciliationResults(
  results: readonly ShowCompletionReconciliationResult[],
): "complete" | "retryable" | "remediation_only" | "mixed" {
  const { failedRequestIds, remediationRequestIds } =
    summarizeShowCompletionReconciliation(results);
  if (failedRequestIds.length > 0 && remediationRequestIds.length > 0) return "mixed";
  if (failedRequestIds.length > 0) return "retryable";
  if (remediationRequestIds.length > 0) return "remediation_only";
  return "complete";
}

export interface CreateUpcomingShowInput {
  source: UpcomingShowSource;
  whatnotShowId: string;
  whatnotUrl?: string;
  title?: string;
  scheduledStartAt: UpcomingShow["scheduledStartAt"];
  notes?: string;
  sourceBaseUrlSnapshot?: string;
  /** True when this create/update came from a staff-confirmed assisted import, not a manual paste. */
  fromAssistedImport?: boolean;
}

export interface CreateStaffGangSheetLaneInput {
  /** Defaults to 1 for the initial shared Internal Gang Sheet. */
  staffGangSheetCycleNumber?: number;
}

export interface CompleteStaffGangSheetResult {
  completedShowId: string;
  nextShowId: string;
  nextCycleNumber: number;
  alreadyCompleted: boolean;
}

export interface UpdateUpcomingShowInput {
  title?: string;
  whatnotUrl?: string;
  scheduledStartAt?: UpcomingShow["scheduledStartAt"];
  status?: UpcomingShowStatus;
  productionStatus?: ShowProductionStatus;
  notes?: string;
}

export interface SetShowMaxQuantityInput {
  maxTotalQuantity?: number;
  /** Required when the new max would be below the current allocated quantity. */
  override?: boolean;
}

export interface AllocatePrintRequestItemInput {
  printRequestId: string;
  printRequestItemId: string;
  /** Defaults to the full remaining source item quantity when omitted. */
  quantity?: number;
  /** Staff-only danger override to exceed remaining show capacity. */
  overrideCapacity?: boolean;
}

interface UpcomingShowDocumentData extends DocumentData {
  id?: unknown;
  source?: unknown;
  whatnotShowId?: unknown;
  whatnotUrl?: unknown;
  title?: unknown;
  scheduledStartAt?: unknown;
  status?: unknown;
  syncStatus?: unknown;
  syncError?: unknown;
  lastSyncedAt?: unknown;
  lastSeenAt?: unknown;
  sourceBaseUrlSnapshot?: unknown;
  lastSeenInAssistedImportAt?: unknown;
  notes?: unknown;
  isArchived?: unknown;
  productionStatus?: unknown;
  maxTotalQuantity?: unknown;
  maxQuantityOverridden?: unknown;
  allocatedQuantity?: unknown;
  accumulatedPrintMs?: unknown;
  activePrintStartedAt?: unknown;
  printStartedAt?: unknown;
  printPausedAt?: unknown;
  printFinishedAt?: unknown;
  printFinishedBy?: unknown;
  gangSheetGeneratedAt?: unknown;
  gangSheetGeneratedBy?: unknown;
  assignedStaffUserId?: unknown;
  staffGangSheetCycleNumber?: unknown;
  createdBy?: unknown;
  updatedBy?: unknown;
  createdAt?: unknown;
  updatedAt?: unknown;
}

export interface ShowAllocationDocumentData extends DocumentData {
  id?: unknown;
  upcomingShowId?: unknown;
  printRequestId?: unknown;
  printRequestItemId?: unknown;
  designId?: unknown;
  sourceType?: unknown;
  customerUploadId?: unknown;
  customerId?: unknown;
  requestNameSnapshot?: unknown;
  requestOriginSnapshot?: unknown;
  designTitleSnapshot?: unknown;
  allocatedQuantity?: unknown;
  sourceItemQuantitySnapshot?: unknown;
  printWidthInches?: unknown;
  printHeightInches?: unknown;
  sizeLabel?: unknown;
  notes?: unknown;
  status?: unknown;
  addedBy?: unknown;
  updatedBy?: unknown;
  queuedAt?: unknown;
  queuedBy?: unknown;
  printedAt?: unknown;
  printedBy?: unknown;
  completedAt?: unknown;
  completedBy?: unknown;
  canceledAt?: unknown;
  canceledBy?: unknown;
  createdAt?: unknown;
  updatedAt?: unknown;
}

const VALID_SOURCES: UpcomingShowSource[] = ["whatnot", "staff_gang_sheet"];
const VALID_STATUSES: UpcomingShowStatus[] = [
  "scheduled",
  "rescheduled",
  "live",
  "completed",
  "canceled",
  "missing_upstream",
  "archived",
];
const VALID_SYNC_STATUSES: UpcomingShowSyncStatus[] = ["idle", "syncing", "succeeded", "failed"];
const VALID_PRODUCTION_STATUSES: ShowProductionStatus[] = [
  "open",
  "full",
  "printing",
  "fully_printed",
  "completed",
  "archived",
  "canceled",
];
const VALID_ALLOCATION_STATUSES: ShowAllocationStatus[] = [
  "pending",
  "queued",
  "in_progress",
  "printed",
  "done",
  "canceled",
];
const PRINTED_ALLOCATION_STATUSES: ShowAllocationStatus[] = ["printed", "done"];
const STARTABLE_ALLOCATION_STATUSES: ShowAllocationStatus[] = ["pending", "queued"];
const FINISHABLE_ALLOCATION_STATUSES: ShowAllocationStatus[] = ["pending", "queued", "in_progress"];
const STARTABLE_SHOW_PRODUCTION_STATUSES: ShowProductionStatus[] = ["open", "full"];
function isUpcomingShowSource(value: unknown): value is UpcomingShowSource {
  return typeof value === "string" && VALID_SOURCES.includes(value as UpcomingShowSource);
}

function isUpcomingShowStatus(value: unknown): value is UpcomingShowStatus {
  return typeof value === "string" && VALID_STATUSES.includes(value as UpcomingShowStatus);
}

function isUpcomingShowSyncStatus(value: unknown): value is UpcomingShowSyncStatus {
  return typeof value === "string" && VALID_SYNC_STATUSES.includes(value as UpcomingShowSyncStatus);
}

function isShowProductionStatus(value: unknown): value is ShowProductionStatus {
  return typeof value === "string" && VALID_PRODUCTION_STATUSES.includes(value as ShowProductionStatus);
}

function isShowAllocationStatus(value: unknown): value is ShowAllocationStatus {
  return typeof value === "string" && VALID_ALLOCATION_STATUSES.includes(value as ShowAllocationStatus);
}

export interface ShowTimerActionResult {
  reconciliation?: {
    affectedRequestCount: number;
    failedRequestCount: number;
    failedRequestIds: string[];
    remediationRequestCount: number;
    remediationRequestIds: string[];
    results: ShowCompletionReconciliationResult[];
  };
}

function mapUpcomingShowData(showId: string, data: UpcomingShowDocumentData): UpcomingShow {
  const createdAt = mapFirestoreTimestamp(data.createdAt);
  // After updateDoc with serverTimestamp(), an immediate snapshot can still carry a pending
  // sentinel for updatedAt. Fall back to createdAt so telemetry writes do not drop the show.
  const updatedAt = mapFirestoreTimestamp(data.updatedAt) ?? createdAt;

  if (
    !isUpcomingShowSource(data.source) ||
    !isUpcomingShowStatus(data.status) ||
    !isUpcomingShowSyncStatus(data.syncStatus) ||
    typeof data.isArchived !== "boolean" ||
    !isShowProductionStatus(data.productionStatus) ||
    typeof data.maxQuantityOverridden !== "boolean" ||
    typeof data.allocatedQuantity !== "number" ||
    createdAt === undefined ||
    updatedAt === undefined
  ) {
    throw new Error("An upcoming show record is incomplete.");
  }

  const base = {
    id: showId,
    whatnotUrl: typeof data.whatnotUrl === "string" ? data.whatnotUrl : undefined,
    title: typeof data.title === "string" ? data.title : undefined,
    scheduledStartAt: mapFirestoreTimestamp(data.scheduledStartAt),
    status: data.status,
    syncStatus: data.syncStatus,
    syncError: typeof data.syncError === "string" ? data.syncError : undefined,
    lastSyncedAt: mapFirestoreTimestamp(data.lastSyncedAt),
    lastSeenAt: mapFirestoreTimestamp(data.lastSeenAt),
    sourceBaseUrlSnapshot: typeof data.sourceBaseUrlSnapshot === "string" ? data.sourceBaseUrlSnapshot : undefined,
    lastSeenInAssistedImportAt: mapFirestoreTimestamp(data.lastSeenInAssistedImportAt),
    notes: typeof data.notes === "string" ? data.notes : undefined,
    isArchived: data.isArchived,
    productionStatus: data.productionStatus,
    maxTotalQuantity: typeof data.maxTotalQuantity === "number" ? data.maxTotalQuantity : undefined,
    maxQuantityOverridden: data.maxQuantityOverridden,
    allocatedQuantity: data.allocatedQuantity,
    accumulatedPrintMs: typeof data.accumulatedPrintMs === "number" ? data.accumulatedPrintMs : 0,
    activePrintStartedAt: mapFirestoreTimestamp(data.activePrintStartedAt),
    printStartedAt: mapFirestoreTimestamp(data.printStartedAt),
    printPausedAt: mapFirestoreTimestamp(data.printPausedAt),
    printFinishedAt: mapFirestoreTimestamp(data.printFinishedAt),
    printFinishedBy: typeof data.printFinishedBy === "string" ? data.printFinishedBy : undefined,
    gangSheetGeneratedAt: mapFirestoreTimestamp(data.gangSheetGeneratedAt),
    gangSheetGeneratedBy: typeof data.gangSheetGeneratedBy === "string" ? data.gangSheetGeneratedBy : undefined,
    createdBy: typeof data.createdBy === "string" ? data.createdBy : undefined,
    updatedBy: typeof data.updatedBy === "string" ? data.updatedBy : undefined,
    createdAt,
    updatedAt,
  };

  if (data.source === "staff_gang_sheet") {
    if (typeof data.whatnotShowId === "string" && data.whatnotShowId.trim()) {
      throw new Error("Internal Gang Sheet records must not include a Whatnot show ID.");
    }
    if (
      typeof data.staffGangSheetCycleNumber !== "number" ||
      !Number.isInteger(data.staffGangSheetCycleNumber) ||
      data.staffGangSheetCycleNumber < 1
    ) {
      throw new Error("Internal Gang Sheet cycle fields are incomplete.");
    }

    return {
      ...base,
      source: "staff_gang_sheet",
      // Legacy DEV assignee may still exist; shared model ignores it for auth/uniqueness.
      assignedStaffUserId:
        typeof data.assignedStaffUserId === "string" && data.assignedStaffUserId.trim()
          ? data.assignedStaffUserId
          : undefined,
      staffGangSheetCycleNumber: data.staffGangSheetCycleNumber,
      title: base.title ?? formatStaffGangSheetTitle(data.staffGangSheetCycleNumber),
      maxTotalQuantity: resolveInternalGangSheetMaxTotalQuantity(
        typeof data.maxTotalQuantity === "number" ? data.maxTotalQuantity : undefined,
      ),
    };
  }

  if (typeof data.whatnotShowId !== "string" || !data.whatnotShowId.trim()) {
    throw new Error("An upcoming show record is incomplete.");
  }

  return {
    ...base,
    source: "whatnot",
    whatnotShowId: data.whatnotShowId,
  };
}

/**
 * Exported so `useShowAllocations`'s live `onSnapshot` subscription (Plan Section 21.3/21.4, Fix
 * 3) can reuse the exact same document -> ShowAllocation mapping this service's own one-shot
 * `listShowAllocations` already uses, instead of duplicating it.
 */
export function mapShowAllocationData(allocationId: string, data: ShowAllocationDocumentData): ShowAllocation {
  const createdAt = mapFirestoreTimestamp(data.createdAt);
  const updatedAt = mapFirestoreTimestamp(data.updatedAt);

  const sourceType =
    data.sourceType === "customer_upload" || data.sourceType === "catalog_design"
      ? data.sourceType
      : undefined;
  const customerUploadId =
    typeof data.customerUploadId === "string" && data.customerUploadId.trim()
      ? data.customerUploadId.trim()
      : undefined;
  const isUploadAllocation = sourceType === "customer_upload" || Boolean(customerUploadId);
  const designId =
    typeof data.designId === "string" && data.designId.trim() ? data.designId.trim() : undefined;

  if (
    typeof data.upcomingShowId !== "string" ||
    typeof data.printRequestId !== "string" ||
    typeof data.printRequestItemId !== "string" ||
    typeof data.requestNameSnapshot !== "string" ||
    typeof data.allocatedQuantity !== "number" ||
    typeof data.sourceItemQuantitySnapshot !== "number" ||
    !isShowAllocationStatus(data.status) ||
    typeof data.addedBy !== "string" ||
    typeof data.updatedBy !== "string" ||
    createdAt === undefined ||
    updatedAt === undefined
  ) {
    throw new Error("A show allocation record is incomplete.");
  }

  if (isUploadAllocation) {
    if (!customerUploadId) {
      throw new Error("A show allocation record is incomplete.");
    }
  } else if (!designId) {
    throw new Error("A show allocation record is incomplete.");
  }

  return {
    id: allocationId,
    upcomingShowId: data.upcomingShowId,
    printRequestId: data.printRequestId,
    printRequestItemId: data.printRequestItemId,
    ...(designId ? { designId } : {}),
    ...(sourceType
      ? { sourceType }
      : isUploadAllocation
        ? { sourceType: "customer_upload" as const }
        : {}),
    ...(customerUploadId ? { customerUploadId } : {}),
    customerId: typeof data.customerId === "string" ? data.customerId : undefined,
    requestNameSnapshot: data.requestNameSnapshot,
    requestOriginSnapshot: isPrintRequestOrigin(data.requestOriginSnapshot) ? data.requestOriginSnapshot : undefined,
    designTitleSnapshot: typeof data.designTitleSnapshot === "string" ? data.designTitleSnapshot : undefined,
    allocatedQuantity: data.allocatedQuantity,
    sourceItemQuantitySnapshot: data.sourceItemQuantitySnapshot,
    printWidthInches: typeof data.printWidthInches === "number" ? data.printWidthInches : undefined,
    printHeightInches: typeof data.printHeightInches === "number" ? data.printHeightInches : undefined,
    sizeLabel: typeof data.sizeLabel === "string" ? data.sizeLabel : undefined,
    notes: typeof data.notes === "string" ? data.notes : undefined,
    status: data.status,
    addedBy: data.addedBy,
    updatedBy: data.updatedBy,
    queuedAt: mapFirestoreTimestamp(data.queuedAt),
    queuedBy: typeof data.queuedBy === "string" ? data.queuedBy : undefined,
    printedAt: mapFirestoreTimestamp(data.printedAt),
    printedBy: typeof data.printedBy === "string" ? data.printedBy : undefined,
    completedAt: mapFirestoreTimestamp(data.completedAt),
    completedBy: typeof data.completedBy === "string" ? data.completedBy : undefined,
    canceledAt: mapFirestoreTimestamp(data.canceledAt),
    canceledBy: typeof data.canceledBy === "string" ? data.canceledBy : undefined,
    createdAt,
    updatedAt,
  };
}

/**
 * One shared, ref-counted `onSnapshot` per `upcomingShowId`, keyed lazily on first subscribe
 * (Plan Section 21.3/21.4, Fix 3). Mirrors the `assistedCreationRequestsService.ts` /
 * `assistedCreationUpdateAckService.ts` pattern — the actual real consumers of
 * `createSharedFirestoreSubscription` in this codebase (not `staffInboxSubscriptionService.ts`,
 * which hand-rolls its own `onSnapshot` composition without this wrapper). Scoped strictly to one
 * show at a time via `where("upcomingShowId", "==", upcomingShowId)` — never a collection-wide
 * listener.
 */
const showAllocationsSubscriptionsByShowId = new Map<
  string,
  ReturnType<typeof createSharedFirestoreSubscription<ShowAllocation[]>>
>();
const productionDiagnosticWarningDeduper = new ProductionDiagnosticWarningDeduper();

function warnProductionDiagnosticOnce(
  documentPath: string,
  missingFields: readonly string[],
  legacyExtraFields: readonly string[],
): void {
  if (!productionDiagnosticWarningDeduper.shouldEmit(
    documentPath,
    missingFields,
    legacyExtraFields,
  )) return;
  console.warn("[upcomingShowService] excluded invalid production record", {
    documentPath,
    missingOrInvalidFields: [...missingFields],
    legacyExtraFields: [...legacyExtraFields],
  });
}

function getOrCreateShowAllocationsSubscription(upcomingShowId: string) {
  const existing = showAllocationsSubscriptionsByShowId.get(upcomingShowId);
  if (existing) {
    return existing;
  }

  const traceMetadata = {
    app: "studio" as const,
    collection: "showAllocations",
    constraints: [`upcomingShowId == ${upcomingShowId}`],
    source: "upcomingShowService.subscribeToShowAllocations",
    triggerReason: "route" as const,
  };

  const shared = createSharedFirestoreSubscription<ShowAllocation[]>({
    traceKey: `showAllocations:${upcomingShowId}`,
    traceMetadata,
    start: ({ next, error }) => {
      const allocationsQuery = query(
        firestoreCollectionService.getShowAllocationsCollection(),
        where("upcomingShowId", "==", upcomingShowId),
      );
      return onSnapshot(
        allocationsQuery,
        (snapshot) => {
          traceFirestoreListenerEmission(traceMetadata, snapshot.size);
          const mapped = snapshot.docs.flatMap((allocationDoc) => {
            const rawData = allocationDoc.data() as ShowAllocationDocumentData;
            try {
              return [
                mapShowAllocationData(
                  allocationDoc.id,
                  rawData,
                ),
              ];
            } catch {
              const diagnostic = diagnoseShowAllocationForTimer(rawData);
              warnProductionDiagnosticOnce(
                `showAllocations/${allocationDoc.id}`,
                diagnostic.missingRequiredFields,
                diagnostic.legacyExtraFields,
              );
              return [];
            }
          });
          next(mapped);
        },
        (snapshotError) => {
          error(snapshotError instanceof Error ? snapshotError.message : "Unable to load show allocations.");
        },
      );
    },
  });

  showAllocationsSubscriptionsByShowId.set(upcomingShowId, shared);
  return shared;
}

/**
 * One shared, ref-counted `onSnapshot` per `upcomingShowId`, for the show DOCUMENT itself (Plan
 * Section 22.4/22.5, Amendment 4, Fix 3 extended). `useShowAllocations`'s live subscription (above)
 * only ever supplied the allocation LIST for the selected show — the show-level `capacity`/summary
 * fields the Show Queue page renders (`allocatedQuantity`, etc.) are a SEPARATE Firestore document,
 * still only ever loaded via `listUpcomingShows`' one-shot fetch, so a Portal-submitted allocation
 * (which updates `allocatedQuantity` on this very document, see the allocation-add path below) never
 * appeared on an already-open Show Queue session. Mirrors
 * `getOrCreateShowAllocationsSubscription`'s exact shape, but as a single-document listener (no
 * query/where clause — there is exactly one document to watch), reusing `mapUpcomingShowData` so no
 * mapping logic is duplicated.
 */
const upcomingShowSubscriptionsByShowId = new Map<
  string,
  ReturnType<typeof createSharedFirestoreSubscription<UpcomingShow | null>>
>();

function getOrCreateUpcomingShowSubscription(upcomingShowId: string) {
  const existing = upcomingShowSubscriptionsByShowId.get(upcomingShowId);
  if (existing) {
    return existing;
  }

  const traceMetadata = {
    app: "studio" as const,
    collection: "upcomingShows",
    constraints: [`id == ${upcomingShowId}`],
    source: "upcomingShowService.subscribeToUpcomingShow",
    triggerReason: "route" as const,
  };

  const shared = createSharedFirestoreSubscription<UpcomingShow | null>({
    traceKey: `upcomingShow:${upcomingShowId}`,
    traceMetadata,
    start: ({ next, error }) => {
      const showRef = doc(firestoreCollectionService.getUpcomingShowsCollection(), upcomingShowId);
      return onSnapshot(
        showRef,
        (snapshot) => {
          traceFirestoreListenerEmission(traceMetadata, snapshot.exists() ? 1 : 0);
          if (!snapshot.exists()) {
            next(null);
            return;
          }
          const rawData = snapshot.data() as UpcomingShowDocumentData;
          try {
            next(mapUpcomingShowData(snapshot.id, rawData));
          } catch {
            const diagnostic = diagnoseUpcomingShowForTimer(rawData);
            warnProductionDiagnosticOnce(
              `upcomingShows/${snapshot.id}`,
              diagnostic.missingRequiredFields,
              diagnostic.legacyExtraFields,
            );
          }
        },
        (snapshotError) => {
          error(snapshotError instanceof Error ? snapshotError.message : "Unable to load upcoming show.");
        },
      );
    },
  });

  upcomingShowSubscriptionsByShowId.set(upcomingShowId, shared);
  return shared;
}

export const upcomingShowService = {
  /**
   * Lists all non-archived local shows. Reads the full collection and sorts client-side by
   * `scheduledStartAt` (nulls last) instead of using a Firestore `orderBy`, because `orderBy`
   * silently excludes documents missing that field — the root cause of a prior bug where
   * manually added shows without a schedule never appeared in this list.
   */
  async listUpcomingShows(caller: User): Promise<UpcomingShow[]> {
    if (!permissionService.canViewUpcomingShows(caller)) {
      return [];
    }

    traceFirestoreOneShotStart("getDocs", "upcomingShows:list");
    const snapshot = await getDocs(firestoreCollectionService.getUpcomingShowsCollection());
    traceFirestoreOneShotComplete("getDocs", "upcomingShows:list", snapshot.size);
    const shows = snapshot.docs.flatMap((showDoc) => {
      try {
        return [mapUpcomingShowData(showDoc.id, showDoc.data() as UpcomingShowDocumentData)];
      } catch (error) {
        console.warn(
          `[upcomingShowService] Skipping incomplete upcoming show ${showDoc.id}:`,
          error instanceof Error ? error.message : error,
        );
        return [];
      }
    });

    return sortUpcomingShowsForDisplay(shows);
  },

  async getUpcomingShowById(caller: User, upcomingShowId: string): Promise<UpcomingShow> {
    if (!permissionService.canViewUpcomingShows(caller)) {
      throw new Error("You do not have permission to view upcoming shows.");
    }

    const snapshot = await getDoc(doc(firestoreCollectionService.getUpcomingShowsCollection(), upcomingShowId));

    if (!snapshot.exists()) {
      throw new Error("Upcoming show not found.");
    }

    return mapUpcomingShowData(snapshot.id, snapshot.data() as UpcomingShowDocumentData);
  },

  /**
   * Direct-ID fetch for the small set of shows referenced by a selected request's own
   * allocations — replaces loading the entire `upcomingShows` collection merely to look up a
   * title/date for whichever shows the current selection happens to reference (Wave C hydration
   * remediation, 2026-07-25). Full show history/schedule remains available via
   * `listUpcomingShows` for surfaces that genuinely manage the whole show queue.
   */
  async getUpcomingShowsByIds(caller: User, upcomingShowIds: string[]): Promise<UpcomingShow[]> {
    if (!permissionService.canViewUpcomingShows(caller) || upcomingShowIds.length === 0) {
      return [];
    }

    const uniqueIds = [...new Set(upcomingShowIds.map((id) => id.trim()).filter(Boolean))];
    if (uniqueIds.length === 0) {
      return [];
    }

    traceFirestoreOneShotStart("getDoc", "upcomingShows:byIds");
    const snapshots = await Promise.all(
      uniqueIds.map((id) => getDoc(doc(firestoreCollectionService.getUpcomingShowsCollection(), id))),
    );
    const shows = snapshots.flatMap((snapshot) => {
      if (!snapshot.exists()) {
        return [];
      }
      try {
        return [mapUpcomingShowData(snapshot.id, snapshot.data() as UpcomingShowDocumentData)];
      } catch (error) {
        console.warn(
          `[upcomingShowService] Skipping incomplete upcoming show ${snapshot.id}:`,
          error instanceof Error ? error.message : error,
        );
        return [];
      }
    });
    traceFirestoreOneShotComplete("getDoc", "upcomingShows:byIds", shows.length);

    return shows;
  },

  /**
   * Creates a new local show record, or updates the existing one matched by
   * `source + whatnotShowId` so schedule changes never create duplicate records.
   * Local-only fields (status, syncStatus, notes, isArchived, productionStatus, capacity) on an
   * existing match are preserved untouched; only upstream-sourced fields are overwritten.
   */
  async upsertUpcomingShow(caller: User, input: CreateUpcomingShowInput): Promise<UpcomingShow> {
    if (!permissionService.canManageUpcomingShows(caller)) {
      throw new Error("You do not have permission to manage upcoming shows.");
    }

    if (input.source === "staff_gang_sheet") {
      throw new Error("Use createStaffGangSheetLane to create Internal Gang Sheets.");
    }

    if (input.fromAssistedImport && !permissionService.canImportWhatnotShows(caller)) {
      throw new Error("You do not have permission to import shows from Whatnot.");
    }

    const whatnotShowId = input.whatnotShowId.trim();

    if (!whatnotShowId) {
      throw new Error("A Whatnot show ID is required.");
    }

    const existingShows = await this.listUpcomingShows(caller);
    const existingShow = findMatchingUpcomingShow(existingShows, { source: input.source, whatnotShowId });

    if (existingShow) {
      const updatePayload = withoutUndefinedFields({
        title: input.title,
        whatnotUrl: input.whatnotUrl,
        scheduledStartAt: input.scheduledStartAt,
        sourceBaseUrlSnapshot: input.sourceBaseUrlSnapshot,
        lastSeenAt: serverTimestamp(),
        lastSeenInAssistedImportAt: input.fromAssistedImport ? serverTimestamp() : undefined,
        updatedBy: caller.id,
        updatedAt: serverTimestamp(),
      });

      assertNoUndefinedFirestoreFields(updatePayload, "Upcoming show update payload");
      await runTracedWrite(
        "updateDoc",
        () =>
          updateDoc(
            doc(firestoreCollectionService.getUpcomingShowsCollection(), existingShow.id),
            updatePayload,
          ),
        {
          app: "studio",
          collection: "upcomingShows",
          documentPathPattern: "upcomingShows/{upcomingShowId}",
          source: "upcomingShowService.upsertUpcomingShow",
        },
      );

      return this.getUpcomingShowById(caller, existingShow.id);
    }

    const showQueueSettings = await showQueueSettingsService.getSettings();
    const showRef = doc(firestoreCollectionService.getUpcomingShowsCollection());
    const createPayload = withoutUndefinedFields({
      source: input.source,
      whatnotShowId,
      whatnotUrl: input.whatnotUrl,
      title: input.title,
      scheduledStartAt: input.scheduledStartAt,
      status: "scheduled" as const,
      syncStatus: "idle" as const,
      lastSeenAt: serverTimestamp(),
      sourceBaseUrlSnapshot: input.sourceBaseUrlSnapshot,
      lastSeenInAssistedImportAt: input.fromAssistedImport ? serverTimestamp() : undefined,
      notes: input.notes?.trim() || undefined,
      isArchived: false,
      productionStatus: "open" as const,
      maxTotalQuantity: showQueueSettings.defaultMaxTotalQuantity,
      maxQuantityOverridden: false,
      allocatedQuantity: 0,
      accumulatedPrintMs: 0,
      createdBy: caller.id,
      updatedBy: caller.id,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });

    assertNoUndefinedFirestoreFields(createPayload, "Upcoming show create payload");
    await runTracedWrite("setDoc", () => setDoc(showRef, createPayload), {
      app: "studio",
      collection: "upcomingShows",
      documentPathPattern: "upcomingShows/{upcomingShowId}",
      source: "upcomingShowService.upsertUpcomingShow",
    });

    return this.getUpcomingShowById(caller, showRef.id);
  },

  /**
   * Any active Studio staff: create a shared Internal Gang Sheet when none is active.
   * Cycle number is computed as max(existing)+1. Prefers the trusted callable; falls back to a
   * Rules-allowed client write when the callable is missing/unavailable.
   */
  async createStaffGangSheetLane(
    caller: User,
    input: CreateStaffGangSheetLaneInput = {},
  ): Promise<UpcomingShow> {
    if (!permissionService.canCreateStaffGangSheetLane(caller)) {
      throw new Error("You do not have permission to create Internal Gang Sheets.");
    }

    const requestedCycle = input.staffGangSheetCycleNumber;
    if (
      requestedCycle !== undefined &&
      (!Number.isInteger(requestedCycle) || requestedCycle < 1)
    ) {
      throw new Error("Internal Gang Sheet cycle number must be a positive integer.");
    }

    try {
      const result = await callTracedFunction<
        { staffGangSheetCycleNumber?: number },
        { showId: string; cycleNumber: number }
      >(
        "createInitialStaffGangSheet",
        { source: "upcomingShowService.createStaffGangSheetLane" },
      )(
        requestedCycle !== undefined
          ? { staffGangSheetCycleNumber: requestedCycle }
          : {},
      );
      return this.getUpcomingShowById(caller, result.showId);
    } catch (error) {
      if (!shouldFallbackToClientStaffGangSheetCreate(error)) {
        throw toStaffGangSheetCreateError(error);
      }
      return this.createStaffGangSheetLaneViaClientSdk(caller, requestedCycle);
    }
  },

  /**
   * Client-SDK create when the callable is unavailable.
   * Refuses when an active sheet exists; otherwise opens max(existing)+1 (or requested if higher).
   */
  async createStaffGangSheetLaneViaClientSdk(
    caller: User,
    requestedCycleNumber?: number,
  ): Promise<UpcomingShow> {
    const collectionRef = firestoreCollectionService.getUpcomingShowsCollection();
    const existingSnap = await getDocs(query(collectionRef, where("source", "==", "staff_gang_sheet")));
    const activeExisting = existingSnap.docs.find((docSnap) => {
      const productionStatus = (docSnap.data() as UpcomingShowDocumentData).productionStatus;
      return isStaffGangSheetActiveProductionStatus(
        typeof productionStatus === "string" ? productionStatus : null,
      );
    });
    if (activeExisting) {
      const rawCycle = activeExisting.data().staffGangSheetCycleNumber;
      const existingCycle = typeof rawCycle === "number" ? rawCycle : 1;
      throw new Error(
        `An active Internal Gang Sheet already exists (${formatStaffGangSheetTitle(existingCycle)}). Complete it before creating another.`,
      );
    }

    const computedNext = resolveNextStaffGangSheetCycleNumber(
      existingSnap.docs.map((docSnap) => {
        const cycle = (docSnap.data() as UpcomingShowDocumentData).staffGangSheetCycleNumber;
        return typeof cycle === "number" ? cycle : null;
      }),
    );
    const cycleNumber =
      typeof requestedCycleNumber === "number" && requestedCycleNumber > computedNext
        ? requestedCycleNumber
        : computedNext;

    const showRef = doc(collectionRef);
    const payload = withoutUndefinedFields({
      source: "staff_gang_sheet" as const,
      title: formatStaffGangSheetTitle(cycleNumber),
      status: "scheduled" as const,
      syncStatus: "idle" as const,
      isArchived: false,
      productionStatus: "open" as const,
      maxQuantityOverridden: false,
      maxTotalQuantity: DEFAULT_INTERNAL_GANG_SHEET_MAX_TOTAL_QUANTITY,
      allocatedQuantity: 0,
      accumulatedPrintMs: 0,
      staffGangSheetCycleNumber: cycleNumber,
      createdBy: caller.id,
      updatedBy: caller.id,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
    assertNoUndefinedFirestoreFields(payload, "Internal Gang Sheet create payload");
    try {
      await runTracedWrite("setDoc", () => setDoc(showRef, payload), {
        app: "studio",
        collection: "upcomingShows",
        documentPathPattern: "upcomingShows/{upcomingShowId}",
        source: "upcomingShowService.createStaffGangSheetLaneViaClientSdk",
      });
    } catch (error) {
      if (error instanceof FirebaseError && error.code === "permission-denied") {
        throw new Error(
          "Missing or insufficient permissions to create Internal Gang Sheets. Deploy the latest Firestore Rules to DEV (staff create allowed), then try again.",
        );
      }
      throw error;
    }

    return this.getUpcomingShowById(caller, showRef.id);
  },

  /**
   * Completes the current shared Internal Gang Sheet and opens the next shared cycle.
   * Uses a trusted callable so helpers can advance the shared sheet without Rules create rights.
   */
  async completeStaffGangSheetAndOpenNext(
    caller: User,
    upcomingShowId: string,
  ): Promise<CompleteStaffGangSheetResult> {
    if (!permissionService.canManageUpcomingShows(caller)) {
      throw new Error("You do not have permission to manage Internal Gang Sheets.");
    }

    const show = await this.getUpcomingShowById(caller, upcomingShowId);
    if (!isStaffGangSheetShow(show)) {
      throw new Error("Only Internal Gang Sheets can be completed with auto-cycle.");
    }
    if (!permissionService.canManageStaffGangSheetShow(caller, show)) {
      throw new Error("You do not have permission to complete this Internal Gang Sheet.");
    }

    try {
      return await callTracedFunction<{ upcomingShowId: string }, CompleteStaffGangSheetResult>(
        "completeStaffGangSheetAndOpenNext",
        { source: "upcomingShowService.completeStaffGangSheetAndOpenNext" },
      )({ upcomingShowId });
    } catch (error) {
      if (error instanceof Error && error.message.trim()) {
        throw error;
      }
      throw new Error("Unable to complete this Internal Gang Sheet. Please try again.");
    }
  },

  async updateUpcomingShowFromWhatnotImport(
    caller: User,
    input: WhatnotImportUpdateInput,
  ): Promise<void> {
    if (!permissionService.canImportWhatnotShows(caller)) {
      throw new Error("You do not have permission to import shows from Whatnot.");
    }

    const targetId = input.existingShowId.trim();
    if (!targetId) {
      throw new Error("The matched upcoming show could not be resolved.");
    }

    const showRef = doc(firestoreCollectionService.getUpcomingShowsCollection(), targetId);
    const snapshot = await getDoc(showRef);
    const plan = planWhatnotImportExistingShowUpdate(
      snapshot.exists() ? (snapshot.data() as UpcomingShowDocumentData) : null,
      input,
    );
    const updatePayload = {
      ...plan.payload,
      lastSeenAt: serverTimestamp(),
      lastSeenInAssistedImportAt: serverTimestamp(),
      updatedBy: caller.id,
      updatedAt: serverTimestamp(),
    };

    assertNoUndefinedFirestoreFields(updatePayload, "Whatnot upcoming show update payload");
    await runTracedWrite(
      "updateDoc",
      () => updateDoc(showRef, updatePayload),
      {
        app: "studio",
        collection: "upcomingShows",
        documentPathPattern: "upcomingShows/{upcomingShowId}",
        source: "upcomingShowService.updateUpcomingShowFromWhatnotImport",
      },
    );
  },

  async updateUpcomingShow(
    caller: User,
    upcomingShowId: string,
    input: UpdateUpcomingShowInput,
  ): Promise<UpcomingShow> {
    if (!permissionService.canManageUpcomingShows(caller)) {
      throw new Error("You do not have permission to manage upcoming shows.");
    }

    const showRef = doc(firestoreCollectionService.getUpcomingShowsCollection(), upcomingShowId);
    const snapshot = await getDoc(showRef);

    if (!snapshot.exists()) {
      throw new Error("Upcoming show not found.");
    }

    const payload = withoutUndefinedFields({
      title: input.title,
      whatnotUrl: input.whatnotUrl,
      scheduledStartAt: input.scheduledStartAt,
      status: input.status,
      productionStatus: input.productionStatus,
      notes: input.notes?.trim(),
      updatedBy: caller.id,
      updatedAt: serverTimestamp(),
    });

    assertNoUndefinedFirestoreFields(payload, "Upcoming show update payload");
    await runTracedWrite("updateDoc", () => updateDoc(showRef, payload), {
      app: "studio",
      collection: "upcomingShows",
      documentPathPattern: "upcomingShows/{upcomingShowId}",
      source: "upcomingShowService.updateUpcomingShow",
    });

    return this.getUpcomingShowById(caller, upcomingShowId);
  },

  /**
   * Records that staff successfully generated gang sheet PNG(s) for this show / Internal Gangsheet.
   * Optional telemetry only — Mark Complete / Mark finished do not require generation.
   * Does not re-read/map the show after write: an immediate getDoc can still see pending
   * `serverTimestamp()` sentinels and falsely throw "record is incomplete."
   */
  async recordGangSheetGenerated(caller: User, upcomingShowId: string): Promise<void> {
    if (!permissionService.canManageUpcomingShows(caller)) {
      throw new Error("You do not have permission to manage upcoming shows.");
    }

    const showRef = doc(firestoreCollectionService.getUpcomingShowsCollection(), upcomingShowId);
    const snapshot = await getDoc(showRef);
    if (!snapshot.exists()) {
      throw new Error("Upcoming show not found.");
    }

    await runTracedWrite(
      "updateDoc",
      () =>
        updateDoc(showRef, {
          gangSheetGeneratedAt: serverTimestamp(),
          gangSheetGeneratedBy: caller.id,
          // Intentionally omit updatedAt — a pending serverTimestamp sentinel on that required
          // field was making live show mapping throw "incomplete" and wipe the generate UI.
          updatedBy: caller.id,
        }),
      {
        app: "studio",
        collection: "upcomingShows",
        documentPathPattern: "upcomingShows/{upcomingShowId}",
        source: "upcomingShowService.recordGangSheetGenerated",
      },
    );
  },

  /**
   * Sets the show's staff-editable capacity. Lowering the max below the current allocated
   * quantity requires `override: true` (a danger-confirmed staff action); Portal customers
   * never call this method, so there is no separate customer-facing override path to guard.
   */
  async setShowMaxQuantity(
    caller: User,
    upcomingShowId: string,
    input: SetShowMaxQuantityInput,
  ): Promise<UpcomingShow> {
    if (!permissionService.canManageUpcomingShows(caller)) {
      throw new Error("You do not have permission to manage upcoming shows.");
    }

    const show = await this.getUpcomingShowById(caller, upcomingShowId);

    if (
      input.maxTotalQuantity !== undefined &&
      input.maxTotalQuantity < show.allocatedQuantity &&
      !input.override
    ) {
      throw new Error("This maximum is below the current allocated quantity. Confirm the override to proceed.");
    }

    const showRef = doc(firestoreCollectionService.getUpcomingShowsCollection(), upcomingShowId);
    const payload = withoutUndefinedFields({
      maxTotalQuantity: input.maxTotalQuantity,
      maxQuantityOverridden: Boolean(input.override),
      updatedBy: caller.id,
      updatedAt: serverTimestamp(),
    });

    assertNoUndefinedFirestoreFields(payload, "Show max quantity payload");
    await runTracedWrite("updateDoc", () => updateDoc(showRef, payload), {
      app: "studio",
      collection: "upcomingShows",
      documentPathPattern: "upcomingShows/{upcomingShowId}",
      source: "upcomingShowService.setShowMaxQuantity",
    });

    return this.getUpcomingShowById(caller, upcomingShowId);
  },

  async deleteUpcomingShow(): Promise<void> {
    throw new Error(
      "Direct show deletion is disabled. Use the Show Queue delete action (server-validated).",
    );
  },

  /**
   * Live, ref-counted, per-show subscription — replaces a one-shot `listShowAllocations` fetch
   * for consumers (Show Queue) that need cross-client updates (e.g. a Portal-submitted
   * allocation) reflected without a remount (Plan Section 21.3/21.4, Fix 3). Bounded to exactly
   * one show via the identical `where("upcomingShowId", "==", upcomingShowId)` filter
   * `listShowAllocations` already uses — no new index, no wider scope.
   */
  subscribeToShowAllocations(
    caller: User,
    upcomingShowId: string,
    onChange: (allocations: ShowAllocation[]) => void,
    onError: (message: string) => void,
  ): Unsubscribe {
    if (!permissionService.canViewUpcomingShows(caller)) {
      onChange([]);
      return () => undefined;
    }

    return getOrCreateShowAllocationsSubscription(upcomingShowId).subscribe(onChange, onError);
  },

  /**
   * Live, ref-counted, single-document subscription for exactly one upcoming show (Plan Section
   * 22.4/22.5, Amendment 4, Fix 3 extended) — supplies the show-level `capacity`/summary fields
   * (`allocatedQuantity`, `productionStatus`, etc.) that `subscribeToShowAllocations` (above) never
   * covered, so the currently-selected Show Queue show reflects a Portal-submitted allocation's
   * `allocatedQuantity` bump without a remount. Bounded to exactly one document; does not convert
   * `listUpcomingShows`'s full-collection fetch into a live listener.
   */
  subscribeToUpcomingShow(
    caller: User,
    upcomingShowId: string,
    onChange: (show: UpcomingShow | null) => void,
    onError: (message: string) => void,
  ): Unsubscribe {
    if (!permissionService.canViewUpcomingShows(caller)) {
      onChange(null);
      return () => undefined;
    }

    return getOrCreateUpcomingShowSubscription(upcomingShowId).subscribe(onChange, onError);
  },

  async listShowAllocations(caller: User, upcomingShowId: string): Promise<ShowAllocation[]> {
    if (!permissionService.canViewUpcomingShows(caller)) {
      return [];
    }

    const allocationsQuery = query(
      firestoreCollectionService.getShowAllocationsCollection(),
      where("upcomingShowId", "==", upcomingShowId),
    );
    const snapshot = await getDocs(allocationsQuery);

    return snapshot.docs.flatMap((allocationDoc) => {
      try {
        return [
          mapShowAllocationData(allocationDoc.id, allocationDoc.data() as ShowAllocationDocumentData),
        ];
      } catch (error) {
        console.warn(
          `[upcomingShowService] Skipping incomplete show allocation ${allocationDoc.id}:`,
          error instanceof Error ? error.message : error,
        );
        return [];
      }
    });
  },

  async listShowAllocationsForPrintRequest(caller: User, printRequestId: string): Promise<ShowAllocation[]> {
    if (!permissionService.canViewUpcomingShows(caller)) {
      return [];
    }

    const allocationsQuery = query(
      firestoreCollectionService.getShowAllocationsCollection(),
      where("printRequestId", "==", printRequestId),
    );
    const snapshot = await getDocs(allocationsQuery);

    return snapshot.docs.flatMap((allocationDoc) => {
      try {
        return [
          mapShowAllocationData(allocationDoc.id, allocationDoc.data() as ShowAllocationDocumentData),
        ];
      } catch (error) {
        console.warn(
          `[upcomingShowService] Skipping incomplete show allocation ${allocationDoc.id}:`,
          error instanceof Error ? error.message : error,
        );
        return [];
      }
    });
  },

  /** Lists every show allocation across all shows, used to derive Working/Queued/Printed grouping for the Print Requests list. */
  async listAllShowAllocations(caller: User): Promise<ShowAllocation[]> {
    if (!permissionService.canViewUpcomingShows(caller)) {
      return [];
    }

    traceFirestoreOneShotStart("getDocs", "showAllocations:all");
    const snapshot = await getDocs(firestoreCollectionService.getShowAllocationsCollection());
    traceFirestoreOneShotComplete("getDocs", "showAllocations:all", snapshot.size);

    return snapshot.docs.flatMap((allocationDoc) => {
      try {
        return [
          mapShowAllocationData(allocationDoc.id, allocationDoc.data() as ShowAllocationDocumentData),
        ];
      } catch (error) {
        console.warn(
          `[upcomingShowService] Skipping incomplete show allocation ${allocationDoc.id}:`,
          error instanceof Error ? error.message : error,
        );
        return [];
      }
    });
  },

  /**
   * Allocates some or all of a Print Request item's quantity to a show. When `quantity` is
   * omitted, allocates the item's full remaining unallocated quantity. Exceeding the show's
   * remaining capacity is blocked unless `overrideCapacity` is set (a staff-only danger action);
   * the model supports the same item being allocated across multiple shows via separate
   * `showAllocations` records, so a Print Request can be split without any change to
   * `printRequestItems`, `printRequests`, or `designs`.
   */
  async allocatePrintRequestItem(
    caller: User,
    upcomingShowId: string,
    input: AllocatePrintRequestItemInput,
  ): Promise<ShowAllocation> {
    if (!permissionService.canManageUpcomingShows(caller)) {
      throw new Error("You do not have permission to manage show allocations.");
    }

    const [show, printRequest, requestItems, existingAllocationsForItem] = await Promise.all([
      this.getUpcomingShowById(caller, upcomingShowId),
      printRequestService.getPrintRequestById(caller, input.printRequestId),
      printRequestService.listPrintRequestItems(caller, input.printRequestId),
      this.listShowAllocations(caller, upcomingShowId),
    ]);

    if (isStaffGangSheetShow(show) && !permissionService.canManageStaffGangSheetShow(caller, show)) {
      throw new Error("You can only add requests to Internal Gang Sheets assigned to you.");
    }

    if (
      !canAllocateOriginToShowSource({
        source: show.source,
        requestOrigin: printRequest.requestOrigin,
        isInternal: printRequest.isInternal,
      })
    ) {
      throw new Error(
        "Only Internal print requests can be added to Internal Gangsheets.",
      );
    }

    const requestItem = requestItems.find((item) => item.id === input.printRequestItemId);

    if (!requestItem) {
      throw new Error("Print request item not found.");
    }

    const requestedSize = await assertPersistedPrintRequestItemSize(caller, requestItem);

    const now = new Date();
    const blockReason = getShowAllocationBlockReason(
      {
        scheduledStartAt: show.scheduledStartAt,
        productionStatus: show.productionStatus,
        maxTotalQuantity: show.maxTotalQuantity,
        allocatedQuantity: show.allocatedQuantity,
      },
      now,
    );

    if (blockReason) {
      throw new Error(formatShowAllocationBlockedMessage(blockReason));
    }

    if (!canAllocatePrintRequestToShow(show, now)) {
      throw new Error(PAST_SHOW_READ_ONLY_MESSAGE);
    }

    const alreadyAllocatedForItem = existingAllocationsForItem
      .filter((allocation) => allocation.printRequestItemId === requestItem.id && allocation.status !== "canceled")
      .reduce((sum, allocation) => sum + allocation.allocatedQuantity, 0);
    const remainingItemQuantity = Math.max(0, requestItem.quantity - alreadyAllocatedForItem);
    const requestedQuantity = input.quantity ?? remainingItemQuantity;

    if (requestedQuantity <= 0) {
      throw new Error("There is no remaining unallocated quantity on this item for this show.");
    }

    if (show.maxTotalQuantity !== undefined) {
      const remainingCapacity = show.maxTotalQuantity - show.allocatedQuantity;

      if (requestedQuantity > remainingCapacity) {
        throw new Error(SHOW_QUEUE_FULL_MESSAGE);
      }
    }

    const allocationRef = doc(firestoreCollectionService.getShowAllocationsCollection());
    const sourceFields = buildShowAllocationSourceFields({
      item: {
        sourceType: requestItem.sourceType,
        designId: requestItem.designId,
        customerUploadId: requestItem.customerUploadId,
        titleSnapshot: requestItem.titleSnapshot,
        quantity: requestItem.quantity,
        printWidthInches: requestedSize.printWidthInches,
        printHeightInches: requestedSize.printHeightInches,
        sizeLabel: requestItem.sizeLabel,
      },
    });
    const payload = withoutUndefinedFields({
      upcomingShowId,
      printRequestId: printRequest.id,
      printRequestItemId: requestItem.id,
      ...sourceFields,
      customerId: printRequest.customerId,
      requestNameSnapshot: printRequest.name,
      requestOriginSnapshot: printRequest.requestOrigin,
      allocatedQuantity: requestedQuantity,
      sourceItemQuantitySnapshot: requestItem.quantity,
      printWidthInches: requestItem.printWidthInches,
      printHeightInches: requestItem.printHeightInches,
      sizeLabel: requestItem.sizeLabel,
      status: "pending" as const,
      addedBy: caller.id,
      updatedBy: caller.id,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });

    assertNoUndefinedFirestoreFields(payload, "Show allocation payload");
    await runTracedWrite("setDoc", () => setDoc(allocationRef, payload), {
      app: "studio",
      collection: "showAllocations",
      documentPathPattern: "showAllocations/{showAllocationId}",
      source: "upcomingShowService.allocatePrintRequestItem",
    });

    await runTracedWrite(
      "updateDoc",
      () =>
        updateDoc(doc(firestoreCollectionService.getUpcomingShowsCollection(), upcomingShowId), {
          allocatedQuantity: show.allocatedQuantity + requestedQuantity,
          updatedBy: caller.id,
          updatedAt: serverTimestamp(),
        }),
      {
        app: "studio",
        collection: "upcomingShows",
        documentPathPattern: "upcomingShows/{upcomingShowId}",
        source: "upcomingShowService.allocatePrintRequestItem",
      },
    );

    if (printRequest.status === "draft" || printRequest.status === "editing") {
      await printRequestService.updatePrintRequest(caller, printRequest.id, { status: "active" });
    }

    await this.syncPrintRequestQueueTabBestEffort(
      printRequest.id,
      "upcomingShowService.allocatePrintRequestItem",
    );

    const createdSnapshot = await getDoc(allocationRef);
    return mapShowAllocationData(createdSnapshot.id, createdSnapshot.data() as ShowAllocationDocumentData);
  },

  async updateShowAllocationStatus(
    caller: User,
    allocationId: string,
    status: ShowAllocationStatus,
  ): Promise<ShowAllocation> {
    if (!permissionService.canManageUpcomingShows(caller)) {
      throw new Error("You do not have permission to manage show allocations.");
    }

    const allocationRef = doc(firestoreCollectionService.getShowAllocationsCollection(), allocationId);
    const snapshot = await getDoc(allocationRef);

    if (!snapshot.exists()) {
      throw new Error("Show allocation not found.");
    }

    const statusFields =
      status === "queued"
        ? { queuedAt: serverTimestamp(), queuedBy: caller.id }
        : status === "printed"
          ? { printedAt: serverTimestamp(), printedBy: caller.id }
          : status === "done"
            ? { completedAt: serverTimestamp(), completedBy: caller.id }
            : status === "canceled"
              ? { canceledAt: serverTimestamp(), canceledBy: caller.id }
              : {};

    const payload = withoutUndefinedFields({
      status,
      updatedBy: caller.id,
      updatedAt: serverTimestamp(),
      ...statusFields,
    });

    assertNoUndefinedFirestoreFields(payload, "Show allocation status update payload");
    await runTracedWrite("updateDoc", () => updateDoc(allocationRef, payload), {
      app: "studio",
      collection: "showAllocations",
      documentPathPattern: "showAllocations/{showAllocationId}",
      source: "upcomingShowService.updateShowAllocationStatus",
    });

    const updatedSnapshot = await getDoc(allocationRef);
    const updatedAllocation = mapShowAllocationData(updatedSnapshot.id, updatedSnapshot.data() as ShowAllocationDocumentData);

    if (isPrintedAllocationStatus(status)) {
      await this.markPrintRequestCompletedIfFullyPrinted(caller, updatedAllocation.printRequestId);
    }

    return updatedAllocation;
  },

  async startShowPrinting(caller: User, upcomingShowId: string): Promise<ShowTimerActionResult> {
    if (!permissionService.canManageUpcomingShows(caller)) {
      throw new Error("You do not have permission to manage show printing.");
    }

    const showRef = doc(firestoreCollectionService.getUpcomingShowsCollection(), upcomingShowId);
    const allocationsQuery = query(
      firestoreCollectionService.getShowAllocationsCollection(),
      where("upcomingShowId", "==", upcomingShowId),
    );
    // Same two reads as the prior getUpcomingShowById + listShowAllocations path, retained here so
    // the timer manifest can describe the exact raw documents that actually enter the batch.
    const [showSnapshot, allocationSnapshot] = await Promise.all([
      getDoc(showRef),
      getDocs(allocationsQuery),
    ]);
    if (!showSnapshot.exists()) {
      throw new Error("Upcoming show not found.");
    }
    const showData = showSnapshot.data() as UpcomingShowDocumentData;
    const showDiagnostic = diagnoseUpcomingShowForTimer(showData);
    if (showDiagnostic.parserStatus === "incomplete") {
      throw new Error(
        `This show cannot start printing because required fields are missing or invalid: ${showDiagnostic.missingRequiredFields.join(", ")}.`,
      );
    }
    const show = mapUpcomingShowData(showSnapshot.id, showData);
    const allocationRecords = allocationSnapshot.docs.flatMap((allocationDoc) => {
      const data = allocationDoc.data() as ShowAllocationDocumentData;
      const diagnostic = diagnoseShowAllocationForTimer(data);
      try {
        return [{
          allocation: mapShowAllocationData(allocationDoc.id, data),
          diagnostic,
        }];
      } catch (error) {
        console.warn(
          `[upcomingShowService] Skipping incomplete show allocation ${allocationDoc.id}; missing or invalid fields: ${diagnostic.missingRequiredFields.join(", ") || "unknown"}.`,
        );
        return [];
      }
    });

    if (!STARTABLE_SHOW_PRODUCTION_STATUSES.includes(show.productionStatus)) {
      throw new Error("This show is not ready to start printing.");
    }

    if (!canStartShowPrinting(show, new Date())) {
      throw new Error(PAST_SHOW_READ_ONLY_MESSAGE);
    }

    const allocationsToStart = allocationRecords.filter(
      ({ allocation }) =>
        allocation.status !== "canceled" && STARTABLE_ALLOCATION_STATUSES.includes(allocation.status),
    );

    if (allocationsToStart.length === 0) {
      throw new Error("Add print requests to this show before starting printing.");
    }

    const batch = writeBatch(db);
    const operationManifest = {
      actionName: "start",
      phase: "mutation",
      projectId: db.app.options.projectId ?? "unknown-project",
      staffRole: caller.role,
      isActive: caller.isActive,
      showId: upcomingShowId,
      operationCount: allocationsToStart.length + 1,
      operations: [
        {
          operationIndex: 1,
          type: "update",
          pathTemplate: "upcomingShows/{upcomingShowId}",
          documentId: upcomingShowId,
          changedFields: [
            "productionStatus",
            "activePrintStartedAt",
            "printStartedAt",
            "printPausedAt",
            "updatedBy",
            "updatedAt",
          ],
          parserStatus: showDiagnostic.parserStatus,
          missingRequiredFields: showDiagnostic.missingRequiredFields,
          legacyExtraFields: showDiagnostic.legacyExtraFields,
        },
        ...allocationsToStart.map(({ allocation, diagnostic }, index) => ({
          operationIndex: index + 2,
          type: "update",
          pathTemplate: "showAllocations/{showAllocationId}",
          documentId: allocation.id,
          changedFields: ["status", "updatedBy", "updatedAt"],
          existingProductionStatus: allocation.status,
          proposedProductionStatus: "in_progress",
          parserStatus: diagnostic.parserStatus,
          missingRequiredFields: diagnostic.missingRequiredFields,
          legacyExtraFields: diagnostic.legacyExtraFields,
        })),
      ],
      currentProductionStatus: show.productionStatus,
      proposedProductionStatus: "printing",
      includesRequestDocuments: false,
      includesAllocationDocuments: true,
    } as const;

    if (import.meta.env.DEV) {
      console.info("[upcomingShowService] production timer operation manifest", operationManifest);
    }

    batch.update(showRef, {
      productionStatus: "printing",
      activePrintStartedAt: serverTimestamp(),
      printStartedAt: show.printStartedAt ?? serverTimestamp(),
      printPausedAt: deleteField(),
      updatedBy: caller.id,
      updatedAt: serverTimestamp(),
    });

    for (const { allocation } of allocationsToStart) {
      batch.update(doc(firestoreCollectionService.getShowAllocationsCollection(), allocation.id), {
        status: "in_progress",
        updatedBy: caller.id,
        updatedAt: serverTimestamp(),
      });
    }

    try {
      await runTracedWrite(
        "writeBatch",
        () => batch.commit(),
        {
          app: "studio",
          collection: "upcomingShows",
          documentPathPattern: "upcomingShows/{upcomingShowId}",
          source: "upcomingShowService.startShowPrinting",
        },
        { writeCount: allocationsToStart.length + 1 },
      );
    } catch (error) {
      if (import.meta.env.DEV) {
        console.error("[upcomingShowService] production timer operation denied", {
          ...operationManifest,
          firebaseErrorCode:
            error && typeof error === "object" && "code" in error
              ? String((error as { code: unknown }).code)
              : "unknown",
        });
      }
      throw error;
    }
    return {};
  },

  async listShowAllocationsForPrintRequestForReconciliation(
    caller: User,
    printRequestId: string,
    readSource: ShowReconciliationReadSource = "default",
  ): Promise<ShowAllocation[]> {
    if (!permissionService.canViewUpcomingShows(caller)) {
      throw new Error("You do not have permission to view show allocations.");
    }
    const allocationsQuery = query(
      firestoreCollectionService.getShowAllocationsCollection(),
      where("printRequestId", "==", printRequestId),
    );
    const snapshot = readSource === "server"
      ? await getDocsFromServer(allocationsQuery)
      : await getDocs(allocationsQuery);
    return snapshot.docs.map((allocationDoc) => {
      const rawData = allocationDoc.data() as ShowAllocationDocumentData;
      const diagnostics = diagnoseShowAllocationForTimer(rawData);
      try {
        return mapShowAllocationData(
          allocationDoc.id,
          rawData,
        );
      } catch (error) {
        throw new ShowCompletionReconciliationRemediationError(
          `Show allocation ${allocationDoc.id} is incomplete and needs remediation.`,
          {
            missingFields: diagnostics.missingRequiredFields,
            legacyExtraFields: diagnostics.legacyExtraFields,
          },
        );
      }
    });
  },

  async pauseShowPrinting(caller: User, upcomingShowId: string): Promise<ShowTimerActionResult> {
    if (!permissionService.canManageUpcomingShows(caller)) {
      throw new Error("You do not have permission to manage show printing.");
    }

    const showSnapshot = await getDoc(
      doc(firestoreCollectionService.getUpcomingShowsCollection(), upcomingShowId),
    );
    if (!showSnapshot.exists()) throw new Error("Upcoming show not found.");
    const showData = showSnapshot.data() as UpcomingShowDocumentData;
    const showDiagnostic = diagnoseUpcomingShowForTimer(showData);
    if (showDiagnostic.parserStatus === "incomplete") {
      throw new Error(
        `This show cannot pause printing because required fields are missing or invalid: ${showDiagnostic.missingRequiredFields.join(", ")}.`,
      );
    }
    const show = mapUpcomingShowData(showSnapshot.id, showData);

    if (show.productionStatus !== "printing" || show.activePrintStartedAt === undefined) {
      throw new Error("Printing is not running on this show.");
    }

    const foldedMs = computeElapsedPrintMs({
      accumulatedPrintMs: show.accumulatedPrintMs,
      activePrintStartedAtMs: show.activePrintStartedAt.toMillis(),
      nowMs: Date.now(),
    });

    const operationManifest = {
      actionName: "pause",
      phase: "mutation",
      projectId: db.app.options.projectId ?? "unknown-project",
      staffRole: caller.role,
      isActive: caller.isActive,
      showId: upcomingShowId,
      operationCount: 1,
      operations: [{
        operationIndex: 1,
        type: "update",
        pathTemplate: "upcomingShows/{upcomingShowId}",
        documentId: upcomingShowId,
        changedFields: ["accumulatedPrintMs", "activePrintStartedAt", "printPausedAt", "updatedBy", "updatedAt"],
        existingProductionStatus: show.productionStatus,
        proposedProductionStatus: "printing",
        parserStatus: showDiagnostic.parserStatus,
        missingRequiredFields: showDiagnostic.missingRequiredFields,
        legacyExtraFields: showDiagnostic.legacyExtraFields,
      }],
    } as const;
    if (import.meta.env.DEV) {
      console.info("[upcomingShowService] production timer operation manifest", operationManifest);
    }
    try {
      await runTracedWrite(
        "updateDoc",
        () => updateDoc(doc(firestoreCollectionService.getUpcomingShowsCollection(), upcomingShowId), {
          accumulatedPrintMs: foldedMs,
          activePrintStartedAt: deleteField(),
          printPausedAt: serverTimestamp(),
          updatedBy: caller.id,
          updatedAt: serverTimestamp(),
        }),
      {
        app: "studio",
        collection: "upcomingShows",
        documentPathPattern: "upcomingShows/{upcomingShowId}",
        source: "upcomingShowService.pauseShowPrinting",
        },
      );
    } catch (error) {
      if (import.meta.env.DEV) {
        console.error("[upcomingShowService] production timer operation denied", {
          ...operationManifest,
          firebaseErrorCode: error && typeof error === "object" && "code" in error
            ? String((error as { code: unknown }).code) : "unknown",
        });
      }
      throw error;
    }
    return {};
  },

  async resumeShowPrinting(caller: User, upcomingShowId: string): Promise<ShowTimerActionResult> {
    if (!permissionService.canManageUpcomingShows(caller)) {
      throw new Error("You do not have permission to manage show printing.");
    }

    const showSnapshot = await getDoc(
      doc(firestoreCollectionService.getUpcomingShowsCollection(), upcomingShowId),
    );
    if (!showSnapshot.exists()) throw new Error("Upcoming show not found.");
    const showData = showSnapshot.data() as UpcomingShowDocumentData;
    const showDiagnostic = diagnoseUpcomingShowForTimer(showData);
    if (showDiagnostic.parserStatus === "incomplete") {
      throw new Error(
        `This show cannot resume printing because required fields are missing or invalid: ${showDiagnostic.missingRequiredFields.join(", ")}.`,
      );
    }
    const show = mapUpcomingShowData(showSnapshot.id, showData);

    if (show.productionStatus !== "printing" || show.printPausedAt === undefined || show.activePrintStartedAt !== undefined) {
      throw new Error("Printing is not paused on this show.");
    }

    const operationManifest = {
      actionName: "resume",
      phase: "mutation",
      projectId: db.app.options.projectId ?? "unknown-project",
      staffRole: caller.role,
      isActive: caller.isActive,
      showId: upcomingShowId,
      operationCount: 1,
      operations: [{
        operationIndex: 1,
        type: "update",
        pathTemplate: "upcomingShows/{upcomingShowId}",
        documentId: upcomingShowId,
        changedFields: ["activePrintStartedAt", "printPausedAt", "updatedBy", "updatedAt"],
        existingProductionStatus: show.productionStatus,
        proposedProductionStatus: "printing",
        parserStatus: showDiagnostic.parserStatus,
        missingRequiredFields: showDiagnostic.missingRequiredFields,
        legacyExtraFields: showDiagnostic.legacyExtraFields,
      }],
    } as const;
    if (import.meta.env.DEV) {
      console.info("[upcomingShowService] production timer operation manifest", operationManifest);
    }
    try {
      await runTracedWrite(
        "updateDoc",
        () => updateDoc(doc(firestoreCollectionService.getUpcomingShowsCollection(), upcomingShowId), {
          activePrintStartedAt: serverTimestamp(),
          printPausedAt: deleteField(),
          updatedBy: caller.id,
          updatedAt: serverTimestamp(),
        }),
      {
        app: "studio",
        collection: "upcomingShows",
        documentPathPattern: "upcomingShows/{upcomingShowId}",
        source: "upcomingShowService.resumeShowPrinting",
        },
      );
    } catch (error) {
      if (import.meta.env.DEV) {
        console.error("[upcomingShowService] production timer operation denied", {
          ...operationManifest,
          firebaseErrorCode: error && typeof error === "object" && "code" in error
            ? String((error as { code: unknown }).code) : "unknown",
        });
      }
      throw error;
    }
    return {};
  },

  async markShowPrintingFinished(caller: User, upcomingShowId: string): Promise<ShowTimerActionResult> {
    if (!permissionService.canManageUpcomingShows(caller)) {
      throw new Error("You do not have permission to manage show printing.");
    }

    const showRef = doc(firestoreCollectionService.getUpcomingShowsCollection(), upcomingShowId);
    const allocationsQuery = query(
      firestoreCollectionService.getShowAllocationsCollection(),
      where("upcomingShowId", "==", upcomingShowId),
    );
    const [showSnapshot, allocationSnapshot] = await Promise.all([
      getDoc(showRef),
      getDocs(allocationsQuery),
    ]);
    if (!showSnapshot.exists()) {
      throw new Error("Upcoming show not found.");
    }
    const showData = showSnapshot.data() as UpcomingShowDocumentData;
    const showDiagnostic = diagnoseUpcomingShowForTimer(showData);
    if (showDiagnostic.parserStatus === "incomplete") {
      throw new Error(
        `This show cannot be marked finished because required fields are missing or invalid: ${showDiagnostic.missingRequiredFields.join(", ")}.`,
      );
    }
    const show = mapUpcomingShowData(showSnapshot.id, showData);
    const invalidAllocationDiagnostics: Array<{ id: string; fields: string[] }> = [];
    const allocationRecords = allocationSnapshot.docs.flatMap((allocationDoc) => {
      const data = allocationDoc.data() as ShowAllocationDocumentData;
      const diagnostic = diagnoseShowAllocationForTimer(data);
      try {
        return [{ allocation: mapShowAllocationData(allocationDoc.id, data), diagnostic }];
      } catch {
        invalidAllocationDiagnostics.push({
          id: allocationDoc.id,
          fields: diagnostic.missingRequiredFields,
        });
        return [];
      }
    });
    if (invalidAllocationDiagnostics.length > 0) {
      if (import.meta.env.DEV) {
        console.warn("[upcomingShowService] selected Finish blocked by invalid allocations", {
          showId: upcomingShowId,
          allocations: invalidAllocationDiagnostics,
        });
      }
      const fields = [
        ...new Set(invalidAllocationDiagnostics.flatMap((diagnostic) => diagnostic.fields)),
      ];
      throw new Error(
        `This show cannot be marked finished until ${invalidAllocationDiagnostics.length} allocation record(s) are remediated. Missing or invalid fields: ${fields.join(", ") || "unknown"}.`,
      );
    }

    const finishPlan = resolveShowFinishMutationPlan(show.productionStatus);
    if (finishPlan === "reject") {
      throw new Error("Start printing on this show before marking it finished.");
    }

    const allocationsToFinish = allocationRecords.filter(
      ({ allocation }) =>
        allocation.status !== "canceled" && FINISHABLE_ALLOCATION_STATUSES.includes(allocation.status),
    );

    if (finishPlan === "mutate" && allocationsToFinish.length === 0) {
      throw new Error("There are no active allocations to finish on this show.");
    }

    const foldedMs = computeElapsedPrintMs({
      accumulatedPrintMs: show.accumulatedPrintMs,
      activePrintStartedAtMs: show.activePrintStartedAt?.toMillis(),
      nowMs: Date.now(),
    });

    let didMutateShow = finishPlan === "mutate";
    if (finishPlan === "mutate") {
      const operationManifest = {
        actionName: "finish",
        phase: "mutation",
        projectId: db.app.options.projectId ?? "unknown-project",
        staffRole: caller.role,
        isActive: caller.isActive,
        showId: upcomingShowId,
        operationCount: allocationsToFinish.length + 1,
        operations: [
          {
            operationIndex: 1,
            type: "update",
            pathTemplate: "upcomingShows/{upcomingShowId}",
            documentId: upcomingShowId,
            changedFields: ["productionStatus", "accumulatedPrintMs", "activePrintStartedAt", "printPausedAt",
              "printFinishedAt", "printFinishedBy", "updatedBy", "updatedAt"],
            existingProductionStatus: show.productionStatus,
            proposedProductionStatus: "completed",
            parserStatus: showDiagnostic.parserStatus,
            missingRequiredFields: showDiagnostic.missingRequiredFields,
            legacyExtraFields: showDiagnostic.legacyExtraFields,
          },
          ...allocationsToFinish.map(({ allocation, diagnostic }, index) => ({
            operationIndex: index + 2,
            type: "update",
            pathTemplate: "showAllocations/{showAllocationId}",
            documentId: allocation.id,
            changedFields: ["status", "completedAt", "completedBy", "updatedBy", "updatedAt"],
            existingProductionStatus: allocation.status,
            proposedProductionStatus: "done",
            parserStatus: diagnostic.parserStatus,
            missingRequiredFields: diagnostic.missingRequiredFields,
            legacyExtraFields: diagnostic.legacyExtraFields,
          })),
        ],
      } as const;
      if (import.meta.env.DEV) {
        console.info("[upcomingShowService] production timer operation manifest", operationManifest);
      }

      try {
        didMutateShow = await runTracedWrite(
          "runTransaction",
          () =>
            runTransaction(db, async (transaction) => {
              const latestSnapshot = await transaction.get(showRef);
              if (!latestSnapshot.exists()) {
                throw new Error("Upcoming show not found.");
              }
              const latestShow = mapUpcomingShowData(
                latestSnapshot.id,
                latestSnapshot.data() as UpcomingShowDocumentData,
              );
              const latestPlan = resolveShowFinishMutationPlan(latestShow.productionStatus);
              if (latestPlan === "already_terminal") {
                return false;
              }
              if (latestPlan !== "mutate") {
                throw new Error("Start printing on this show before marking it finished.");
              }

              transaction.update(showRef, {
                productionStatus: "completed",
                accumulatedPrintMs: foldedMs,
                activePrintStartedAt: deleteField(),
                printPausedAt: deleteField(),
                printFinishedAt: serverTimestamp(),
                printFinishedBy: caller.id,
                updatedBy: caller.id,
                updatedAt: serverTimestamp(),
              });

              for (const { allocation } of allocationsToFinish) {
                transaction.update(
                  doc(firestoreCollectionService.getShowAllocationsCollection(), allocation.id),
                  {
                    status: "done",
                    completedAt: serverTimestamp(),
                    completedBy: caller.id,
                    updatedBy: caller.id,
                    updatedAt: serverTimestamp(),
                  },
                );
              }

              return true;
            }),
          {
            app: "studio",
            collection: "upcomingShows",
            documentPathPattern: "upcomingShows/{upcomingShowId}",
            source: "upcomingShowService.markShowPrintingFinished",
          },
          { writeCount: allocationsToFinish.length + 1 },
        );
      } catch (error) {
        if (import.meta.env.DEV) {
          console.error("[upcomingShowService] production timer operation denied", {
            ...operationManifest,
            firebaseErrorCode:
              error && typeof error === "object" && "code" in error
                ? String((error as { code: unknown }).code)
                : "unknown",
          });
        }
        throw error;
      }
    }

    const affectedPrintRequestIds = new Set<string>();
    const requestIdSource = didMutateShow
      ? allocationsToFinish
      : allocationRecords.filter(({ allocation }) => allocation.status !== "canceled");
    for (const { allocation } of requestIdSource) {
      affectedPrintRequestIds.add(allocation.printRequestId);
    }

    // Plan Section 32 (Amendment 14) — Amendment 13 repeated the same default-source reads and could
    // therefore receive the same latency-compensated representation twice. The Finish batch commit
    // above is already backend-acknowledged; the missing guarantee was the read source. Verify only
    // the provisional failed IDs once with server-only request/item/allocation reads.
    const committedVerification = await reconcileShowCompletionWithCommittedVerification(
      [...affectedPrintRequestIds],
      (printRequestId, readSource) =>
        this.markPrintRequestCompletedIfFullyPrinted(caller, printRequestId, readSource),
    );
    const firstPassReconciliation = committedVerification.provisionalResults;
    const reconciliation = committedVerification.results;
    const failedRequestIds = committedVerification.failedRequestIds;
    const remediationRequestIds = committedVerification.remediationRequestIds;

    if (committedVerification.candidateRequestIds.length > 0) {
      if (import.meta.env.DEV) {
        console.info("[upcomingShowService] post-Finish committed-state verification", {
          postFinishVerification: true,
          showIdHash: hashShowIdForPostFinishVerification(upcomingShowId),
          candidateRequestCount: committedVerification.candidateRequestIds.length,
          verificationAttempt: 1,
          readSource: "server",
          fromCache: "unknown",
          hasPendingWrites: "unknown",
          timestampSettled: committedVerification.candidateRequestIds.every((candidateId) => {
            const result = reconciliation.find((entry) => entry.printRequestId === candidateId);
            return result !== undefined
              && result.outcome !== "failed"
              && !result.missingFields.includes("updatedAt");
          }),
          initialClassification: classifyReconciliationResults(firstPassReconciliation),
          verifiedClassification: classifyReconciliationResults(reconciliation),
          warningRendered:
            failedRequestIds.length > 0 || remediationRequestIds.length > 0,
        });
      }
    }

    const reconciliationFailures = failedRequestIds.length;
    if (reconciliationFailures > 0 || remediationRequestIds.length > 0) {
      console.warn("[upcomingShowService] show printing finished; request reconciliation needs retry", {
        actionName: "finish",
        phase: "post_commit_reconciliation",
        showIdHash: hashShowIdForPostFinishVerification(upcomingShowId),
        affectedRequestCount: affectedPrintRequestIds.size,
        failedRequestCount: reconciliationFailures,
        remediationRequestCount: remediationRequestIds.length,
      });
    }

    return {
      reconciliation: {
        affectedRequestCount: affectedPrintRequestIds.size,
        failedRequestCount: reconciliationFailures,
        failedRequestIds,
        remediationRequestCount: remediationRequestIds.length,
        remediationRequestIds,
        results: reconciliation,
      },
    };
  },

  async retryShowCompletionReconciliation(
    caller: User,
    printRequestIds: readonly string[],
  ): Promise<NonNullable<ShowTimerActionResult["reconciliation"]>> {
    const affectedPrintRequestIds = [...new Set(printRequestIds)];
    const results = await Promise.all(
      affectedPrintRequestIds.map((printRequestId) =>
        this.markPrintRequestCompletedIfFullyPrinted(caller, printRequestId, "server"),
      ),
    );
    const { failedRequestIds, remediationRequestIds } =
      summarizeShowCompletionReconciliation(results);
    return {
      affectedRequestCount: affectedPrintRequestIds.length,
      failedRequestCount: failedRequestIds.length,
      failedRequestIds,
      remediationRequestCount: remediationRequestIds.length,
      remediationRequestIds,
      results,
    };
  },

  /**
   * Transitions a Print Request to `completed` once every unit of its total requested quantity
   * has been allocated and printed across all its show allocations. Only ever moves the request
   * forward to `completed`; never touches `designs.status` or reverses a manual `archived` state.
   */
  async markPrintRequestCompletedIfFullyPrinted(
    caller: User,
    printRequestId: string,
    readSource: ShowReconciliationReadSource = "default",
  ): Promise<ShowCompletionReconciliationResult> {
    return reconcileCompletedPrintRequest(printRequestId, {
      readRequest: () =>
        printRequestService.getPrintRequestForShowReconciliation(caller, printRequestId, readSource),
      readItems: () =>
        printRequestService.listPrintRequestItemsForShowReconciliation(
          caller,
          printRequestId,
          readSource,
        ),
      readAllocations: () =>
        this.listShowAllocationsForPrintRequestForReconciliation(caller, printRequestId, readSource),
      writeCompleted: () =>
        printRequestService.markPrintRequestCompletedForShowReconciliation(caller, printRequestId),
      isPrintedStatus: (status) => isPrintedAllocationStatus(status as ShowAllocationStatus),
    });
  },

  async removeShowAllocation(caller: User, allocationId: string): Promise<void> {
    if (!permissionService.canManageUpcomingShows(caller)) {
      throw new Error("You do not have permission to manage show allocations.");
    }

    const allocationRef = doc(firestoreCollectionService.getShowAllocationsCollection(), allocationId);
    const snapshot = await getDoc(allocationRef);

    if (!snapshot.exists()) {
      return;
    }

    const allocation = mapShowAllocationData(snapshot.id, snapshot.data() as ShowAllocationDocumentData);
    const show = await this.getUpcomingShowById(caller, allocation.upcomingShowId);

    if (!canRemoveRequestFromShow(show.productionStatus)) {
      throw new Error("This show has already started printing. Removing allocations requires an admin correction.");
    }

    await runTracedWrite("deleteDoc", () => deleteDoc(allocationRef), {
      app: "studio",
      collection: "showAllocations",
      documentPathPattern: "showAllocations/{showAllocationId}",
      source: "upcomingShowService.removeShowAllocation",
    });
    await this.recalculateShowAllocatedQuantity(caller, allocation.upcomingShowId);
    await this.markPrintRequestEditingIfNoActiveAllocations(caller, allocation.printRequestId);
    await this.syncPrintRequestQueueTabBestEffort(
      allocation.printRequestId,
      "upcomingShowService.removeShowAllocation",
    );
  },

  /**
   * Removes every non-canceled allocation for a Print Request on a single show in one
   * operation, then recomputes the show's `allocatedQuantity` from what remains — removing
   * allocations one at a time and decrementing a running total independently can drift from
   * the true remaining sum if a write is retried, so this always recomputes from source data.
   * Blocked once the show has started printing; staff must use an approved admin correction
   * instead of the normal remove/re-add flow at that point.
   */
  async removeShowAllocationsForRequest(caller: User, upcomingShowId: string, printRequestId: string): Promise<void> {
    if (!permissionService.canManageUpcomingShows(caller)) {
      throw new Error("You do not have permission to manage show allocations.");
    }

    const show = await this.getUpcomingShowById(caller, upcomingShowId);

    if (!canRemoveRequestFromShow(show.productionStatus)) {
      throw new Error("This show has already started printing. Removing allocations requires an admin correction.");
    }

    const allocations = await this.listShowAllocations(caller, upcomingShowId);
    const allocationsForRequest = allocations.filter((allocation) => allocation.printRequestId === printRequestId);

    await Promise.all(
      allocationsForRequest.map((allocation) =>
        runTracedWrite(
          "deleteDoc",
          () => deleteDoc(doc(firestoreCollectionService.getShowAllocationsCollection(), allocation.id)),
          {
            app: "studio",
            collection: "showAllocations",
            documentPathPattern: "showAllocations/{showAllocationId}",
            source: "upcomingShowService.removeShowAllocationsForRequest",
          },
        ),
      ),
    );

    await this.recalculateShowAllocatedQuantity(caller, upcomingShowId);
    await this.markPrintRequestEditingIfNoActiveAllocations(caller, printRequestId);
    await this.syncPrintRequestQueueTabBestEffort(
      printRequestId,
      "upcomingShowService.removeShowAllocationsForRequest",
    );
  },

  /**
   * Force-persist `queueTab` after allocate/remove so Print Requests tabs update without waiting
   * on trigger delivery. Retries once; failures are swallowed — the Firestore trigger remains backup.
   */
  async syncPrintRequestQueueTabBestEffort(printRequestId: string, source: string): Promise<string | null> {
    const invoke = callTracedFunction<{ printRequestId: string }, { queueTab: string | null }>(
      "syncPrintRequestQueueTab",
      { source },
    );

    try {
      const result = await invoke({ printRequestId });
      return result.queueTab;
    } catch (firstError) {
      try {
        const result = await invoke({ printRequestId });
        return result.queueTab;
      } catch (secondError) {
        console.warn(
          `[${source}] syncPrintRequestQueueTab failed; trigger backup will reconcile.`,
          firstError,
          secondError,
        );
        return null;
      }
    }
  },

  /**
   * Transitions a Print Request from `active` to `editing` once it no longer has any active
   * (non-canceled) show allocations anywhere — i.e. it was queued and has now been fully removed
   * from every show, so staff can revise it again. Never touches `draft` (never queued yet),
   * `completed`, or `archived`; `editing` only ever comes from a prior `active`/queued state.
   */
  async markPrintRequestEditingIfNoActiveAllocations(caller: User, printRequestId: string): Promise<void> {
    const [printRequest, allocations] = await Promise.all([
      printRequestService.getPrintRequestById(caller, printRequestId),
      this.listShowAllocationsForPrintRequest(caller, printRequestId),
    ]);

    if (printRequest.status !== "active") {
      return;
    }

    const hasActiveAllocation = allocations.some((allocation) => allocation.status !== "canceled");

    if (!hasActiveAllocation) {
      await printRequestService.updatePrintRequest(caller, printRequestId, { status: "editing" });
    }
  },

  /**
   * Recomputes and persists a show's `allocatedQuantity` from its current non-canceled
   * `showAllocations`, rather than trusting incremental add/subtract math. This is the single
   * source of truth update after any allocation add/remove so the denormalized total on the
   * show can never drift from the underlying allocation records.
   */
  async recalculateShowAllocatedQuantity(caller: User, upcomingShowId: string): Promise<void> {
    const [showSnapshot, allocations] = await Promise.all([
      getDoc(doc(firestoreCollectionService.getUpcomingShowsCollection(), upcomingShowId)),
      this.listShowAllocations(caller, upcomingShowId),
    ]);

    if (!showSnapshot.exists()) {
      return;
    }

    const recalculatedTotal = allocations
      .filter((allocation) => allocation.status !== "canceled")
      .reduce((sum, allocation) => sum + allocation.allocatedQuantity, 0);

    await runTracedWrite(
      "updateDoc",
      () =>
        updateDoc(doc(firestoreCollectionService.getUpcomingShowsCollection(), upcomingShowId), {
          allocatedQuantity: recalculatedTotal,
          updatedBy: caller.id,
          updatedAt: serverTimestamp(),
        }),
      {
        app: "studio",
        collection: "upcomingShows",
        documentPathPattern: "upcomingShows/{upcomingShowId}",
        source: "upcomingShowService.recalculateShowAllocatedQuantity",
      },
    );
  },

  /**
   * Plans how a requested quantity would split against a show's remaining capacity, without
   * writing anything. Used by the "Add to Show" flow to offer "add what fits, split the rest"
   * before staff confirm.
   */
  async planAllocationForShow(caller: User, upcomingShowId: string, requestedQuantity: number) {
    const show = await this.getUpcomingShowById(caller, upcomingShowId);
    const remainingCapacity = show.maxTotalQuantity === undefined
      ? undefined
      : Math.max(0, show.maxTotalQuantity - show.allocatedQuantity);

    return planAllocationSplit({ requestedQuantity, remainingCapacity });
  },
};

export function isPrintedAllocationStatus(status: ShowAllocationStatus): boolean {
  return PRINTED_ALLOCATION_STATUSES.includes(status);
}
