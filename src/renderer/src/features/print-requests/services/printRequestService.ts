import {
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  Timestamp,
  serverTimestamp,
  setDoc,
  updateDoc,
  type DocumentData,
} from "firebase/firestore";

import { mapFirestoreTimestamp } from "../../firebase/utils/firestoreTimestamp";
import { assertNoUndefinedFirestoreFields, withoutUndefinedFields } from "../../firebase/utils/firestoreDocument";
import { firestoreCollectionService } from "../../firebase/services/firestoreCollectionService";
import { permissionService } from "../../permissions/services/permissionService";
import type { User } from "../../users/types/user.types";
import { designService } from "../../designs/services/designService";
import type { Customer } from "../../../../../../shared/types/customer/customer.types";
import type { PrintRequestItemStatus } from "../../../../../../shared/types/printRequest/printRequest.enums";
import type { PrintRequest, PrintRequestItem } from "../../../../../../shared/types/printRequest/printRequest.types";

export interface CreatePrintRequestInput {
  name: string;
  customerId?: string;
  isInternal?: boolean;
  notes?: string;
}

export interface UpdatePrintRequestInput {
  name?: string;
  customerId?: string;
  isInternal?: boolean;
  status?: PrintRequest["status"];
  notes?: string;
}

export interface CreatePrintRequestItemInput {
  designId: string;
  quantity: number;
  notes?: string;
}

export interface UpdatePrintRequestItemInput {
  quantity?: number;
  notes?: string;
  status?: PrintRequestItemStatus;
}

export interface PrintRequestDesignSelectionInput {
  designId: string;
  quantity: number;
}

export interface PrintRequestItemSummary {
  totalQuantity: number;
  uniqueDesignCount: number;
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
  status?: unknown;
  itemCount?: unknown;
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
  email?: unknown;
  notes?: unknown;
  isGuest?: unknown;
  totalPrintRequests?: unknown;
  totalRequests?: unknown;
  totalApprovedRequests?: unknown;
  createdAt?: unknown;
  updatedAt?: unknown;
}

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
    status: data.status as PrintRequest["status"],
    itemCount: data.itemCount,
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
  const createdAt = resolveRequiredTimestamp(data.createdAt);
  const updatedAt = resolveRequiredTimestamp(data.updatedAt);

  if (
    typeof data.printRequestId !== "string" ||
    typeof data.designId !== "string" ||
    typeof data.quantity !== "number" ||
    typeof data.status !== "string" ||
    typeof data.addedBy !== "string" ||
    createdAt === undefined ||
    updatedAt === undefined
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
    notes: typeof data.notes === "string" ? data.notes : undefined,
    status: data.status as PrintRequestItemStatus,
    addedBy: data.addedBy,
    printedAt: resolveRequiredTimestamp(data.printedAt),
    printedBy: typeof data.printedBy === "string" ? data.printedBy : undefined,
    completedAt: resolveRequiredTimestamp(data.completedAt),
    createdAt,
    updatedAt,
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
    email: typeof data.email === "string" ? data.email : undefined,
    notes: typeof data.notes === "string" ? data.notes : undefined,
    isGuest: data.isGuest,
    totalPrintRequests: data.totalPrintRequests,
    totalRequests: typeof data.totalRequests === "number" ? data.totalRequests : undefined,
    totalApprovedRequests:
      typeof data.totalApprovedRequests === "number" ? data.totalApprovedRequests : undefined,
    createdAt,
    updatedAt,
  };
}

function sortByUpdatedAtDesc<T extends { updatedAt: { toMillis: () => number } }>(items: T[]): T[] {
  return [...items].sort((left, right) => right.updatedAt.toMillis() - left.updatedAt.toMillis());
}

function buildPrintRequestItemSummaries(items: PrintRequestItem[]): Record<string, PrintRequestItemSummary> {
  const designIdsByRequestId = new Map<string, Set<string>>();
  const totalQuantityByRequestId = new Map<string, number>();

  for (const item of items) {
    if (!designIdsByRequestId.has(item.printRequestId)) {
      designIdsByRequestId.set(item.printRequestId, new Set<string>());
    }

    designIdsByRequestId.get(item.printRequestId)?.add(item.designId);

    const quantity = Number.isFinite(item.quantity) ? item.quantity : 0;
    totalQuantityByRequestId.set(
      item.printRequestId,
      (totalQuantityByRequestId.get(item.printRequestId) ?? 0) + quantity,
    );
  }

  return Object.fromEntries(
    [...designIdsByRequestId.entries()].map(([printRequestId, designIds]) => [
      printRequestId,
      {
        totalQuantity: totalQuantityByRequestId.get(printRequestId) ?? 0,
        uniqueDesignCount: designIds.size,
      },
    ]),
  );
}

function buildPrintRequestPayload(input: CreatePrintRequestInput, callerId: string) {
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
    notes: input.notes?.trim() || undefined,
    createdBy: callerId,
    updatedBy: callerId,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
}

function buildPrintRequestItemSizeLabel(design: Awaited<ReturnType<typeof designService.getDesignById>>) {
  const width = design.printWidthInches;
  const height = design.printHeightInches;

  if (typeof width === "number" && typeof height === "number") {
    return `${width.toFixed(2)} x ${height.toFixed(2)} in`;
  }

  return undefined;
}

async function loadPrintableDesign(caller: User, designId: string) {
  const design = await designService.getDesignById(caller, designId);

  if (design.status !== "ready") {
    throw new Error("Only approved catalog designs can be added to a print request.");
  }

  return design;
}

export const printRequestService = {
  async listPrintRequests(caller: User): Promise<PrintRequest[]> {
    if (!permissionService.canViewPrintRequests(caller)) {
      return [];
    }

    const snapshot = await getDocs(firestoreCollectionService.getPrintRequestsCollection());
    const requests = snapshot.docs.map((requestDoc) =>
      mapPrintRequestData(requestDoc.id, requestDoc.data() as PrintRequestDocumentData),
    );

    return sortByUpdatedAtDesc(requests);
  },

  async listPrintRequestItemSummaries(caller: User): Promise<Record<string, PrintRequestItemSummary>> {
    if (!permissionService.canViewPrintRequests(caller)) {
      return {};
    }

    const snapshot = await getDocs(firestoreCollectionService.getPrintRequestItemsCollection());
    const items = snapshot.docs.map((itemDoc) =>
      mapPrintRequestItemData(itemDoc.id, itemDoc.data() as PrintRequestItemDocumentData),
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

  async listPrintRequestItems(caller: User, printRequestId: string): Promise<PrintRequestItem[]> {
    if (!permissionService.canViewPrintRequests(caller)) {
      return [];
    }

    const snapshot = await getDocs(firestoreCollectionService.getPrintRequestItemsCollection());
    const items = snapshot.docs
      .map((itemDoc) => mapPrintRequestItemData(itemDoc.id, itemDoc.data() as PrintRequestItemDocumentData))
      .filter((item) => item.printRequestId === printRequestId);

    return sortByUpdatedAtDesc(items);
  },

  async listCustomers(caller: User): Promise<Customer[]> {
    if (!permissionService.canViewPrintRequests(caller)) {
      return [];
    }

    const snapshot = await getDocs(firestoreCollectionService.getCustomersCollection());
    const customers = snapshot.docs.map((customerDoc) =>
      mapCustomerData(customerDoc.id, customerDoc.data() as CustomerDocumentData),
    );

    return [...customers].sort((left, right) => left.displayName.localeCompare(right.displayName));
  },

  async createPrintRequest(caller: User, input: CreatePrintRequestInput): Promise<PrintRequest> {
    if (!permissionService.canManagePrintRequests(caller)) {
      throw new Error("You do not have permission to create print requests.");
    }

    const name = input.name.trim();
    if (!name) {
      throw new Error("Print request name is required.");
    }

    const requestRef = doc(firestoreCollectionService.getPrintRequestsCollection());
    const payload = buildPrintRequestPayload({ ...input, name }, caller.id);

    await setDoc(requestRef, payload);

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

    const [printRequest, design] = await Promise.all([
      this.getPrintRequestById(caller, printRequestId),
      loadPrintableDesign(caller, input.designId),
    ]);

    const itemRef = doc(firestoreCollectionService.getPrintRequestItemsCollection());
    const payload = withoutUndefinedFields({
      id: itemRef.id,
      printRequestId,
      designId: design.id,
      quantity: input.quantity,
      printWidthInches: design.printWidthInches,
      printHeightInches: design.printHeightInches,
      sizeLabel: buildPrintRequestItemSizeLabel(design),
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

    await updateDoc(doc(firestoreCollectionService.getDesignsCollection(), design.id), {
      requestCount: (design.requestCount ?? 0) + 1,
      lastRequestedAt: serverTimestamp(),
    });

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

    const nextStatus = input.status ?? current.status;
    const statusFields =
      nextStatus === "printed"
        ? { printedAt: serverTimestamp(), printedBy: caller.id, completedAt: current.completedAt }
        : nextStatus === "done"
          ? { printedAt: current.printedAt ?? serverTimestamp(), printedBy: current.printedBy ?? caller.id, completedAt: serverTimestamp() }
          : nextStatus === "canceled"
            ? { printedAt: current.printedAt, printedBy: current.printedBy, completedAt: current.completedAt }
            : {
                printedAt: current.printedAt,
                printedBy: current.printedBy,
                completedAt: current.completedAt,
              };

    const payload = withoutUndefinedFields({
      quantity: input.quantity ?? current.quantity,
      notes: input.notes?.trim() || undefined,
      status: nextStatus,
      updatedAt: serverTimestamp(),
      ...statusFields,
    });

    assertNoUndefinedFirestoreFields(payload, "Print request item update payload");
    await updateDoc(itemRef, payload);

    const updatedSnapshot = await getDoc(itemRef);
    return mapPrintRequestItemData(updatedSnapshot.id, updatedSnapshot.data() as PrintRequestItemDocumentData);
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

    const currentItemsByDesignId = new Map(currentItems.map((item) => [item.designId, item]));

    for (const selection of normalizedSelections) {
      if (!Number.isFinite(selection.quantity) || selection.quantity < 1) {
        throw new Error("Quantity must be at least 1.");
      }

      const existingItem = currentItemsByDesignId.get(selection.designId);

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
