import {
  deleteDoc,
  deleteField,
  doc,
  getDoc,
  getDocs,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
  writeBatch,
  type DocumentData,
} from "firebase/firestore";

import { db } from "../../../config/firebase";

import { mapFirestoreTimestamp } from "../../firebase/utils/firestoreTimestamp";
import { assertNoUndefinedFirestoreFields, withoutUndefinedFields } from "../../firebase/utils/firestoreDocument";
import { firestoreCollectionService } from "../../firebase/services/firestoreCollectionService";
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
import { printRequestService } from "../../print-requests/services/printRequestService";
import type {
  ShowProductionStatus,
  UpcomingShowSource,
  UpcomingShowStatus,
  UpcomingShowSyncStatus,
} from "@fresh-prints/shared/types/upcomingShow/upcomingShow.enums";
import type { UpcomingShow } from "@fresh-prints/shared/types/upcomingShow/upcomingShow.types";
import type { ShowAllocationStatus } from "@fresh-prints/shared/types/showAllocation/showAllocation.enums";
import type { ShowAllocation } from "@fresh-prints/shared/types/showAllocation/showAllocation.types";
import { findMatchingUpcomingShow } from "../utils/upcomingShowUpsert";
import { canStartShowPrinting, canAllocatePrintRequestToShow, PAST_SHOW_READ_ONLY_MESSAGE } from "../utils/groupShowsByUpcomingPast";
import { sortUpcomingShowsForDisplay } from "../utils/upcomingShowListSort";
import { showQueueSettingsService } from "./showQueueSettingsService";

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
  createdBy?: unknown;
  updatedBy?: unknown;
  createdAt?: unknown;
  updatedAt?: unknown;
}

interface ShowAllocationDocumentData extends DocumentData {
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

const VALID_SOURCES: UpcomingShowSource[] = ["whatnot"];
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

function mapUpcomingShowData(showId: string, data: UpcomingShowDocumentData): UpcomingShow {
  const createdAt = mapFirestoreTimestamp(data.createdAt);
  const updatedAt = mapFirestoreTimestamp(data.updatedAt);

  if (
    !isUpcomingShowSource(data.source) ||
    typeof data.whatnotShowId !== "string" ||
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

  return {
    id: showId,
    source: data.source,
    whatnotShowId: data.whatnotShowId,
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
    createdBy: typeof data.createdBy === "string" ? data.createdBy : undefined,
    updatedBy: typeof data.updatedBy === "string" ? data.updatedBy : undefined,
    createdAt,
    updatedAt,
  };
}

function mapShowAllocationData(allocationId: string, data: ShowAllocationDocumentData): ShowAllocation {
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

    const snapshot = await getDocs(firestoreCollectionService.getUpcomingShowsCollection());
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
   * Creates a new local show record, or updates the existing one matched by
   * `source + whatnotShowId` so schedule changes never create duplicate records.
   * Local-only fields (status, syncStatus, notes, isArchived, productionStatus, capacity) on an
   * existing match are preserved untouched; only upstream-sourced fields are overwritten.
   */
  async upsertUpcomingShow(caller: User, input: CreateUpcomingShowInput): Promise<UpcomingShow> {
    if (!permissionService.canManageUpcomingShows(caller)) {
      throw new Error("You do not have permission to manage upcoming shows.");
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
      await updateDoc(doc(firestoreCollectionService.getUpcomingShowsCollection(), existingShow.id), updatePayload);

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
    await setDoc(showRef, createPayload);

    return this.getUpcomingShowById(caller, showRef.id);
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
    await updateDoc(showRef, payload);

    return this.getUpcomingShowById(caller, upcomingShowId);
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
    await updateDoc(showRef, payload);

    return this.getUpcomingShowById(caller, upcomingShowId);
  },

  async deleteUpcomingShow(caller: User, upcomingShowId: string): Promise<void> {
    if (!permissionService.canManageUpcomingShows(caller)) {
      throw new Error("You do not have permission to manage upcoming shows.");
    }

    await deleteDoc(doc(firestoreCollectionService.getUpcomingShowsCollection(), upcomingShowId));
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

    const snapshot = await getDocs(firestoreCollectionService.getShowAllocationsCollection());

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

    const requestItem = requestItems.find((item) => item.id === input.printRequestItemId);

    if (!requestItem) {
      throw new Error("Print request item not found.");
    }

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
        printWidthInches: requestItem.printWidthInches,
        printHeightInches: requestItem.printHeightInches,
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
    await setDoc(allocationRef, payload);

    await updateDoc(doc(firestoreCollectionService.getUpcomingShowsCollection(), upcomingShowId), {
      allocatedQuantity: show.allocatedQuantity + requestedQuantity,
      updatedBy: caller.id,
      updatedAt: serverTimestamp(),
    });

    if (printRequest.status === "draft" || printRequest.status === "editing") {
      await printRequestService.updatePrintRequest(caller, printRequest.id, { status: "active" });
    }

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
    await updateDoc(allocationRef, payload);

    const updatedSnapshot = await getDoc(allocationRef);
    const updatedAllocation = mapShowAllocationData(updatedSnapshot.id, updatedSnapshot.data() as ShowAllocationDocumentData);

    if (isPrintedAllocationStatus(status)) {
      await this.markPrintRequestCompletedIfFullyPrinted(caller, updatedAllocation.printRequestId);
    }

    return updatedAllocation;
  },

  async startShowPrinting(caller: User, upcomingShowId: string): Promise<UpcomingShow> {
    if (!permissionService.canManageUpcomingShows(caller)) {
      throw new Error("You do not have permission to manage show printing.");
    }

    const [show, allocations] = await Promise.all([
      this.getUpcomingShowById(caller, upcomingShowId),
      this.listShowAllocations(caller, upcomingShowId),
    ]);

    if (!STARTABLE_SHOW_PRODUCTION_STATUSES.includes(show.productionStatus)) {
      throw new Error("This show is not ready to start printing.");
    }

    if (!canStartShowPrinting(show, new Date())) {
      throw new Error(PAST_SHOW_READ_ONLY_MESSAGE);
    }

    const allocationsToStart = allocations.filter(
      (allocation) =>
        allocation.status !== "canceled" && STARTABLE_ALLOCATION_STATUSES.includes(allocation.status),
    );

    if (allocationsToStart.length === 0) {
      throw new Error("Add print requests to this show before starting printing.");
    }

    const batch = writeBatch(db);
    const showRef = doc(firestoreCollectionService.getUpcomingShowsCollection(), upcomingShowId);

    batch.update(showRef, {
      productionStatus: "printing",
      activePrintStartedAt: serverTimestamp(),
      printStartedAt: show.printStartedAt ?? serverTimestamp(),
      printPausedAt: deleteField(),
      updatedBy: caller.id,
      updatedAt: serverTimestamp(),
    });

    for (const allocation of allocationsToStart) {
      batch.update(doc(firestoreCollectionService.getShowAllocationsCollection(), allocation.id), {
        status: "in_progress",
        updatedBy: caller.id,
        updatedAt: serverTimestamp(),
      });
    }

    await batch.commit();
    return this.getUpcomingShowById(caller, upcomingShowId);
  },

  async pauseShowPrinting(caller: User, upcomingShowId: string): Promise<UpcomingShow> {
    if (!permissionService.canManageUpcomingShows(caller)) {
      throw new Error("You do not have permission to manage show printing.");
    }

    const show = await this.getUpcomingShowById(caller, upcomingShowId);

    if (show.productionStatus !== "printing" || show.activePrintStartedAt === undefined) {
      throw new Error("Printing is not running on this show.");
    }

    const foldedMs = computeElapsedPrintMs({
      accumulatedPrintMs: show.accumulatedPrintMs,
      activePrintStartedAtMs: show.activePrintStartedAt.toMillis(),
      nowMs: Date.now(),
    });

    await updateDoc(doc(firestoreCollectionService.getUpcomingShowsCollection(), upcomingShowId), {
      accumulatedPrintMs: foldedMs,
      activePrintStartedAt: deleteField(),
      printPausedAt: serverTimestamp(),
      updatedBy: caller.id,
      updatedAt: serverTimestamp(),
    });

    return this.getUpcomingShowById(caller, upcomingShowId);
  },

  async resumeShowPrinting(caller: User, upcomingShowId: string): Promise<UpcomingShow> {
    if (!permissionService.canManageUpcomingShows(caller)) {
      throw new Error("You do not have permission to manage show printing.");
    }

    const show = await this.getUpcomingShowById(caller, upcomingShowId);

    if (show.productionStatus !== "printing" || show.printPausedAt === undefined || show.activePrintStartedAt !== undefined) {
      throw new Error("Printing is not paused on this show.");
    }

    await updateDoc(doc(firestoreCollectionService.getUpcomingShowsCollection(), upcomingShowId), {
      activePrintStartedAt: serverTimestamp(),
      printPausedAt: deleteField(),
      updatedBy: caller.id,
      updatedAt: serverTimestamp(),
    });

    return this.getUpcomingShowById(caller, upcomingShowId);
  },

  async markShowPrintingFinished(caller: User, upcomingShowId: string): Promise<UpcomingShow> {
    if (!permissionService.canManageUpcomingShows(caller)) {
      throw new Error("You do not have permission to manage show printing.");
    }

    const [show, allocations] = await Promise.all([
      this.getUpcomingShowById(caller, upcomingShowId),
      this.listShowAllocations(caller, upcomingShowId),
    ]);

    if (show.productionStatus !== "printing") {
      throw new Error("Start printing on this show before marking it finished.");
    }

    const allocationsToFinish = allocations.filter(
      (allocation) =>
        allocation.status !== "canceled" && FINISHABLE_ALLOCATION_STATUSES.includes(allocation.status),
    );

    if (allocationsToFinish.length === 0) {
      throw new Error("There are no active allocations to finish on this show.");
    }

    const foldedMs = computeElapsedPrintMs({
      accumulatedPrintMs: show.accumulatedPrintMs,
      activePrintStartedAtMs: show.activePrintStartedAt?.toMillis(),
      nowMs: Date.now(),
    });

    const batch = writeBatch(db);
    const showRef = doc(firestoreCollectionService.getUpcomingShowsCollection(), upcomingShowId);

    batch.update(showRef, {
      productionStatus: "completed",
      accumulatedPrintMs: foldedMs,
      activePrintStartedAt: deleteField(),
      printPausedAt: deleteField(),
      printFinishedAt: serverTimestamp(),
      printFinishedBy: caller.id,
      updatedBy: caller.id,
      updatedAt: serverTimestamp(),
    });

    const affectedPrintRequestIds = new Set<string>();

    for (const allocation of allocationsToFinish) {
      affectedPrintRequestIds.add(allocation.printRequestId);
      batch.update(doc(firestoreCollectionService.getShowAllocationsCollection(), allocation.id), {
        status: "done",
        completedAt: serverTimestamp(),
        completedBy: caller.id,
        updatedBy: caller.id,
        updatedAt: serverTimestamp(),
      });
    }

    await batch.commit();

    await Promise.all(
      [...affectedPrintRequestIds].map((printRequestId) =>
        this.markPrintRequestCompletedIfFullyPrinted(caller, printRequestId),
      ),
    );

    return this.getUpcomingShowById(caller, upcomingShowId);
  },

  /**
   * Transitions a Print Request to `completed` once every unit of its total requested quantity
   * has been allocated and printed across all its show allocations. Only ever moves the request
   * forward to `completed`; never touches `designs.status` or reverses a manual `archived` state.
   */
  async markPrintRequestCompletedIfFullyPrinted(caller: User, printRequestId: string): Promise<void> {
    const [printRequest, requestItems, allocations] = await Promise.all([
      printRequestService.getPrintRequestById(caller, printRequestId),
      printRequestService.listPrintRequestItems(caller, printRequestId),
      this.listShowAllocationsForPrintRequest(caller, printRequestId),
    ]);

    if (printRequest.status === "completed" || printRequest.status === "archived") {
      return;
    }

    const totalRequestedQuantity = requestItems.reduce((sum, item) => sum + item.quantity, 0);
    const activeAllocations = allocations.filter((allocation) => allocation.status !== "canceled");
    const totalPrintedQuantity = activeAllocations
      .filter((allocation) => isPrintedAllocationStatus(allocation.status))
      .reduce((sum, allocation) => sum + allocation.allocatedQuantity, 0);

    if (totalRequestedQuantity > 0 && totalPrintedQuantity >= totalRequestedQuantity) {
      await printRequestService.updatePrintRequest(caller, printRequestId, { status: "completed" });
    }
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

    await deleteDoc(allocationRef);
    await this.recalculateShowAllocatedQuantity(caller, allocation.upcomingShowId);
    await this.markPrintRequestEditingIfNoActiveAllocations(caller, allocation.printRequestId);
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
        deleteDoc(doc(firestoreCollectionService.getShowAllocationsCollection(), allocation.id)),
      ),
    );

    await this.recalculateShowAllocatedQuantity(caller, upcomingShowId);
    await this.markPrintRequestEditingIfNoActiveAllocations(caller, printRequestId);
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

    await updateDoc(doc(firestoreCollectionService.getUpcomingShowsCollection(), upcomingShowId), {
      allocatedQuantity: recalculatedTotal,
      updatedBy: caller.id,
      updatedAt: serverTimestamp(),
    });
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
