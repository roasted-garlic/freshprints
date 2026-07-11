import {
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  orderBy,
  query,
  runTransaction,
  Timestamp,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
  type DocumentData,
  type QueryConstraint,
  type Transaction,
} from "firebase/firestore";

import { mapFirestoreTimestamp, resolveDesignDocumentTimestamps } from "../../firebase/utils/firestoreTimestamp";
import { assertNoUndefinedFirestoreFields, withoutUndefinedFields } from "../../firebase/utils/firestoreDocument";
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
import { requireValidCustomerUsername } from "@fresh-prints/shared/utils/customerUsername";
import { isPrintRequestOrigin } from "@fresh-prints/shared/utils/printRequestOrigin";
import {
  formatCustomerPrintRequestName,
  formatInternalPrintRequestName,
  requireValidInternalBaseName,
} from "@fresh-prints/shared/utils/printRequestNaming";
import {
  assessPrintRequestItemSize,
  formatPrintRequestItemSizeLabel,
  resolveInitialPrintRequestItemSize,
} from "@fresh-prints/shared/utils/printRequestItemSizing";
import {
  buildCustomerListQueryPlan,
  buildPrintRequestItemSummaries,
  buildPrintRequestItemsQueryPlan,
  buildPrintRequestListQueryPlan,
  sortPrintRequestItemsForDisplay,
  type CustomerListQueryOptions,
  type PrintRequestItemListQueryOptions,
  type PrintRequestItemSummary,
  type PrintRequestListQueryOptions,
  type PrintRequestQueryPlan,
} from "../utils/printRequestQueryPlanning";

export type { PrintRequestItemSummary } from "../utils/printRequestQueryPlanning";

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
  designId: string;
  quantity: number;
  printWidthInches?: number;
  printHeightInches?: number;
  sortOrder?: number;
  notes?: string;
}

export interface UpdatePrintRequestItemInput {
  quantity?: number;
  printWidthInches?: number;
  printHeightInches?: number;
  notes?: string;
  status?: PrintRequestItemStatus;
}

export interface PrintRequestDesignSelectionInput {
  designId: string;
  quantity: number;
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
  requestSequenceNumber?: unknown;
  customerUsernameSnapshot?: unknown;
  customerDisplayNameSnapshot?: unknown;
  internalBaseName?: unknown;
  nameFormatVersion?: unknown;
  notes?: unknown;
  createdBy?: unknown;
  updatedBy?: unknown;
  createdAt?: unknown;
  updatedAt?: unknown;
}

interface PrintRequestItemDocumentData extends DocumentData {
  id?: unknown;
  printRequestId?: unknown;
  designId?: unknown;
  quantity?: unknown;
  printWidthInches?: unknown;
  printHeightInches?: unknown;
  sizeLabel?: unknown;
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
    typeof data.designId !== "string" ||
    typeof data.quantity !== "number" ||
    typeof data.status !== "string" ||
    typeof data.addedBy !== "string" ||
    timestamps === null
  ) {
    throw new Error("A print request item record is incomplete.");
  }

  return {
    id: itemId,
    printRequestId: data.printRequestId,
    designId: data.designId,
    quantity: data.quantity,
    printWidthInches: typeof data.printWidthInches === "number" ? data.printWidthInches : undefined,
    printHeightInches: typeof data.printHeightInches === "number" ? data.printHeightInches : undefined,
    sizeLabel: typeof data.sizeLabel === "string" ? data.sizeLabel : undefined,
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

async function loadPrintableDesign(caller: User, designId: string) {
  const design = await designService.getDesignById(caller, designId);

  if (design.status !== "ready") {
    throw new Error("Only approved catalog designs can be added to a print request.");
  }

  return design;
}

function buildFirestoreQueryConstraints(plan: PrintRequestQueryPlan): QueryConstraint[] {
  return [
    ...plan.filters.map((filter) => where(filter.field, filter.operator, filter.value)),
    ...plan.orderBy.map((order) => orderBy(order.field, order.direction)),
  ];
}

function getInternalPrintRequestCounterRef() {
  return doc(firestoreCollectionService.getCountersCollection(), INTERNAL_PRINT_REQUEST_COUNTER_ID);
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

function requestedSizesMatch(left: PrintRequestItem, right: { printWidthInches: number; printHeightInches: number }) {
  return left.printWidthInches === right.printWidthInches && left.printHeightInches === right.printHeightInches;
}

export const printRequestService = {
  async listPrintRequests(
    caller: User,
    options: PrintRequestListQueryOptions = {},
  ): Promise<PrintRequest[]> {
    if (!permissionService.canViewPrintRequests(caller)) {
      return [];
    }

    const requestsQuery = query(
      firestoreCollectionService.getPrintRequestsCollection(),
      ...buildFirestoreQueryConstraints(buildPrintRequestListQueryPlan(options)),
    );
    const snapshot = await getDocs(requestsQuery);

    return snapshot.docs.map((requestDoc) =>
      mapPrintRequestData(requestDoc.id, requestDoc.data() as PrintRequestDocumentData),
    );
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

    const itemLists = await Promise.all(
      uniquePrintRequestIds.map((printRequestId) =>
        this.listPrintRequestItems(caller, printRequestId),
      ),
    );

    return buildPrintRequestItemSummaries(itemLists.flat());
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
    const snapshot = await getDocs(itemsQuery);

    return sortPrintRequestItemsForDisplay(
      snapshot.docs.map((itemDoc) =>
        mapPrintRequestItemData(itemDoc.id, itemDoc.data() as PrintRequestItemDocumentData),
      ),
    );
  },

  async listCustomers(caller: User, options: CustomerListQueryOptions = {}): Promise<Customer[]> {
    if (!permissionService.canViewPrintRequests(caller)) {
      return [];
    }

    const customersQuery = query(
      firestoreCollectionService.getCustomersCollection(),
      ...buildFirestoreQueryConstraints(buildCustomerListQueryPlan(options)),
    );
    const snapshot = await getDocs(customersQuery);

    return snapshot.docs.map((customerDoc) =>
      mapCustomerData(customerDoc.id, customerDoc.data() as CustomerDocumentData),
    );
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

    await setDoc(requestRef, payload);

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

    const requestRef = await runTransaction(
      firestoreCollectionService.getPrintRequestsCollection().firestore,
      (transaction) => createInternalPrintRequestInTransaction(transaction, caller.id, input),
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

    const requestRef = await runTransaction(
      firestoreCollectionService.getPrintRequestsCollection().firestore,
      (transaction) => createCustomerPrintRequestInTransaction(transaction, caller.id, input),
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
    await updateDoc(requestRef, nextPayload);

    const updatedSnapshot = await getDoc(requestRef);
    return mapPrintRequestData(updatedSnapshot.id, updatedSnapshot.data() as PrintRequestDocumentData);
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
    await updateDoc(requestRef, nextPayload);

    const updatedSnapshot = await getDoc(requestRef);
    return mapPrintRequestData(updatedSnapshot.id, updatedSnapshot.data() as PrintRequestDocumentData);
  },

  async deletePrintRequest(caller: User, printRequestId: string): Promise<void> {
    if (!permissionService.canManagePrintRequests(caller)) {
      throw new Error("You do not have permission to delete print requests.");
    }

    await deleteDoc(doc(firestoreCollectionService.getPrintRequestsCollection(), printRequestId));
  },

  async addPrintRequestItem(
    caller: User,
    printRequestId: string,
    input: CreatePrintRequestItemInput,
  ): Promise<PrintRequestItem> {
    if (!permissionService.canManagePrintRequestItems(caller)) {
      throw new Error("You do not have permission to add print request items.");
    }

    if (!input.designId.trim()) {
      throw new Error("A design is required.");
    }

    if (!Number.isFinite(input.quantity) || input.quantity < 1) {
      throw new Error("Quantity must be at least 1.");
    }

    const [printRequest, design, currentItems] = await Promise.all([
      this.getPrintRequestById(caller, printRequestId),
      loadPrintableDesign(caller, input.designId),
      this.listPrintRequestItems(caller, printRequestId),
    ]);

    const itemRef = doc(firestoreCollectionService.getPrintRequestItemsCollection());
    const requestedSize = resolveRequestedItemSize(design, input);
    const payload = withoutUndefinedFields({
      id: itemRef.id,
      printRequestId,
      designId: design.id,
      quantity: input.quantity,
      printWidthInches: requestedSize.printWidthInches,
      printHeightInches: requestedSize.printHeightInches,
      sizeLabel: requestedSize.sizeLabel,
      sortOrder: typeof input.sortOrder === "number" && Number.isFinite(input.sortOrder)
        ? input.sortOrder
        : resolveNextSortOrder(currentItems),
      notes: input.notes?.trim() || undefined,
      status: "pending" as const,
      addedBy: caller.id,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });

    assertNoUndefinedFirestoreFields(payload, "Print request item payload");
    await setDoc(itemRef, payload);

    await updateDoc(doc(firestoreCollectionService.getPrintRequestsCollection(), printRequestId), {
      itemCount: printRequest.itemCount + 1,
      updatedBy: caller.id,
      updatedAt: serverTimestamp(),
    });

    // requestCount / lastRequestedAt are updated by Cloud Function onPrintRequestItemCreated.

    const createdSnapshot = await getDoc(itemRef);
    return mapPrintRequestItemData(createdSnapshot.id, createdSnapshot.data() as PrintRequestItemDocumentData);
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

    const design = await loadPrintableDesign(caller, current.designId);
    const requestedSize = resolveRequestedItemSize(design, input, current);
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

    const payload = withoutUndefinedFields({
      quantity: input.quantity ?? current.quantity,
      printWidthInches: requestedSize.printWidthInches,
      printHeightInches: requestedSize.printHeightInches,
      sizeLabel: requestedSize.sizeLabel,
      notes: input.notes?.trim() || undefined,
      updatedAt: serverTimestamp(),
      ...statusFields,
    });

    assertNoUndefinedFirestoreFields(payload, "Print request item update payload");
    await updateDoc(itemRef, payload);

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

      await updateDoc(itemRef, {
        sortOrder: anchoredOrder,
        updatedBy: caller.id,
        updatedAt: serverTimestamp(),
      });
      duplicateSortOrder = anchoredOrder + 50;
    }

    const createdItem = await this.addPrintRequestItem(caller, item.printRequestId, {
      designId: item.designId,
      quantity: item.quantity,
      printWidthInches: item.printWidthInches,
      printHeightInches: item.printHeightInches,
      sortOrder: duplicateSortOrder,
    });

    return createdItem;
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

    await deleteDoc(itemRef);

    if (requestSnapshot.exists()) {
      const request = mapPrintRequestData(requestSnapshot.id, requestSnapshot.data() as PrintRequestDocumentData);
      await updateDoc(requestRef, {
        itemCount: Math.max(0, request.itemCount - 1),
        updatedBy: caller.id,
        updatedAt: serverTimestamp(),
      });
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
      }))
      .filter((selection) => selection.designId.length > 0);

    if (normalizedSelections.length === 0) {
      return;
    }

    await this.getPrintRequestById(caller, printRequestId);
    const currentItems = await this.listPrintRequestItems(caller, printRequestId);

    for (const selection of normalizedSelections) {
      if (!Number.isFinite(selection.quantity) || selection.quantity < 1) {
        throw new Error("Quantity must be at least 1.");
      }

      const design = await loadPrintableDesign(caller, selection.designId);
      const requestedSize = resolveRequestedItemSize(design, {});
      const existingItem = currentItems.find(
        (item) => item.designId === selection.designId && requestedSizesMatch(item, requestedSize),
      );

      if (existingItem) {
        if (existingItem.quantity !== selection.quantity) {
          await this.updatePrintRequestItem(caller, existingItem.id, {
            quantity: selection.quantity,
          });
        }

        continue;
      }

      await this.addPrintRequestItem(caller, printRequestId, {
        designId: selection.designId,
        quantity: selection.quantity,
      });
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
