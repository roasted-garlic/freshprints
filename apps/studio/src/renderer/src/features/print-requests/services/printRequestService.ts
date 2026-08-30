import {
  deleteDoc,
  deleteField,
  doc,
  getCountFromServer,
  getDoc,
  getDocFromServer,
  getDocs,
  getDocsFromServer,
  increment,
  limit,
  orderBy,
  query,
  runTransaction,
  startAfter,
  Timestamp,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
  writeBatch,
  type DocumentData,
  type QueryConstraint,
  type Transaction,
} from "firebase/firestore";

import {
  runTracedWrite,
  traceFirestoreOneShotComplete,
  traceFirestoreOneShotStart,
} from "@fresh-prints/shared/utils/firestoreUsageTrace";

import { mapFirestoreTimestamp, resolveDesignDocumentTimestamps } from "../../firebase/utils/firestoreTimestamp";
import { assertNoUndefinedFirestoreFields, withoutUndefinedFields } from "../../firebase/utils/firestoreDocument";
import { db } from "../../../config/firebase";
import { firestoreCollectionService } from "../../firebase/services/firestoreCollectionService";
import { permissionService } from "../../permissions/services/permissionService";
import type { User } from "../../users/types/user.types";
import { designService } from "../../designs/services/designService";
import type { Customer } from "@fresh-prints/shared/types/customer/customer.types";
import type { PrintRequestItemStatus } from "@fresh-prints/shared/types/printRequest/printRequest.enums";
import type {
  PrintRequest,
  PrintRequestItem,
  PrintRequestOrigin,
} from "@fresh-prints/shared/types/printRequest/printRequest.types";
import type { PrintRequestListTab } from "@fresh-prints/shared/utils/printRequestListGrouping";
import {
  hasNeedsStaffRequeueMarker,
} from "@fresh-prints/shared/utils/printRequestStaffRequeue";
import { readCustomerIdentityDocumentFields } from "@fresh-prints/shared/utils/readCustomerIdentityDocumentFields";
import { requireValidCustomerUsername } from "@fresh-prints/shared/utils/customerUsername";
import { isPrintRequestOrigin } from "@fresh-prints/shared/utils/printRequestOrigin";
import { isPortalContinuablePrintRequestStatus } from "@fresh-prints/shared/utils/portalPrintRequestListTabs";
import {
  formatCustomerPrintRequestName,
  formatInternalPrintRequestName,
  requireValidInternalBaseName,
} from "@fresh-prints/shared/utils/printRequestNaming";
import {
  assessPrintRequestItemSize,
  formatPrintRequestItemSizeLabel,
  requireSavablePrintRequestItemSize,
  resolveInitialPrintRequestItemSize,
} from "@fresh-prints/shared/utils/printRequestItemSizing";
import {
  buildCustomerListQueryPlan,
  buildPrintRequestItemSummaries,
  buildPrintRequestItemsQueryPlan,
  buildPrintRequestListQueryPlan,
  PRINT_REQUEST_LIST_PAGE_SIZE,
  sortPrintRequestItemsForDisplay,
  type CustomerListQueryOptions,
  type PrintRequestItemListQueryOptions,
  type PrintRequestItemSummary,
  type PrintRequestListCursor,
  type PrintRequestListQueryOptions,
  type PrintRequestQueryPlan,
} from "../utils/printRequestQueryPlanning";
import { buildPrintRequestAllocationTotalsByRequestId } from "@fresh-prints/shared/utils/showAllocationTotals";
import type { ShowAllocation } from "@fresh-prints/shared/types/showAllocation/showAllocation.types";
import {
  mapShowAllocationData,
  type ShowAllocationDocumentData,
} from "../../upcoming-shows/services/upcomingShowService";
import { ShowCompletionReconciliationRemediationError } from "../../upcoming-shows/utils/showCompletionReconciliation";
import { diagnosePrintRequestForCompletion } from "../utils/printRequestCompletionDiagnostics";
import { buildPrintRequestCompletionPayload } from "../utils/printRequestCompletionPayload";
import { planPrintRequestDesignSelectionWrites } from "../utils/planPrintRequestDesignSelectionWrites";
import { callTracedFunction } from "../../../config/tracedCallable";

export type ShowReconciliationReadSource = "default" | "server";

export type {
  PrintRequestItemSummary,
  PrintRequestListCursor,
} from "../utils/printRequestQueryPlanning";
export { PRINT_REQUEST_LIST_PAGE_SIZE } from "../utils/printRequestQueryPlanning";

export interface PrintRequestListPage {
  requests: PrintRequest[];
  hasMore: boolean;
  nextCursor?: PrintRequestListCursor;
}

export interface CreatePrintRequestInput {
  name?: string;
  customerId?: string;
  isInternal?: boolean;
  internalBaseName?: string;
  notes?: string;
}

export interface UpdatePrintRequestInput {
  name?: string;
  customerId?: string;
  isInternal?: boolean;
  internalBaseName?: string;
  status?: PrintRequest["status"];
  notes?: string;
}

export interface UpdatePrintRequestDetailInput {
  internalBaseName?: string;
  notes?: string;
}

export interface CreatePrintRequestItemInput {
  designId?: string;
  customerUploadId?: string;
  sourceType?: "catalog_design" | "customer_upload";
  titleSnapshot?: string;
  quantity: number;
  printWidthInches?: number;
  printHeightInches?: number;
  standardSizePresetKey?: string;
  sortOrder?: number;
  notes?: string;
}

export interface UpdatePrintRequestItemInput {
  quantity?: number;
  printWidthInches?: number;
  printHeightInches?: number;
  standardSizePresetKey?: string | null;
  notes?: string;
  status?: PrintRequestItemStatus;
}

export interface PrintRequestDesignSelectionInput {
  designId: string;
  quantity: number;
  existingItemId?: string;
}

export interface PrintRequestWithItems {
  printRequest: PrintRequest;
  items: PrintRequestItem[];
}

interface PrintRequestDocumentData extends DocumentData {
  id?: unknown;
  name?: unknown;
  customerId?: unknown;
  isInternal?: unknown;
  requestOrigin?: unknown;
  status?: unknown;
  itemCount?: unknown;
  queueTab?: unknown;
  requestSequenceNumber?: unknown;
  customerUsernameSnapshot?: unknown;
  customerDisplayNameSnapshot?: unknown;
  internalBaseName?: unknown;
  nameFormatVersion?: unknown;
  notes?: unknown;
  closureKind?: unknown;
  convertedToInternalRequestId?: unknown;
  convertedFromCustomerRequestId?: unknown;
  convertedAt?: unknown;
  convertedBy?: unknown;
  needsStaffRequeueAt?: unknown;
  needsStaffRequeueSourceShowId?: unknown;
  needsStaffRequeueSourceShowTitleSnapshot?: unknown;
  needsStaffRequeueReleasedQuantity?: unknown;
  createdBy?: unknown;
  updatedBy?: unknown;
  createdAt?: unknown;
  updatedAt?: unknown;
}

interface PrintRequestItemDocumentData extends DocumentData {
  id?: unknown;
  printRequestId?: unknown;
  designId?: unknown;
  sourceType?: unknown;
  customerUploadId?: unknown;
  titleSnapshot?: unknown;
  quantity?: unknown;
  printWidthInches?: unknown;
  printHeightInches?: unknown;
  sizeLabel?: unknown;
  standardSizePresetKey?: unknown;
  sortOrder?: unknown;
  notes?: unknown;
  status?: unknown;
  addedBy?: unknown;
  printedAt?: unknown;
  printedBy?: unknown;
  completedAt?: unknown;
  createdAt?: unknown;
  updatedAt?: unknown;
}

interface CustomerDocumentData extends DocumentData {
  id?: unknown;
  userId?: unknown;
  displayName?: unknown;
  username?: unknown;
  email?: unknown;
  notes?: unknown;
  isGuest?: unknown;
  totalPrintRequests?: unknown;
  nextPrintRequestSequence?: unknown;
  totalRequests?: unknown;
  totalApprovedRequests?: unknown;
  usernameUpdatedAt?: unknown;
  createdAt?: unknown;
  updatedAt?: unknown;
}

const INTERNAL_PRINT_REQUEST_COUNTER_ID = "printRequests";

function resolveRequiredTimestamp(value: unknown): Timestamp | undefined {
  return mapFirestoreTimestamp(value);
}

function isPrintRequestListTab(value: unknown): value is PrintRequestListTab {
  return value === "working" || value === "queued" || value === "printing" || value === "printed";
}

function mapPrintRequestData(printRequestId: string, data: PrintRequestDocumentData): PrintRequest {
  const createdAt = resolveRequiredTimestamp(data.createdAt);
  const updatedAt = resolveRequiredTimestamp(data.updatedAt);

  if (
    typeof data.name !== "string" ||
    typeof data.status !== "string" ||
    typeof data.itemCount !== "number" ||
    typeof data.createdBy !== "string" ||
    typeof data.updatedBy !== "string" ||
    createdAt === undefined ||
    updatedAt === undefined
  ) {
    throw new Error("A print request record is incomplete.");
  }

  return {
    id: printRequestId,
    name: data.name,
    customerId: typeof data.customerId === "string" ? data.customerId : undefined,
    isInternal: data.isInternal === true,
    requestOrigin: isPrintRequestOrigin(data.requestOrigin) ? data.requestOrigin : undefined,
    status: data.status as PrintRequest["status"],
    itemCount: data.itemCount,
    queueTab: isPrintRequestListTab(data.queueTab) ? data.queueTab : undefined,
    requestSequenceNumber:
      typeof data.requestSequenceNumber === "number" ? data.requestSequenceNumber : undefined,
    customerUsernameSnapshot:
      typeof data.customerUsernameSnapshot === "string" ? data.customerUsernameSnapshot : undefined,
    customerDisplayNameSnapshot:
      typeof data.customerDisplayNameSnapshot === "string" ? data.customerDisplayNameSnapshot : undefined,
    internalBaseName: typeof data.internalBaseName === "string" ? data.internalBaseName : undefined,
    nameFormatVersion:
      data.nameFormatVersion === "legacy-v1" || data.nameFormatVersion === "cr-ir-v1"
        ? data.nameFormatVersion
        : undefined,
    notes: typeof data.notes === "string" ? data.notes : undefined,
    closureKind: data.closureKind === "converted_to_internal" ? data.closureKind : undefined,
    convertedToInternalRequestId:
      typeof data.convertedToInternalRequestId === "string"
        ? data.convertedToInternalRequestId
        : undefined,
    convertedFromCustomerRequestId:
      typeof data.convertedFromCustomerRequestId === "string"
        ? data.convertedFromCustomerRequestId
        : undefined,
    needsStaffRequeueAt: mapFirestoreTimestamp(data.needsStaffRequeueAt),
    needsStaffRequeueSourceShowId:
      typeof data.needsStaffRequeueSourceShowId === "string"
        ? data.needsStaffRequeueSourceShowId
        : undefined,
    needsStaffRequeueSourceShowTitleSnapshot:
      typeof data.needsStaffRequeueSourceShowTitleSnapshot === "string"
        ? data.needsStaffRequeueSourceShowTitleSnapshot
        : undefined,
    needsStaffRequeueReleasedQuantity:
      typeof data.needsStaffRequeueReleasedQuantity === "number"
        ? data.needsStaffRequeueReleasedQuantity
        : undefined,
    createdBy: data.createdBy,
    updatedBy: data.updatedBy,
    createdAt,
    updatedAt,
  };
}

function mapPrintRequestItemData(
  itemId: string,
  data: PrintRequestItemDocumentData,
): PrintRequestItem {
  const timestamps = resolveDesignDocumentTimestamps(data);

  if (
    typeof data.printRequestId !== "string" ||
    typeof data.quantity !== "number" ||
    typeof data.status !== "string" ||
    typeof data.addedBy !== "string" ||
    timestamps === null
  ) {
    throw new Error("A print request item record is incomplete.");
  }

  const sourceType =
    data.sourceType === "customer_upload" || data.sourceType === "catalog_design"
      ? data.sourceType
      : undefined;
  const customerUploadId =
    typeof data.customerUploadId === "string" && data.customerUploadId.trim()
      ? data.customerUploadId.trim()
      : undefined;
  const isUploadItem = sourceType === "customer_upload" || Boolean(customerUploadId);
  const designId =
    typeof data.designId === "string" && data.designId.trim() ? data.designId.trim() : undefined;

  if (isUploadItem) {
    if (!customerUploadId) {
      throw new Error("A print request item record is incomplete.");
    }
  } else if (!designId) {
    throw new Error("A print request item record is incomplete.");
  }

  return {
    id: itemId,
    printRequestId: data.printRequestId,
    ...(designId ? { designId } : {}),
    ...(sourceType
      ? { sourceType }
      : isUploadItem
        ? { sourceType: "customer_upload" as const }
        : {}),
    ...(customerUploadId ? { customerUploadId } : {}),
    ...(typeof data.titleSnapshot === "string" && data.titleSnapshot.trim()
      ? { titleSnapshot: data.titleSnapshot.trim() }
      : {}),
    quantity: data.quantity,
    printWidthInches: typeof data.printWidthInches === "number" ? data.printWidthInches : undefined,
    printHeightInches: typeof data.printHeightInches === "number" ? data.printHeightInches : undefined,
    sizeLabel: typeof data.sizeLabel === "string" ? data.sizeLabel : undefined,
    standardSizePresetKey:
      typeof data.standardSizePresetKey === "string" && data.standardSizePresetKey.trim()
        ? data.standardSizePresetKey.trim()
        : undefined,
    sortOrder: typeof data.sortOrder === "number" ? data.sortOrder : undefined,
    notes: typeof data.notes === "string" ? data.notes : undefined,
    status: data.status as PrintRequestItemStatus,
    addedBy: data.addedBy,
    printedAt: mapFirestoreTimestamp(data.printedAt),
    printedBy: typeof data.printedBy === "string" ? data.printedBy : undefined,
    completedAt: mapFirestoreTimestamp(data.completedAt),
    createdAt: timestamps.createdAt,
    updatedAt: timestamps.updatedAt,
  };
}

function mapCustomerData(customerId: string, data: CustomerDocumentData): Customer {
  const createdAt = resolveRequiredTimestamp(data.createdAt);
  const updatedAt = resolveRequiredTimestamp(data.updatedAt);

  if (
    typeof data.displayName !== "string" ||
    typeof data.isGuest !== "boolean" ||
    typeof data.totalPrintRequests !== "number" ||
    createdAt === undefined ||
    updatedAt === undefined
  ) {
    throw new Error("A customer is incomplete.");
  }

  const identityFields = readCustomerIdentityDocumentFields(data);
  const { deletedAt: deletedAtRaw, disabledAt: disabledAtRaw, ...identityRest } = identityFields;

  return {
    id: customerId,
    userId: typeof data.userId === "string" ? data.userId : undefined,
    displayName: data.displayName,
    username: typeof data.username === "string" ? data.username : undefined,
    email: typeof data.email === "string" ? data.email : undefined,
    notes: typeof data.notes === "string" ? data.notes : undefined,
    isGuest: data.isGuest,
    totalPrintRequests: data.totalPrintRequests,
    nextPrintRequestSequence:
      typeof data.nextPrintRequestSequence === "number" ? data.nextPrintRequestSequence : undefined,
    totalRequests: typeof data.totalRequests === "number" ? data.totalRequests : undefined,
    totalApprovedRequests:
      typeof data.totalApprovedRequests === "number" ? data.totalApprovedRequests : undefined,
    usernameUpdatedAt: resolveRequiredTimestamp(data.usernameUpdatedAt),
    ...identityRest,
    deletedAt: resolveRequiredTimestamp(deletedAtRaw),
    disabledAt: resolveRequiredTimestamp(disabledAtRaw),
    createdAt,
    updatedAt,
  };
}

function resolveNextSequence(value: unknown): number {
  return typeof value === "number" && Number.isInteger(value) && value >= 1 ? value : 1;
}

function hasUsableSequence(value: unknown): value is number {
  return typeof value === "number" && Number.isInteger(value) && value >= 1;
}

function resolveNextSortOrder(items: PrintRequestItem[]): number {
  const sortOrders = items
    .map((item) => item.sortOrder)
    .filter((value): value is number => typeof value === "number" && Number.isFinite(value));

  if (sortOrders.length === 0) {
    return items.length;
  }

  return Math.max(...sortOrders) + 1;
}

function buildPrintRequestPayload(
  input: CreatePrintRequestInput & {
    name: string;
    requestSequenceNumber: number;
    customerUsernameSnapshot?: string;
    customerDisplayNameSnapshot?: string;
    internalBaseName?: string;
    nameFormatVersion?: PrintRequest["nameFormatVersion"];
    requestOrigin?: PrintRequestOrigin;
  },
  callerId: string,
) {
  const isInternal = input.isInternal ?? false;

  if (!isInternal && !input.customerId) {
    throw new Error("A print request needs a customer or internal flag.");
  }

  return withoutUndefinedFields({
    name: input.name.trim(),
    customerId: input.customerId,
    isInternal,
    status: "draft" as const,
    itemCount: 0,
    // New carts belong on Working until items/allocations move them; list queries filter by
    // queueTab, so omitting this makes fresh requests vanish after remount.
    queueTab: "working" as const,
    requestSequenceNumber: input.requestSequenceNumber,
    requestOrigin: input.requestOrigin ?? (isInternal ? "studio_internal" : "studio_customer"),
    customerUsernameSnapshot: input.customerUsernameSnapshot,
    customerDisplayNameSnapshot: input.customerDisplayNameSnapshot,
    internalBaseName: input.internalBaseName,
    nameFormatVersion: input.nameFormatVersion,
    notes: input.notes?.trim() || undefined,
    createdBy: callerId,
    updatedBy: callerId,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
}

function resolveDesignPixelDimensions(design: Awaited<ReturnType<typeof designService.getDesignById>>) {
  if (typeof design.width !== "number" || typeof design.height !== "number") {
    throw new Error("Design pixel dimensions are required to validate requested size.");
  }

  return { pixelWidth: design.width, pixelHeight: design.height };
}

function resolveDefaultRequestedSize(design: Awaited<ReturnType<typeof designService.getDesignById>>) {
  const { pixelWidth, pixelHeight } = resolveDesignPixelDimensions(design);

  return resolveInitialPrintRequestItemSize({
    pixelWidth,
    pixelHeight,
    defaultPrintWidthInches: design.printWidthInches,
  });
}

function resolveRequestedItemSize(
  design: Awaited<ReturnType<typeof designService.getDesignById>>,
  input: { printWidthInches?: number; printHeightInches?: number },
  current?: Pick<PrintRequestItem, "printWidthInches" | "printHeightInches">,
) {
  const fallbackSize = current?.printWidthInches && current.printHeightInches
    ? {
        printWidthInches: current.printWidthInches,
        printHeightInches: current.printHeightInches,
      }
    : resolveDefaultRequestedSize(design);
  const printWidthInches = input.printWidthInches ?? fallbackSize.printWidthInches;
  const printHeightInches = input.printHeightInches ?? fallbackSize.printHeightInches;
  const { pixelWidth, pixelHeight } = resolveDesignPixelDimensions(design);
  const assessment = assessPrintRequestItemSize({
    pixelWidth,
    pixelHeight,
    printWidthInches,
    printHeightInches,
  });

  if (!assessment.canSave) {
    throw new Error(assessment.errorMessage ?? "Requested print size is not valid.");
  }

  return {
    printWidthInches,
    printHeightInches,
    sizeLabel: formatPrintRequestItemSizeLabel(printWidthInches, printHeightInches),
  };
}

export async function assertPersistedPrintRequestItemSize(
  caller: User,
  item: PrintRequestItem,
): Promise<{ printWidthInches: number; printHeightInches: number }> {
  const printWidthInches = item.printWidthInches;
  const printHeightInches = item.printHeightInches;
  if (
    typeof printWidthInches !== "number" ||
    typeof printHeightInches !== "number" ||
    !Number.isFinite(printWidthInches) ||
    !Number.isFinite(printHeightInches) ||
    printWidthInches <= 0 ||
    printHeightInches <= 0
  ) {
    throw new Error("This print request item is missing a requested print size.");
  }

  let pixelWidth: number;
  let pixelHeight: number;

  if (item.sourceType === "customer_upload" || item.customerUploadId) {
    if (!item.customerUploadId) {
      throw new Error("Design pixel dimensions are required to validate requested size.");
    }
    const { customerUploadReadService } = await import(
      "../../customer-uploads/services/customerUploadReadService"
    );
    const upload = await customerUploadReadService.getUploadById(caller, item.customerUploadId);
    if (
      typeof upload?.widthPx !== "number" ||
      typeof upload.heightPx !== "number" ||
      upload.widthPx <= 0 ||
      upload.heightPx <= 0
    ) {
      throw new Error("Design pixel dimensions are required to validate requested size.");
    }
    pixelWidth = upload.widthPx;
    pixelHeight = upload.heightPx;
  } else {
    if (!item.designId) {
      throw new Error("Design pixel dimensions are required to validate requested size.");
    }
    const design = await designService.getDesignById(caller, item.designId);
    const pixels = resolveDesignPixelDimensions(design);
    pixelWidth = pixels.pixelWidth;
    pixelHeight = pixels.pixelHeight;
  }

  requireSavablePrintRequestItemSize({
    pixelWidth,
    pixelHeight,
    printWidthInches,
    printHeightInches,
  });

  return { printWidthInches, printHeightInches };
}

async function loadPrintableDesign(caller: User, designId: string) {
  const design = await designService.getDesignById(caller, designId);

  if (design.status !== "ready") {
    throw new Error("Only approved catalog designs can be added to a print request.");
  }

  return design;
}

function buildFirestoreQueryConstraints(plan: PrintRequestQueryPlan): QueryConstraint[] {
  const constraints: QueryConstraint[] = [
    ...plan.filters.map((filter) => where(filter.field, filter.operator, filter.value)),
    ...plan.orderBy.map((order) => orderBy(order.field, order.direction)),
  ];

  if (plan.cursor) {
    constraints.push(
      startAfter(Timestamp.fromMillis(plan.cursor.updatedAtMillis), plan.cursor.requestId),
    );
  }

  if (typeof plan.limitCount === "number" && Number.isFinite(plan.limitCount)) {
    constraints.push(limit(plan.limitCount));
  }

  return constraints;
}

function getInternalPrintRequestCounterRef() {
  return doc(firestoreCollectionService.getCountersCollection(), INTERNAL_PRINT_REQUEST_COUNTER_ID);
}

function buildContinuableCustomerPrintRequestsQuery(customerId: string) {
  return query(
    firestoreCollectionService.getPrintRequestsCollection(),
    where("customerId", "==", customerId),
    where("status", "in", ["draft", "editing"]),
    limit(1),
  );
}

async function assertCustomerHasNoContinuablePrintRequest(customerId: string): Promise<void> {
  const snapshot = await getDocs(buildContinuableCustomerPrintRequestsQuery(customerId));
  if (!snapshot.empty) {
    throw new Error(
      "This customer already has an open print request. Finish or release that request before creating another.",
    );
  }
}

async function createInternalPrintRequestInTransaction(
  transaction: Transaction,
  callerId: string,
  input: Pick<CreatePrintRequestInput, "internalBaseName" | "notes"> = {},
) {
  const counterRef = getInternalPrintRequestCounterRef();
  const requestRef = doc(firestoreCollectionService.getPrintRequestsCollection());
  const counterSnapshot = await transaction.get(counterRef);
  const sequence = resolveNextSequence(counterSnapshot.data()?.nextInternalRequestSequence);
  const internalBaseName = requireValidInternalBaseName(input.internalBaseName ?? "internal");
  const payload = buildPrintRequestPayload(
    {
      name: formatInternalPrintRequestName(internalBaseName, sequence),
      isInternal: true,
      requestOrigin: "studio_internal",
      internalBaseName,
      nameFormatVersion: "cr-ir-v1",
      requestSequenceNumber: sequence,
      notes: input.notes,
    },
    callerId,
  );
  const counterPayload = withoutUndefinedFields({
    nextInternalRequestSequence: sequence + 1,
    createdAt: counterSnapshot.exists() ? undefined : serverTimestamp(),
    updatedAt: serverTimestamp(),
  });

  assertNoUndefinedFirestoreFields(payload, "Internal print request payload");
  transaction.set(requestRef, payload);
  transaction.set(counterRef, counterPayload, { merge: true });

  return requestRef;
}

async function createCustomerPrintRequestInTransaction(
  transaction: Transaction,
  callerId: string,
  input: { customerId: string; notes?: string },
) {
  const customerRef = doc(firestoreCollectionService.getCustomersCollection(), input.customerId);
  const requestRef = doc(firestoreCollectionService.getPrintRequestsCollection());
  const customerSnapshot = await transaction.get(customerRef);

  if (!customerSnapshot.exists()) {
    throw new Error("Customer not found.");
  }

  const customer = mapCustomerData(customerSnapshot.id, customerSnapshot.data() as CustomerDocumentData);
  const username = requireValidCustomerUsername(customer.username ?? "");

  const sequence = resolveNextSequence(customer.nextPrintRequestSequence);
  const payload = buildPrintRequestPayload(
    {
      name: formatCustomerPrintRequestName(username, sequence),
      customerId: customer.id,
      isInternal: false,
      requestOrigin: "studio_customer",
      requestSequenceNumber: sequence,
      customerUsernameSnapshot: username,
      customerDisplayNameSnapshot: customer.displayName,
      nameFormatVersion: "cr-ir-v1",
      notes: input.notes,
    },
    callerId,
  );

  assertNoUndefinedFirestoreFields(payload, "Customer print request payload");
  transaction.set(requestRef, payload);
  transaction.update(customerRef, {
    nextPrintRequestSequence: sequence + 1,
    totalPrintRequests: customer.totalPrintRequests + 1,
    updatedAt: serverTimestamp(),
  });

  return requestRef;
}

function buildDuplicatedPrintRequestItemPayload(
  callerId: string,
  newPrintRequestId: string,
  itemRefId: string,
  sourceItem: PrintRequestItem,
) {
  const isUploadItem =
    sourceItem.sourceType === "customer_upload" || Boolean(sourceItem.customerUploadId);

  return withoutUndefinedFields({
    id: itemRefId,
    printRequestId: newPrintRequestId,
    ...(isUploadItem
      ? {
          sourceType: "customer_upload" as const,
          customerUploadId: sourceItem.customerUploadId,
          titleSnapshot: sourceItem.titleSnapshot,
        }
      : { designId: sourceItem.designId }),
    quantity: sourceItem.quantity,
    printWidthInches: sourceItem.printWidthInches,
    printHeightInches: sourceItem.printHeightInches,
    sizeLabel: sourceItem.sizeLabel,
    sortOrder: sourceItem.sortOrder,
    notes: sourceItem.notes,
    status: "pending" as const,
    addedBy: callerId,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
}

async function duplicatePrintRequestForShowTransferCopyInTransaction(
  transaction: Transaction,
  callerId: string,
  source: PrintRequest,
  itemCount: number,
): Promise<{
  requestRef: ReturnType<typeof doc>;
  name: string;
  requestOrigin?: PrintRequestOrigin;
  customerId?: string;
}> {
  const requestRef = doc(firestoreCollectionService.getPrintRequestsCollection());
  let name = "";
  let requestOrigin = source.requestOrigin;
  let customerId = source.customerId;
  let sequence = 0;

  if (source.isInternal) {
    const counterRef = getInternalPrintRequestCounterRef();
    const counterSnapshot = await transaction.get(counterRef);
    sequence = resolveNextSequence(counterSnapshot.data()?.nextInternalRequestSequence);
    const internalBaseName = requireValidInternalBaseName(source.internalBaseName ?? "internal");
    name = formatInternalPrintRequestName(internalBaseName, sequence);
    requestOrigin = source.requestOrigin ?? "studio_internal";

    const payload = withoutUndefinedFields({
      ...buildPrintRequestPayload(
        {
          name,
          isInternal: true,
          requestOrigin,
          internalBaseName,
          nameFormatVersion: source.nameFormatVersion ?? "cr-ir-v1",
          requestSequenceNumber: sequence,
          notes: source.notes,
        },
        callerId,
      ),
      status: "active" as const,
      itemCount,
    });

    assertNoUndefinedFirestoreFields(payload, "Copied internal print request payload");
    transaction.set(requestRef, payload);
    transaction.set(
      counterRef,
      withoutUndefinedFields({
        nextInternalRequestSequence: sequence + 1,
        createdAt: counterSnapshot.exists() ? undefined : serverTimestamp(),
        updatedAt: serverTimestamp(),
      }),
      { merge: true },
    );
  } else {
    if (!source.customerId) {
      throw new Error("Customer print requests must have a customer to copy.");
    }

    const customerRef = doc(firestoreCollectionService.getCustomersCollection(), source.customerId);
    const customerSnapshot = await transaction.get(customerRef);

    if (!customerSnapshot.exists()) {
      throw new Error("Customer not found.");
    }

    const customer = mapCustomerData(customerSnapshot.id, customerSnapshot.data() as CustomerDocumentData);
    const username = requireValidCustomerUsername(
      source.customerUsernameSnapshot ?? customer.username ?? "",
    );
    sequence = resolveNextSequence(customer.nextPrintRequestSequence);
    name = formatCustomerPrintRequestName(username, sequence);
    customerId = customer.id;
    requestOrigin = source.requestOrigin ?? "studio_customer";

    const payload = withoutUndefinedFields({
      ...buildPrintRequestPayload(
        {
          name,
          customerId: customer.id,
          isInternal: false,
          requestOrigin,
          requestSequenceNumber: sequence,
          customerUsernameSnapshot: username,
          customerDisplayNameSnapshot:
            source.customerDisplayNameSnapshot ?? customer.displayName,
          nameFormatVersion: source.nameFormatVersion ?? "cr-ir-v1",
          notes: source.notes,
        },
        callerId,
      ),
      status: "active" as const,
      itemCount,
    });

    assertNoUndefinedFirestoreFields(payload, "Copied customer print request payload");
    transaction.set(requestRef, payload);
    transaction.update(customerRef, {
      nextPrintRequestSequence: sequence + 1,
      totalPrintRequests: customer.totalPrintRequests + 1,
      updatedAt: serverTimestamp(),
    });
  }

  return {
    requestRef,
    name,
    requestOrigin,
    customerId,
  };
}

export const printRequestService = {
  /**
   * Server-paginated request list — bounded to `PRINT_REQUEST_LIST_PAGE_SIZE` (+1 peek to detect
   * `hasMore`) instead of the prior unbounded full-collection load. Filtering by `queueTab`
   * (server-maintained, see `printRequest.types.ts`) lets each list tab load and count exactly,
   * with no per-request item/allocation read required just to classify it (Wave C hydration
   * remediation, 2026-07-25).
   */
  async listPrintRequestsPage(
    caller: User,
    options: PrintRequestListQueryOptions = {},
  ): Promise<PrintRequestListPage> {
    if (!permissionService.canViewPrintRequests(caller)) {
      return { requests: [], hasMore: false };
    }

    const pageSize = options.limitCount ?? PRINT_REQUEST_LIST_PAGE_SIZE;
    const requestsQuery = query(
      firestoreCollectionService.getPrintRequestsCollection(),
      ...buildFirestoreQueryConstraints(
        buildPrintRequestListQueryPlan({ ...options, limitCount: pageSize + 1 }),
      ),
    );
    traceFirestoreOneShotStart("getDocs", "printRequests:list-page");
    const snapshot = await getDocs(requestsQuery);
    traceFirestoreOneShotComplete("getDocs", "printRequests:list-page", snapshot.size);

    const hasMore = snapshot.docs.length > pageSize;
    const pageDocs = hasMore ? snapshot.docs.slice(0, pageSize) : snapshot.docs;
    const requests = pageDocs.map((requestDoc) =>
      mapPrintRequestData(requestDoc.id, requestDoc.data() as PrintRequestDocumentData),
    );
    const lastRequest = requests[requests.length - 1];

    return {
      requests,
      hasMore,
      nextCursor:
        hasMore && lastRequest
          ? { requestId: lastRequest.id, updatedAtMillis: lastRequest.updatedAt.toMillis() }
          : undefined,
    };
  },

  /**
   * Exact tab/filter count with zero document hydration — `getCountFromServer` against the same
   * indexed `queueTab`/`status`/`customerId`/`isInternal` filter, including the Studio list's
   * indexed `isInternal` + `queueTab` pair. Never load request documents merely to count them.
   * request documents merely to count them.
   */
  async countPrintRequests(
    caller: User,
    options: PrintRequestListQueryOptions = {},
  ): Promise<number> {
    if (!permissionService.canViewPrintRequests(caller)) {
      return 0;
    }

    const plan = buildPrintRequestListQueryPlan({ ...options, limitCount: undefined, cursor: undefined });
    const countQuery = query(
      firestoreCollectionService.getPrintRequestsCollection(),
      ...plan.filters.map((filter) => where(filter.field, filter.operator, filter.value)),
    );
    traceFirestoreOneShotStart("getCountFromServer", "printRequests:count");
    const snapshot = await getCountFromServer(countQuery);
    traceFirestoreOneShotComplete("getCountFromServer", "printRequests:count", 0);
    return snapshot.data().count;
  },

  /**
   * Direct-ID fetch for a deep-linked/selected request outside the currently loaded page(s) —
   * never queries the collection to "find" it.
   */
  async getPrintRequestsByIds(caller: User, printRequestIds: string[]): Promise<PrintRequest[]> {
    if (!permissionService.canViewPrintRequests(caller) || printRequestIds.length === 0) {
      return [];
    }

    const uniqueIds = [...new Set(printRequestIds.map((id) => id.trim()).filter(Boolean))];
    traceFirestoreOneShotStart("getDoc", "printRequests:byIds");
    const snapshots = await Promise.all(
      uniqueIds.map((id) => getDoc(doc(firestoreCollectionService.getPrintRequestsCollection(), id))),
    );
    const found = snapshots.filter((snapshot) => snapshot.exists());
    traceFirestoreOneShotComplete("getDoc", "printRequests:byIds", found.length);

    return found.map((snapshot) =>
      mapPrintRequestData(snapshot.id, snapshot.data() as PrintRequestDocumentData),
    );
  },

  /**
   * Every print request for ONE customer — naturally bounded by that customer's own request
   * count (used by the customer audit-trail activity feed, not the Print Requests list page).
   * Not a corpus scan: scoped by the indexed `customerId` filter.
   */
  async listPrintRequestsByCustomer(caller: User, customerId: string): Promise<PrintRequest[]> {
    if (!permissionService.canViewPrintRequests(caller)) {
      return [];
    }

    const requestsQuery = query(
      firestoreCollectionService.getPrintRequestsCollection(),
      where("customerId", "==", customerId),
    );
    traceFirestoreOneShotStart("getDocs", "printRequests:byCustomer");
    const snapshot = await getDocs(requestsQuery);
    traceFirestoreOneShotComplete("getDocs", "printRequests:byCustomer", snapshot.size);

    return snapshot.docs.map((requestDoc) =>
      mapPrintRequestData(requestDoc.id, requestDoc.data() as PrintRequestDocumentData),
    );
  },

  /**
   * Allocation totals scoped to only the given request IDs (chunked `in` queries, cap 10) —
   * replaces the prior full `showAllocations` collection scan for list/page rendering. Grouping
   * is a pure per-ID aggregation (`buildPrintRequestAllocationTotalsByRequestId`), so totals for
   * the requested IDs are identical whether computed from a full scan or this scoped read.
   */
  async listAllocationTotalsForRequests(
    caller: User,
    printRequestIds: string[],
  ): Promise<Record<string, { totalAllocatedQuantity: number; totalInProgressQuantity: number; totalPrintedQuantity: number }>> {
    if (!permissionService.canViewPrintRequests(caller)) {
      return {};
    }

    const uniqueIds = [...new Set(printRequestIds.map((id) => id.trim()).filter(Boolean))];
    if (uniqueIds.length === 0) {
      return {};
    }

    const chunks: string[][] = [];
    for (let index = 0; index < uniqueIds.length; index += 10) {
      chunks.push(uniqueIds.slice(index, index + 10));
    }

    traceFirestoreOneShotStart("getDocs", "showAllocations:byRequestIds-chunked");
    const chunkSnapshots = await Promise.all(
      chunks.map((chunk) =>
        getDocs(
          query(
            firestoreCollectionService.getShowAllocationsCollection(),
            where("printRequestId", "in", chunk),
          ),
        ),
      ),
    );
    traceFirestoreOneShotComplete(
      "getDocs",
      "showAllocations:byRequestIds-chunked",
      chunkSnapshots.reduce((total, snapshot) => total + snapshot.size, 0),
    );

    const allocations: ShowAllocation[] = chunkSnapshots.flatMap((snapshot) =>
      snapshot.docs.map((allocationDoc) => {
        const data = allocationDoc.data();
        return {
          id: allocationDoc.id,
          printRequestId: typeof data.printRequestId === "string" ? data.printRequestId : "",
          allocatedQuantity: typeof data.allocatedQuantity === "number" ? data.allocatedQuantity : 0,
          status: typeof data.status === "string" ? data.status : "canceled",
        } as ShowAllocation;
      }),
    );

    return buildPrintRequestAllocationTotalsByRequestId(allocations);
  },

  /**
   * Allocation rows scoped to the given request IDs (chunked `in` queries, cap 10).
   * When `activeOnly` is true, canceled rows are excluded (Print Requests list grouping).
   * Customer history uses `activeOnly: false` so missed-show / requeue timelines stay truthful.
   */
  async listShowAllocationsForRequests(
    caller: User,
    printRequestIds: string[],
    options?: { activeOnly?: boolean },
  ): Promise<ShowAllocation[]> {
    if (!permissionService.canViewPrintRequests(caller)) {
      return [];
    }

    const activeOnly = options?.activeOnly ?? false;
    const uniqueIds = [...new Set(printRequestIds.map((id) => id.trim()).filter(Boolean))];
    if (uniqueIds.length === 0) {
      return [];
    }

    const chunks: string[][] = [];
    for (let index = 0; index < uniqueIds.length; index += 10) {
      chunks.push(uniqueIds.slice(index, index + 10));
    }

    traceFirestoreOneShotStart(
      "getDocs",
      activeOnly ? "showAllocations:activeByRequestIds-chunked" : "showAllocations:byRequestIds-chunked",
    );
    const chunkSnapshots = await Promise.all(
      chunks.map((chunk) =>
        getDocs(
          query(
            firestoreCollectionService.getShowAllocationsCollection(),
            where("printRequestId", "in", chunk),
          ),
        ),
      ),
    );
    traceFirestoreOneShotComplete(
      "getDocs",
      activeOnly ? "showAllocations:activeByRequestIds-chunked" : "showAllocations:byRequestIds-chunked",
      chunkSnapshots.reduce((total, snapshot) => total + snapshot.size, 0),
    );

    return chunkSnapshots.flatMap((snapshot) =>
      snapshot.docs.flatMap((allocationDoc) => {
        try {
          const allocation = mapShowAllocationData(
            allocationDoc.id,
            allocationDoc.data() as ShowAllocationDocumentData,
          );
          if (activeOnly && allocation.status === "canceled") {
            return [];
          }
          return [allocation];
        } catch (error) {
          console.warn(
            `[printRequestService] Skipping incomplete show allocation ${allocationDoc.id}:`,
            error instanceof Error ? error.message : error,
          );
          return [];
        }
      }),
    );
  },

  /**
   * Active allocation rows scoped to the given request IDs (chunked `in` queries, cap 10) —
   * returns full `ShowAllocation` documents for show grouping on the Print Requests list page.
   * Canceled allocations are excluded server-side in the mapper/filter pass.
   */
  async listActiveShowAllocationsForRequests(
    caller: User,
    printRequestIds: string[],
  ): Promise<ShowAllocation[]> {
    return this.listShowAllocationsForRequests(caller, printRequestIds, { activeOnly: true });
  },

  async listPrintRequestItemSummariesForRequests(
    caller: User,
    printRequestIds: string[],
  ): Promise<Record<string, PrintRequestItemSummary>> {
    if (!permissionService.canViewPrintRequests(caller)) {
      return {};
    }

    const uniquePrintRequestIds = [...new Set(printRequestIds.map((id) => id.trim()).filter(Boolean))];

    if (uniquePrintRequestIds.length === 0) {
      return {};
    }

    // Chunked `in` queries (Firestore cap 10) instead of one query per request — the summary
    // aggregation only reads printRequestId/designId/quantity and is order-independent, so this
    // returns the exact same summaries in ceil(N/10) queries instead of N (mirrors Portal's
    // listPrintRequestItemsForRequests pattern; Wave C comprehensive audit, 2026-07-25).
    const chunks: string[][] = [];
    for (let index = 0; index < uniquePrintRequestIds.length; index += 10) {
      chunks.push(uniquePrintRequestIds.slice(index, index + 10));
    }

    traceFirestoreOneShotStart("getDocs", "printRequestItems:summaries-chunked");
    const chunkSnapshots = await Promise.all(
      chunks.map((chunk) =>
        getDocs(
          query(
            firestoreCollectionService.getPrintRequestItemsCollection(),
            where("printRequestId", "in", chunk),
          ),
        ),
      ),
    );
    traceFirestoreOneShotComplete(
      "getDocs",
      "printRequestItems:summaries-chunked",
      chunkSnapshots.reduce((total, snapshot) => total + snapshot.size, 0),
    );

    const items = chunkSnapshots.flatMap((snapshot) =>
      snapshot.docs.flatMap((itemDoc) => {
        try {
          return [
            mapPrintRequestItemData(itemDoc.id, itemDoc.data() as PrintRequestItemDocumentData),
          ];
        } catch (error) {
          console.warn(
            `[printRequestService] Skipping incomplete print request item ${itemDoc.id}:`,
            error instanceof Error ? error.message : error,
          );
          return [];
        }
      }),
    );

    return buildPrintRequestItemSummaries(items);
  },

  async getPrintRequestById(caller: User, printRequestId: string): Promise<PrintRequest> {
    if (!permissionService.canViewPrintRequests(caller)) {
      throw new Error("You do not have permission to view print requests.");
    }

    const snapshot = await getDoc(doc(firestoreCollectionService.getPrintRequestsCollection(), printRequestId));

    if (!snapshot.exists()) {
      throw new Error("Print request not found.");
    }

    return mapPrintRequestData(snapshot.id, snapshot.data() as PrintRequestDocumentData);
  },

  async listPrintRequestItems(
    caller: User,
    printRequestId: string,
    options: PrintRequestItemListQueryOptions = {},
  ): Promise<PrintRequestItem[]> {
    if (!permissionService.canViewPrintRequests(caller)) {
      return [];
    }

    const itemsQuery = query(
      firestoreCollectionService.getPrintRequestItemsCollection(),
      ...buildFirestoreQueryConstraints(buildPrintRequestItemsQueryPlan(printRequestId, options)),
    );
    traceFirestoreOneShotStart("getDocs", "printRequestItems:byRequest");
    const snapshot = await getDocs(itemsQuery);
    traceFirestoreOneShotComplete("getDocs", "printRequestItems:byRequest", snapshot.size);

    return sortPrintRequestItemsForDisplay(
      snapshot.docs.flatMap((itemDoc) => {
        try {
          return [
            mapPrintRequestItemData(itemDoc.id, itemDoc.data() as PrintRequestItemDocumentData),
          ];
        } catch (error) {
          console.warn(
            `[printRequestService] Skipping incomplete print request item ${itemDoc.id}:`,
            error instanceof Error ? error.message : error,
          );
          return [];
        }
      }),
    );
  },

  /** @deprecated Full customer scan — retained only for surfaces that genuinely need every
   * customer (e.g. the request-creation "choose a customer" picker). Never call this for list
   * rendering; use `listCustomersByIds` scoped to the visible page's request owners. */
  async listCustomers(caller: User, options: CustomerListQueryOptions = {}): Promise<Customer[]> {
    if (!permissionService.canViewPrintRequests(caller)) {
      return [];
    }

    const customersQuery = query(
      firestoreCollectionService.getCustomersCollection(),
      ...buildFirestoreQueryConstraints(buildCustomerListQueryPlan(options)),
    );
    traceFirestoreOneShotStart("getDocs", "customers:list");
    const snapshot = await getDocs(customersQuery);
    traceFirestoreOneShotComplete("getDocs", "customers:list", snapshot.size);

    return snapshot.docs.map((customerDoc) =>
      mapCustomerData(customerDoc.id, customerDoc.data() as CustomerDocumentData),
    );
  },

  async listCustomerIdsWithContinuableCustomerRequests(caller: User): Promise<string[]> {
    if (!permissionService.canViewPrintRequests(caller)) {
      return [];
    }

    const continuableQuery = query(
      firestoreCollectionService.getPrintRequestsCollection(),
      where("status", "in", ["draft", "editing"]),
      where("isInternal", "==", false),
    );
    traceFirestoreOneShotStart("getDocs", "printRequests:continuableCustomerIds");
    const snapshot = await getDocs(continuableQuery);
    traceFirestoreOneShotComplete(
      "getDocs",
      "printRequests:continuableCustomerIds",
      snapshot.size,
    );

    const customerIds = new Set<string>();
    for (const requestDoc of snapshot.docs) {
      const data = requestDoc.data() as { customerId?: unknown; status?: unknown };
      if (
        typeof data.customerId === "string" &&
        data.customerId.length > 0 &&
        isPortalContinuablePrintRequestStatus(data.status as PrintRequest["status"])
      ) {
        customerIds.add(data.customerId);
      }
    }

    return [...customerIds];
  },

  /**
   * Fetches only the given customer IDs (direct doc reads) — replaces a full `customers`
   * collection scan for list rendering, since a visible request page only ever references a
   * small subset of customers (Wave C hydration remediation, 2026-07-25). Internal requests
   * contribute no ID here, so they never trigger a customer read.
   */
  async listCustomersByIds(caller: User, customerIds: string[]): Promise<Customer[]> {
    if (!permissionService.canViewPrintRequests(caller) || customerIds.length === 0) {
      return [];
    }

    const uniqueIds = [...new Set(customerIds.map((id) => id.trim()).filter(Boolean))];
    if (uniqueIds.length === 0) {
      return [];
    }

    traceFirestoreOneShotStart("getDoc", "customers:byIds");
    const snapshots = await Promise.all(
      uniqueIds.map((id) => getDoc(doc(firestoreCollectionService.getCustomersCollection(), id))),
    );
    const found = snapshots.filter((snapshot) => snapshot.exists());
    traceFirestoreOneShotComplete("getDoc", "customers:byIds", found.length);

    return found.map((snapshot) => mapCustomerData(snapshot.id, snapshot.data() as CustomerDocumentData));
  },

  async createPrintRequest(caller: User, input: CreatePrintRequestInput): Promise<PrintRequest> {
    if (input.isInternal === true) {
      return this.createInternalPrintRequest(caller, input);
    }

    if (input.customerId) {
      return this.createCustomerPrintRequest(caller, {
        customerId: input.customerId,
        notes: input.notes,
      });
    }

    if (!permissionService.canManagePrintRequests(caller)) {
      throw new Error("You do not have permission to create print requests.");
    }

    const name = input.name?.trim() ?? "";
    if (!name) {
      throw new Error("Print request name is required.");
    }

    const requestRef = doc(firestoreCollectionService.getPrintRequestsCollection());
    const payload = buildPrintRequestPayload(
      {
        ...input,
        name,
        requestSequenceNumber: 1,
      },
      caller.id,
    );

    await runTracedWrite("setDoc", () => setDoc(requestRef, payload), {
      app: "studio",
      collection: "printRequests",
      documentPathPattern: "printRequests/{printRequestId}",
      source: "printRequestService.createPrintRequest",
    });

    const createdSnapshot = await getDoc(requestRef);
    return mapPrintRequestData(requestRef.id, createdSnapshot.data() as PrintRequestDocumentData);
  },

  async createInternalPrintRequest(
    caller: User,
    input: Pick<CreatePrintRequestInput, "internalBaseName" | "notes"> = {},
  ): Promise<PrintRequest> {
    if (!permissionService.canManagePrintRequests(caller)) {
      throw new Error("You do not have permission to create print requests.");
    }

    const requestRef = await runTracedWrite(
      "runTransaction",
      () =>
        runTransaction(db, (transaction) =>
          createInternalPrintRequestInTransaction(transaction, caller.id, input),
        ),
      {
        app: "studio",
        collection: "printRequests",
        documentPathPattern: "printRequests/{printRequestId}",
        source: "printRequestService.createInternalPrintRequest",
      },
      { writeCount: 2 },
    );
    const createdSnapshot = await getDoc(requestRef);
    return mapPrintRequestData(requestRef.id, createdSnapshot.data() as PrintRequestDocumentData);
  },

  async createCustomerPrintRequest(
    caller: User,
    input: { customerId: string; notes?: string },
  ): Promise<PrintRequest> {
    if (!permissionService.canManagePrintRequests(caller)) {
      throw new Error("You do not have permission to create print requests.");
    }

    await assertCustomerHasNoContinuablePrintRequest(input.customerId);

    const requestRef = await runTracedWrite(
      "runTransaction",
      () =>
        runTransaction(db, (transaction) =>
          createCustomerPrintRequestInTransaction(transaction, caller.id, input),
        ),
      {
        app: "studio",
        collection: "printRequests",
        documentPathPattern: "printRequests/{printRequestId}",
        source: "printRequestService.createCustomerPrintRequest",
      },
      { writeCount: 2 },
    );
    const createdSnapshot = await getDoc(requestRef);
    return mapPrintRequestData(requestRef.id, createdSnapshot.data() as PrintRequestDocumentData);
  },

  async updatePrintRequest(
    caller: User,
    printRequestId: string,
    input: UpdatePrintRequestInput,
  ): Promise<PrintRequest> {
    if (!permissionService.canManagePrintRequests(caller)) {
      throw new Error("You do not have permission to edit print requests.");
    }

    const requestRef = doc(firestoreCollectionService.getPrintRequestsCollection(), printRequestId);
    const snapshot = await getDoc(requestRef);

    if (!snapshot.exists()) {
      throw new Error("Print request not found.");
    }

    const current = mapPrintRequestData(snapshot.id, snapshot.data() as PrintRequestDocumentData);
    const nextPayload = withoutUndefinedFields({
      name: input.name?.trim() || current.name,
      customerId: input.customerId ?? current.customerId,
      isInternal: input.isInternal ?? current.isInternal,
      status: input.status ?? current.status,
      notes: input.notes?.trim() || undefined,
      updatedBy: caller.id,
      updatedAt: serverTimestamp(),
    });

    assertNoUndefinedFirestoreFields(nextPayload, "Print request update payload");
    await runTracedWrite("updateDoc", () => updateDoc(requestRef, nextPayload), {
      app: "studio",
      collection: "printRequests",
      documentPathPattern: "printRequests/{printRequestId}",
      source: "printRequestService.updatePrintRequest",
    });

    const updatedSnapshot = await getDoc(requestRef);
    return mapPrintRequestData(updatedSnapshot.id, updatedSnapshot.data() as PrintRequestDocumentData);
  },

  async clearNeedsStaffRequeueMarker(caller: User, printRequestId: string): Promise<void> {
    if (!permissionService.canManagePrintRequests(caller)) {
      throw new Error("You do not have permission to edit print requests.");
    }

    const requestRef = doc(firestoreCollectionService.getPrintRequestsCollection(), printRequestId);
    const snapshot = await getDoc(requestRef);

    if (!snapshot.exists()) {
      throw new Error("Print request not found.");
    }

    const current = mapPrintRequestData(snapshot.id, snapshot.data() as PrintRequestDocumentData);
    if (!hasNeedsStaffRequeueMarker(current)) {
      return;
    }

    const nextPayload = {
      needsStaffRequeueAt: deleteField(),
      needsStaffRequeueSourceShowId: deleteField(),
      needsStaffRequeueSourceShowTitleSnapshot: deleteField(),
      needsStaffRequeueReleasedQuantity: deleteField(),
      updatedBy: caller.id,
      updatedAt: serverTimestamp(),
    };

    assertNoUndefinedFirestoreFields(nextPayload, "Print request requeue marker clear payload");
    await runTracedWrite("updateDoc", () => updateDoc(requestRef, nextPayload), {
      app: "studio",
      collection: "printRequests",
      documentPathPattern: "printRequests/{printRequestId}",
      source: "printRequestService.clearNeedsStaffRequeueMarker",
    });
  },

  async getPrintRequestForShowReconciliation(
    caller: User,
    printRequestId: string,
    readSource: ShowReconciliationReadSource = "default",
  ) {
    if (!permissionService.canManagePrintRequests(caller)) {
      throw new Error("You do not have permission to edit print requests.");
    }
    const requestRef = doc(firestoreCollectionService.getPrintRequestsCollection(), printRequestId);
    const snapshot = readSource === "server"
      ? await getDocFromServer(requestRef)
      : await getDoc(requestRef);
    if (!snapshot.exists()) {
      throw new Error("Print request not found.");
    }
    const data = snapshot.data() as PrintRequestDocumentData;
    const diagnostics = diagnosePrintRequestForCompletion(data);
    let request: PrintRequest;
    try {
      request = mapPrintRequestData(snapshot.id, data);
    } catch {
      throw new ShowCompletionReconciliationRemediationError(
        "The Print Request record is incomplete and needs remediation.",
        diagnostics,
      );
    }
    // Plan Section 29.3: the mapper above can succeed (the document is readable/renderable) while
    // the document still fails firestore.rules' cross-field assignment invariant on the completion
    // write — neither the mapper nor the field-presence diagnostics above check this. A document in
    // this state cannot be fixed by retrying (the write will always be denied), so surface it as a
    // remediation condition now rather than let it appear "retryable" and loop indefinitely.
    if (diagnostics.assignmentInvariantFailure) {
      throw new ShowCompletionReconciliationRemediationError(
        "The Print Request record's customer/guest assignment needs staff remediation before completion can be recorded.",
        diagnostics,
      );
    }
    return {
      ...request,
      parserStatus: "compatible" as const,
      missingFields: diagnostics.missingFields,
      legacyExtraFields: diagnostics.legacyExtraFields,
    };
  },

  async listPrintRequestItemsForShowReconciliation(
    caller: User,
    printRequestId: string,
    readSource: ShowReconciliationReadSource = "default",
  ): Promise<PrintRequestItem[]> {
    if (!permissionService.canViewPrintRequests(caller)) {
      throw new Error("You do not have permission to view print request items.");
    }
    const itemsQuery = query(
      firestoreCollectionService.getPrintRequestItemsCollection(),
      ...buildFirestoreQueryConstraints(buildPrintRequestItemsQueryPlan(printRequestId, {})),
    );
    const snapshot = readSource === "server"
      ? await getDocsFromServer(itemsQuery)
      : await getDocs(itemsQuery);
    return sortPrintRequestItemsForDisplay(
      snapshot.docs.map((itemDoc) =>
        mapPrintRequestItemData(itemDoc.id, itemDoc.data() as PrintRequestItemDocumentData),
      ),
    );
  },

  /**
   * Completion-only write used after a show Finish batch has already committed. The caller has
   * already read and validated the request for eligibility; deliberately avoid a post-write read
   * so a committed status transition cannot be mislabeled as a failed reconciliation.
   */
  async markPrintRequestCompletedForShowReconciliation(
    caller: User,
    printRequestId: string,
  ): Promise<void> {
    if (!permissionService.canManagePrintRequests(caller)) {
      throw new Error("You do not have permission to edit print requests.");
    }

    const requestRef = doc(firestoreCollectionService.getPrintRequestsCollection(), printRequestId);
    const nextPayload = buildPrintRequestCompletionPayload(caller.id);
    assertNoUndefinedFirestoreFields(nextPayload, "Print request completion payload");
    await runTracedWrite("updateDoc", () => updateDoc(requestRef, nextPayload), {
      app: "studio",
      collection: "printRequests",
      documentPathPattern: "printRequests/{printRequestId}",
      source: "printRequestService.markPrintRequestCompletedForShowReconciliation",
    });

    try {
      await this.syncPrintRequestQueueTab(caller, printRequestId);
    } catch {
      // Firestore trigger / a later owner repair can reconcile queueTab.
    }
  },

  async syncPrintRequestQueueTab(
    caller: User,
    printRequestId: string,
  ): Promise<PrintRequestListTab | null> {
    if (!permissionService.canManagePrintRequests(caller)) {
      throw new Error("You do not have permission to edit print requests.");
    }

    const trimmedId = printRequestId.trim();
    if (!trimmedId) {
      throw new Error("A print request ID is required.");
    }

    const invoke = callTracedFunction<{ printRequestId: string }, { queueTab: string | null }>(
      "syncPrintRequestQueueTab",
      {
        source: "printRequestService.syncPrintRequestQueueTab",
        action: "Sync print request queue tab",
      },
    );
    const result = await invoke({ printRequestId: trimmedId });
    return isPrintRequestListTab(result.queueTab) ? result.queueTab : null;
  },

  async updatePrintRequestDetail(
    caller: User,
    printRequestId: string,
    input: UpdatePrintRequestDetailInput,
  ): Promise<PrintRequest> {
    if (!permissionService.canManagePrintRequests(caller)) {
      throw new Error("You do not have permission to edit print requests.");
    }

    const requestRef = doc(firestoreCollectionService.getPrintRequestsCollection(), printRequestId);
    const snapshot = await getDoc(requestRef);

    if (!snapshot.exists()) {
      throw new Error("Print request not found.");
    }

    const current = mapPrintRequestData(snapshot.id, snapshot.data() as PrintRequestDocumentData);
    const nextPayload: Record<string, unknown> = {
      updatedBy: caller.id,
      updatedAt: serverTimestamp(),
    };

    if (input.notes !== undefined) {
      nextPayload.notes = input.notes.trim();
    }

    if (input.internalBaseName !== undefined) {
      if (!current.isInternal) {
        throw new Error("Only internal requests can update the internal base name.");
      }

      if (!hasUsableSequence(current.requestSequenceNumber)) {
        throw new Error("This legacy internal request cannot be renamed because it has no locked sequence.");
      }

      const internalBaseName = requireValidInternalBaseName(input.internalBaseName);
      nextPayload.internalBaseName = internalBaseName;
      nextPayload.name = formatInternalPrintRequestName(internalBaseName, current.requestSequenceNumber);
      nextPayload.nameFormatVersion = "cr-ir-v1";
    }

    assertNoUndefinedFirestoreFields(nextPayload, "Print request detail update payload");
    await runTracedWrite("updateDoc", () => updateDoc(requestRef, nextPayload), {
      app: "studio",
      collection: "printRequests",
      documentPathPattern: "printRequests/{printRequestId}",
      source: "printRequestService.updatePrintRequestDetail",
    });

    const updatedSnapshot = await getDoc(requestRef);
    return mapPrintRequestData(updatedSnapshot.id, updatedSnapshot.data() as PrintRequestDocumentData);
  },

  async deletePrintRequest(): Promise<void> {
    throw new Error(
      "Direct print request deletion is disabled. Use the Print Requests delete action (server-validated).",
    );
  },

  async addPrintRequestItem(
    caller: User,
    printRequestId: string,
    input: CreatePrintRequestItemInput,
    options?: { existingItems?: PrintRequestItem[] },
  ): Promise<PrintRequestItem> {
    if (!permissionService.canManagePrintRequestItems(caller)) {
      throw new Error("You do not have permission to add print request items.");
    }

    if (!Number.isFinite(input.quantity) || input.quantity < 1) {
      throw new Error("Quantity must be at least 1.");
    }

    const customerUploadId = input.customerUploadId?.trim() || undefined;
    const isUploadItem =
      input.sourceType === "customer_upload" || Boolean(customerUploadId);
    const designId = input.designId?.trim() || undefined;

    if (isUploadItem) {
      if (!customerUploadId) {
        throw new Error("A customer upload is required.");
      }
    } else if (!designId) {
      throw new Error("A design is required.");
    }

    // Owner live-test remediation (2026-07-25): this method previously always read the parent
    // request (for itemCount + 1) and the full growing item list (for the default sortOrder) on
    // every add — 4 adds cost 4 parent reads + 1+2+3 item docs, all untraced. The parent update
    // now uses increment(1) (no read; safer under concurrency, and no readback needed since this
    // method never returns the parent's new itemCount). Independent review required either a
    // parent-existence guard or documenting the tradeoff of writing an item before the parent
    // update would fail on a bad ID — resolved by accepting an optional `existingItems` hint from
    // callers that already loaded the request/items once (e.g. `savePrintRequestDesignSelections`,
    // which already calls `getPrintRequestById` — proving existence — before looping adds): when
    // provided, it satisfies the sortOrder computation with zero extra reads and the caller's own
    // upfront `getPrintRequestById` remains the existence guard. Callers that do not preload items
    // (and did not already validate existence) still get exactly one items query for sortOrder,
    // which itself throws a real Firestore permission/not-found style failure long before an
    // orphaned item could be written if the request truly does not exist.
    const itemRef = doc(firestoreCollectionService.getPrintRequestItemsCollection());
    const sortOrder =
      typeof input.sortOrder === "number" && Number.isFinite(input.sortOrder)
        ? input.sortOrder
        : resolveNextSortOrder(
            options?.existingItems ?? (await this.listPrintRequestItems(caller, printRequestId)),
          );

    if (isUploadItem && customerUploadId) {
      const printWidthInches = input.printWidthInches;
      const printHeightInches = input.printHeightInches;
      const payload = withoutUndefinedFields({
        id: itemRef.id,
        printRequestId,
        sourceType: "customer_upload" as const,
        customerUploadId,
        titleSnapshot: input.titleSnapshot?.trim() || undefined,
        quantity: input.quantity,
        printWidthInches,
        printHeightInches,
        sizeLabel:
          typeof printWidthInches === "number" && typeof printHeightInches === "number"
            ? formatPrintRequestItemSizeLabel(printWidthInches, printHeightInches)
            : undefined,
        ...(input.standardSizePresetKey?.trim()
          ? { standardSizePresetKey: input.standardSizePresetKey.trim() }
          : {}),
        sortOrder,
        notes: input.notes?.trim() || undefined,
        status: "pending" as const,
        addedBy: caller.id,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });

      assertNoUndefinedFirestoreFields(payload, "Print request item payload");
      await runTracedWrite("setDoc", () => setDoc(itemRef, payload), {
        app: "studio",
        collection: "printRequestItems",
        documentPathPattern: "printRequestItems/{printRequestItemId}",
        source: "printRequestService.addPrintRequestItem",
      });
      await runTracedWrite(
        "updateDoc",
        () =>
          updateDoc(doc(firestoreCollectionService.getPrintRequestsCollection(), printRequestId), {
            itemCount: increment(1),
            updatedBy: caller.id,
            updatedAt: serverTimestamp(),
          }),
        {
          app: "studio",
          collection: "printRequests",
          documentPathPattern: "printRequests/{printRequestId}",
          source: "printRequestService.addPrintRequestItem",
        },
      );

      // Synthesize the created item from the known payload instead of a read-after-write —
      // the next authoritative load re-reads real server timestamps.
      const nowTimestamp = Timestamp.now();
      return mapPrintRequestItemData(itemRef.id, {
        ...payload,
        createdAt: nowTimestamp,
        updatedAt: nowTimestamp,
      } as unknown as PrintRequestItemDocumentData);
    }

    const design = await loadPrintableDesign(caller, designId!);
    const requestedSize = resolveRequestedItemSize(design, input);
    const payload = withoutUndefinedFields({
      id: itemRef.id,
      printRequestId,
      designId: design.id,
      quantity: input.quantity,
      printWidthInches: requestedSize.printWidthInches,
      printHeightInches: requestedSize.printHeightInches,
      sizeLabel: requestedSize.sizeLabel,
      ...(input.standardSizePresetKey?.trim()
        ? { standardSizePresetKey: input.standardSizePresetKey.trim() }
        : {}),
      sortOrder,
      notes: input.notes?.trim() || undefined,
      status: "pending" as const,
      addedBy: caller.id,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });

    assertNoUndefinedFirestoreFields(payload, "Print request item payload");
    await runTracedWrite("setDoc", () => setDoc(itemRef, payload), {
      app: "studio",
      collection: "printRequestItems",
      documentPathPattern: "printRequestItems/{printRequestItemId}",
      source: "printRequestService.addPrintRequestItem",
    });

    await runTracedWrite(
      "updateDoc",
      () =>
        updateDoc(doc(firestoreCollectionService.getPrintRequestsCollection(), printRequestId), {
          itemCount: increment(1),
          updatedBy: caller.id,
          updatedAt: serverTimestamp(),
        }),
      {
        app: "studio",
        collection: "printRequests",
        documentPathPattern: "printRequests/{printRequestId}",
        source: "printRequestService.addPrintRequestItem",
      },
    );

    // requestCount / lastRequestedAt are updated by Cloud Function onPrintRequestItemCreated.

    // Synthesize the created item from the known payload instead of a read-after-write.
    const nowTimestamp = Timestamp.now();
    return mapPrintRequestItemData(itemRef.id, {
      ...payload,
      createdAt: nowTimestamp,
      updatedAt: nowTimestamp,
    } as unknown as PrintRequestItemDocumentData);
  },

  async updatePrintRequestItem(
    caller: User,
    itemId: string,
    input: UpdatePrintRequestItemInput,
  ): Promise<PrintRequestItem> {
    if (!permissionService.canManagePrintRequestItems(caller)) {
      throw new Error("You do not have permission to edit print request items.");
    }

    const itemRef = doc(firestoreCollectionService.getPrintRequestItemsCollection(), itemId);
    const snapshot = await getDoc(itemRef);

    if (!snapshot.exists()) {
      throw new Error("Print request item not found.");
    }

    const current = mapPrintRequestItemData(snapshot.id, snapshot.data() as PrintRequestItemDocumentData);
    if (input.quantity !== undefined && (!Number.isFinite(input.quantity) || input.quantity < 1)) {
      throw new Error("Quantity must be at least 1.");
    }

    const isUploadItem =
      current.sourceType === "customer_upload" || Boolean(current.customerUploadId);

    let requestedSize: {
      printWidthInches: number;
      printHeightInches: number;
      sizeLabel: string;
    };

    if (isUploadItem) {
      const printWidthInches = input.printWidthInches ?? current.printWidthInches;
      const printHeightInches = input.printHeightInches ?? current.printHeightInches;
      if (typeof printWidthInches !== "number" || typeof printHeightInches !== "number") {
        throw new Error("Print size is required.");
      }
      requestedSize = {
        printWidthInches,
        printHeightInches,
        sizeLabel: formatPrintRequestItemSizeLabel(printWidthInches, printHeightInches),
      };
    } else {
      if (!current.designId) {
        throw new Error("Print request item is missing a design.");
      }
      const design = await loadPrintableDesign(caller, current.designId);
      requestedSize = resolveRequestedItemSize(design, input, current);
    }

    const statusFields = input.status === undefined
      ? {}
      : input.status === "printed"
        ? { status: input.status, printedAt: serverTimestamp(), printedBy: caller.id, completedAt: current.completedAt }
        : input.status === "done"
          ? { status: input.status, printedAt: current.printedAt ?? serverTimestamp(), printedBy: current.printedBy ?? caller.id, completedAt: serverTimestamp() }
          : input.status === "canceled"
            ? { status: input.status, printedAt: current.printedAt, printedBy: current.printedBy, completedAt: current.completedAt }
            : {
                status: input.status,
                printedAt: current.printedAt,
                printedBy: current.printedBy,
                completedAt: current.completedAt,
              };

    const presetKeyUpdate =
      input.standardSizePresetKey === null
        ? { standardSizePresetKey: deleteField() }
        : input.standardSizePresetKey !== undefined
          ? {
              standardSizePresetKey:
                typeof input.standardSizePresetKey === "string" &&
                input.standardSizePresetKey.trim()
                  ? input.standardSizePresetKey.trim()
                  : deleteField(),
            }
          : {};

    const payload = withoutUndefinedFields({
      quantity: input.quantity ?? current.quantity,
      printWidthInches: requestedSize.printWidthInches,
      printHeightInches: requestedSize.printHeightInches,
      sizeLabel: requestedSize.sizeLabel,
      notes: input.notes?.trim() || undefined,
      updatedAt: serverTimestamp(),
      ...statusFields,
      ...presetKeyUpdate,
    });

    assertNoUndefinedFirestoreFields(payload, "Print request item update payload");
    await runTracedWrite("updateDoc", () => updateDoc(itemRef, payload), {
      app: "studio",
      collection: "printRequestItems",
      documentPathPattern: "printRequestItems/{printRequestItemId}",
      source: "printRequestService.updatePrintRequestItem",
    });

    const updatedSnapshot = await getDoc(itemRef);
    return mapPrintRequestItemData(updatedSnapshot.id, updatedSnapshot.data() as PrintRequestItemDocumentData);
  },

  async duplicatePrintRequestItem(caller: User, itemId: string): Promise<PrintRequestItem> {
    if (!permissionService.canManagePrintRequestItems(caller)) {
      throw new Error("You do not have permission to duplicate print request items.");
    }

    const itemRef = doc(firestoreCollectionService.getPrintRequestItemsCollection(), itemId);
    const snapshot = await getDoc(itemRef);

    if (!snapshot.exists()) {
      throw new Error("Print request item not found.");
    }

    const item = mapPrintRequestItemData(snapshot.id, snapshot.data() as PrintRequestItemDocumentData);
    const currentItems = await this.listPrintRequestItems(caller, item.printRequestId);
    const sortedItems = sortPrintRequestItemsForDisplay(currentItems);
    const sourceIndex = sortedItems.findIndex((entry) => entry.id === item.id);
    const sourceSortOrder = typeof item.sortOrder === "number" && Number.isFinite(item.sortOrder)
      ? item.sortOrder
      : undefined;

    let duplicateSortOrder = resolveNextSortOrder(currentItems);

    if (sourceSortOrder !== undefined) {
      const nextItem = sortedItems[sourceIndex + 1];
      const nextSortOrder =
        nextItem && typeof nextItem.sortOrder === "number" && Number.isFinite(nextItem.sortOrder)
          ? nextItem.sortOrder
          : undefined;

      duplicateSortOrder =
        nextSortOrder !== undefined && nextSortOrder > sourceSortOrder
          ? (sourceSortOrder + nextSortOrder) / 2
          : sourceSortOrder + 0.5;
    } else if (sourceIndex >= 0) {
      const anchoredOrder = (sourceIndex + 1) * 100;

      await runTracedWrite(
        "updateDoc",
        () =>
          updateDoc(itemRef, {
            sortOrder: anchoredOrder,
            updatedBy: caller.id,
            updatedAt: serverTimestamp(),
          }),
        {
          app: "studio",
          collection: "printRequestItems",
          documentPathPattern: "printRequestItems/{printRequestItemId}",
          source: "printRequestService.duplicatePrintRequestItem",
        },
      );
      duplicateSortOrder = anchoredOrder + 50;
    }

    const isUploadItem =
      item.sourceType === "customer_upload" || Boolean(item.customerUploadId);

    if (isUploadItem) {
      if (!item.customerUploadId) {
        throw new Error("Uploaded artwork is missing its source upload.");
      }

      return this.addPrintRequestItem(caller, item.printRequestId, {
        sourceType: "customer_upload",
        customerUploadId: item.customerUploadId,
        titleSnapshot: item.titleSnapshot,
        quantity: item.quantity,
        printWidthInches: item.printWidthInches,
        printHeightInches: item.printHeightInches,
        standardSizePresetKey: item.standardSizePresetKey,
        sortOrder: duplicateSortOrder,
        notes: item.notes,
      });
    }

    if (!item.designId) {
      throw new Error("Print request item is missing a design.");
    }

    const createdItem = await this.addPrintRequestItem(caller, item.printRequestId, {
      designId: item.designId,
      quantity: item.quantity,
      printWidthInches: item.printWidthInches,
      printHeightInches: item.printHeightInches,
      standardSizePresetKey: item.standardSizePresetKey,
      sortOrder: duplicateSortOrder,
      notes: item.notes,
    });

    return createdItem;
  },

  /**
   * Creates a new print request with the next locked sequence number and duplicates every item.
   * Used when staff copy a queued request from a past/finished show to another show.
   */
  async duplicatePrintRequestForShowTransferCopy(
    caller: User,
    source: PrintRequest,
    sourceItems: PrintRequestItem[],
  ): Promise<{
    printRequestId: string;
    printRequestName: string;
    requestOrigin?: PrintRequestOrigin;
    customerId?: string;
    itemIdBySourceItemId: Record<string, string>;
  }> {
    if (!permissionService.canManagePrintRequests(caller)) {
      throw new Error("You do not have permission to create print requests.");
    }

    if (!permissionService.canManagePrintRequestItems(caller)) {
      throw new Error("You do not have permission to duplicate print request items.");
    }

    if (sourceItems.length === 0) {
      throw new Error("This print request has no items to copy.");
    }

    const duplicated = await runTracedWrite(
      "runTransaction",
      () =>
        runTransaction(db, (transaction) =>
            duplicatePrintRequestForShowTransferCopyInTransaction(
              transaction,
              caller.id,
              source,
              sourceItems.length,
            ),
        ),
      {
        app: "studio",
        collection: "printRequests",
        documentPathPattern: "printRequests/{printRequestId}",
        source: "printRequestService.duplicatePrintRequestForShowTransferCopy",
      },
      { writeCount: 2 },
    );

    const itemIdBySourceItemId: Record<string, string> = {};
    const batch = writeBatch(firestoreCollectionService.getPrintRequestsCollection().firestore);

    for (const sourceItem of sourceItems) {
      const itemRef = doc(firestoreCollectionService.getPrintRequestItemsCollection());
      const itemPayload = buildDuplicatedPrintRequestItemPayload(
        caller.id,
        duplicated.requestRef.id,
        itemRef.id,
        sourceItem,
      );

      assertNoUndefinedFirestoreFields(itemPayload, "Copied print request item payload");
      batch.set(itemRef, itemPayload);
      itemIdBySourceItemId[sourceItem.id] = itemRef.id;
    }

    await runTracedWrite("writeBatch", () => batch.commit(), {
      app: "studio",
      collection: "printRequestItems",
      documentPathPattern: "printRequestItems/{printRequestItemId}",
      source: "printRequestService.duplicatePrintRequestForShowTransferCopy",
    });

    return {
      printRequestId: duplicated.requestRef.id,
      printRequestName: duplicated.name,
      requestOrigin: duplicated.requestOrigin,
      customerId: duplicated.customerId,
      itemIdBySourceItemId,
    };
  },

  async removePrintRequestItem(caller: User, itemId: string): Promise<void> {
    if (!permissionService.canManagePrintRequestItems(caller)) {
      throw new Error("You do not have permission to remove print request items.");
    }

    const itemRef = doc(firestoreCollectionService.getPrintRequestItemsCollection(), itemId);
    const snapshot = await getDoc(itemRef);

    if (!snapshot.exists()) {
      return;
    }

    const item = mapPrintRequestItemData(snapshot.id, snapshot.data() as PrintRequestItemDocumentData);
    const requestRef = doc(firestoreCollectionService.getPrintRequestsCollection(), item.printRequestId);
    const requestSnapshot = await getDoc(requestRef);

    await runTracedWrite("deleteDoc", () => deleteDoc(itemRef), {
      app: "studio",
      collection: "printRequestItems",
      documentPathPattern: "printRequestItems/{printRequestItemId}",
      source: "printRequestService.removePrintRequestItem",
    });

    if (requestSnapshot.exists()) {
      const request = mapPrintRequestData(requestSnapshot.id, requestSnapshot.data() as PrintRequestDocumentData);
      await runTracedWrite(
        "updateDoc",
        () =>
          updateDoc(requestRef, {
            itemCount: Math.max(0, request.itemCount - 1),
            updatedBy: caller.id,
            updatedAt: serverTimestamp(),
          }),
        {
          app: "studio",
          collection: "printRequests",
          documentPathPattern: "printRequests/{printRequestId}",
          source: "printRequestService.removePrintRequestItem",
        },
      );
    }
  },

  async savePrintRequestDesignSelections(
    caller: User,
    printRequestId: string,
    selections: PrintRequestDesignSelectionInput[],
  ): Promise<void> {
    if (!permissionService.canManagePrintRequestItems(caller)) {
      throw new Error("You do not have permission to manage print request items.");
    }

    const normalizedSelections = selections
      .map((selection) => ({
        designId: selection.designId.trim(),
        quantity: Number(selection.quantity),
        existingItemId: selection.existingItemId?.trim() || undefined,
      }))
      .filter((selection) => selection.designId.length > 0);

    if (normalizedSelections.length === 0) {
      return;
    }

    for (const selection of normalizedSelections) {
      if (!Number.isFinite(selection.quantity) || selection.quantity < 1) {
        throw new Error("Quantity must be at least 1.");
      }
    }

    await this.getPrintRequestById(caller, printRequestId);
    const currentItems = await this.listPrintRequestItems(caller, printRequestId);
    const plannedWrites = planPrintRequestDesignSelectionWrites(normalizedSelections, currentItems);

    for (const write of plannedWrites) {
      if (write.kind === "update_quantity") {
        await this.updatePrintRequestItem(caller, write.itemId, {
          quantity: write.quantity,
        });
        continue;
      }

      // Reuse the request/items already loaded above (existence proven by getPrintRequestById)
      // instead of a fresh per-add query — closes the growing-read pattern this loop previously
      // caused for each of the four designs added in the owner's live-test workflow.
      const created = await this.addPrintRequestItem(
        caller,
        printRequestId,
        {
          designId: write.designId,
          quantity: write.quantity,
        },
        { existingItems: currentItems },
      );
      currentItems.push(created);
    }
  },

  async listReadyDesigns(caller: User) {
    if (!permissionService.canViewPrintRequests(caller)) {
      return [];
    }

    const page = await designService.listDesignsPage(caller, {
      status: "ready",
      limitCount: 100,
      sortField: "updatedAt",
      sortDirection: "desc",
    });

    return page.designs;
  },
};
