import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  Timestamp,
  updateDoc,
  where,
  type DocumentData,
} from 'firebase/firestore';
import { httpsCallable } from 'firebase/functions';

import type {
  CreatePortalPrintRequestRequest,
  CreatePortalPrintRequestResponse,
} from '@fresh-prints/shared/types/printRequest/createPortalPrintRequest.types';
import type { PrintRequest, PrintRequestItem } from '@fresh-prints/shared/types/printRequest/printRequest.types';
import type { ShowAllocationStatus } from '@fresh-prints/shared/types/showAllocation/showAllocation.enums';
import {
  formatPrintRequestItemSizeLabel,
  resolveInitialPrintRequestItemSize,
} from '@fresh-prints/shared/utils/printRequestItemSizing';
import { resolveCatalogAddAction } from '@fresh-prints/shared/utils/currentRequestAggregates';

import { getPortalDb, getPortalFunctions } from '../../../lib/firebase/client';
import { resolveDesignDocumentTimestamps } from '../../firebase/utils/mapFirestoreTimestamp';
import { portalAuthService } from '../../auth/services/authService';

interface PrintRequestDocumentData extends DocumentData {
  name?: unknown;
  customerId?: unknown;
  isInternal?: unknown;
  requestOrigin?: unknown;
  status?: unknown;
  itemCount?: unknown;
  notes?: unknown;
  createdBy?: unknown;
  updatedBy?: unknown;
  createdAt?: unknown;
  updatedAt?: unknown;
}

interface PrintRequestItemDocumentData extends DocumentData {
  printRequestId?: unknown;
  designId?: unknown;
  sourceType?: unknown;
  customerUploadId?: unknown;
  titleSnapshot?: unknown;
  quantity?: unknown;
  printWidthInches?: unknown;
  printHeightInches?: unknown;
  sizeLabel?: unknown;
  sortOrder?: unknown;
  notes?: unknown;
  status?: unknown;
  addedBy?: unknown;
  createdAt?: unknown;
  updatedAt?: unknown;
}

interface DesignDocumentData extends DocumentData {
  status?: unknown;
  title?: unknown;
  width?: unknown;
  height?: unknown;
  thumbnailPath?: unknown;
  previewPath?: unknown;
  printWidthInches?: unknown;
  printHeightInches?: unknown;
}

interface PortalShowAllocationRecord {
  printRequestId: string;
  allocatedQuantity: number;
  status: ShowAllocationStatus;
}

interface ShowAllocationDocumentData extends DocumentData {
  printRequestId?: unknown;
  allocatedQuantity?: unknown;
  status?: unknown;
}

function chunkValues<T>(values: T[], chunkSize: number): T[][] {
  const chunks: T[][] = [];

  for (let index = 0; index < values.length; index += chunkSize) {
    chunks.push(values.slice(index, index + chunkSize));
  }

  return chunks;
}

function mapShowAllocationRecord(data: ShowAllocationDocumentData): PortalShowAllocationRecord {
  if (
    typeof data.printRequestId !== 'string' ||
    typeof data.allocatedQuantity !== 'number' ||
    typeof data.status !== 'string'
  ) {
    throw new Error('Show allocation data is incomplete.');
  }

  return {
    printRequestId: data.printRequestId,
    allocatedQuantity: data.allocatedQuantity,
    status: data.status as ShowAllocationStatus,
  };
}

function mapPrintRequest(printRequestId: string, data: PrintRequestDocumentData): PrintRequest {
  // After local writes with serverTimestamp(), one or both audit fields can be null in the
  // client cache until the server ack arrives — same fallback used for print request items.
  const resolvedTimestamps = resolveDesignDocumentTimestamps(data);
  const fallbackNow = Timestamp.now();
  const createdAt = resolvedTimestamps?.createdAt ?? fallbackNow;
  const updatedAt = resolvedTimestamps?.updatedAt ?? fallbackNow;

  if (
    typeof data.name !== 'string' ||
    typeof data.isInternal !== 'boolean' ||
    typeof data.status !== 'string' ||
    typeof data.itemCount !== 'number' ||
    typeof data.createdBy !== 'string' ||
    typeof data.updatedBy !== 'string'
  ) {
    throw new Error('Print request data is incomplete.');
  }

  return {
    id: printRequestId,
    name: data.name,
    customerId: typeof data.customerId === 'string' ? data.customerId : undefined,
    isInternal: data.isInternal,
    requestOrigin:
      data.requestOrigin === 'studio_internal' ||
      data.requestOrigin === 'studio_customer' ||
      data.requestOrigin === 'portal_customer'
        ? data.requestOrigin
        : undefined,
    status: data.status as PrintRequest['status'],
    itemCount: data.itemCount,
    notes: typeof data.notes === 'string' ? data.notes : undefined,
    createdBy: data.createdBy,
    updatedBy: data.updatedBy,
    createdAt,
    updatedAt,
  };
}

function mapPrintRequestItem(itemId: string, data: PrintRequestItemDocumentData): PrintRequestItem {
  // Fresh writes with serverTimestamp() can leave both audit fields pending/null in the
  // local cache — same race as mapPrintRequest after "Add to request" seed persist.
  const resolvedTimestamps = resolveDesignDocumentTimestamps(data);
  const fallbackNow = Timestamp.now();
  const createdAt = resolvedTimestamps?.createdAt ?? fallbackNow;
  const updatedAt = resolvedTimestamps?.updatedAt ?? fallbackNow;

  const sourceType =
    data.sourceType === 'customer_upload' || data.sourceType === 'catalog_design'
      ? data.sourceType
      : undefined;
  const customerUploadId =
    typeof data.customerUploadId === 'string' && data.customerUploadId.trim()
      ? data.customerUploadId.trim()
      : undefined;
  const isUploadItem = sourceType === 'customer_upload' || Boolean(customerUploadId);
  const designId =
    typeof data.designId === 'string' && data.designId.trim() ? data.designId.trim() : undefined;

  if (
    typeof data.printRequestId !== 'string' ||
    typeof data.quantity !== 'number' ||
    typeof data.status !== 'string' ||
    typeof data.addedBy !== 'string'
  ) {
    throw new Error('Print request item data is incomplete.');
  }

  if (isUploadItem) {
    if (!customerUploadId) {
      throw new Error('Print request item data is incomplete.');
    }
  } else if (!designId) {
    throw new Error('Print request item data is incomplete.');
  }

  return {
    id: itemId,
    printRequestId: data.printRequestId,
    ...(designId ? { designId } : {}),
    ...(sourceType ? { sourceType } : isUploadItem ? { sourceType: 'customer_upload' as const } : {}),
    ...(customerUploadId ? { customerUploadId } : {}),
    ...(typeof data.titleSnapshot === 'string' && data.titleSnapshot.trim()
      ? { titleSnapshot: data.titleSnapshot.trim() }
      : {}),
    quantity: data.quantity,
    printWidthInches: typeof data.printWidthInches === 'number' ? data.printWidthInches : undefined,
    printHeightInches: typeof data.printHeightInches === 'number' ? data.printHeightInches : undefined,
    sizeLabel: typeof data.sizeLabel === 'string' ? data.sizeLabel : undefined,
    sortOrder: typeof data.sortOrder === 'number' ? data.sortOrder : undefined,
    notes: typeof data.notes === 'string' ? data.notes : undefined,
    status: data.status as PrintRequestItem['status'],
    addedBy: data.addedBy,
    createdAt,
    updatedAt,
  };
}

export function printRequestItemHasCustomerUpload(item: Pick<PrintRequestItem, 'sourceType' | 'customerUploadId'>): boolean {
  return item.sourceType === 'customer_upload' || Boolean(item.customerUploadId);
}

function resolveNextSortOrder(items: PrintRequestItem[]): number {
  const maxSortOrder = items.reduce((max, item) => Math.max(max, item.sortOrder ?? 0), 0);
  return maxSortOrder + 1;
}

function requestedSizesMatch(
  item: Pick<PrintRequestItem, 'printWidthInches' | 'printHeightInches'>,
  size: { printWidthInches: number; printHeightInches: number },
): boolean {
  return item.printWidthInches === size.printWidthInches && item.printHeightInches === size.printHeightInches;
}

export const portalPrintRequestService = {
  async createPrintRequest(input: CreatePortalPrintRequestRequest = {}): Promise<CreatePortalPrintRequestResponse> {
    try {
      const createCallable = httpsCallable<
        CreatePortalPrintRequestRequest,
        CreatePortalPrintRequestResponse
      >(getPortalFunctions(), 'createPortalPrintRequest');
      const response = await createCallable(input);
      return response.data;
    } catch (error) {
      throw new Error(portalAuthService.getCallableErrorMessage(error));
    }
  },

  async listMyPrintRequests(customerId: string): Promise<PrintRequest[]> {
    const snapshot = await getDocs(
      query(
        collection(getPortalDb(), 'printRequests'),
        where('customerId', '==', customerId),
        orderBy('updatedAt', 'desc'),
      ),
    );

    return snapshot.docs.map((requestDoc) =>
      mapPrintRequest(requestDoc.id, requestDoc.data() as PrintRequestDocumentData),
    );
  },

  async listEditablePrintRequests(customerId: string): Promise<PrintRequest[]> {
    const requests = await this.listMyPrintRequests(customerId);
    return requests.filter((request) => request.status === 'draft' || request.status === 'editing');
  },

  async getPrintRequest(printRequestId: string): Promise<PrintRequest | null> {
    const snapshot = await getDoc(doc(getPortalDb(), 'printRequests', printRequestId));

    if (!snapshot.exists()) {
      return null;
    }

    return mapPrintRequest(snapshot.id, snapshot.data() as PrintRequestDocumentData);
  },

  async listPrintRequestItems(printRequestId: string): Promise<PrintRequestItem[]> {
    const snapshot = await getDocs(
      query(
        collection(getPortalDb(), 'printRequestItems'),
        where('printRequestId', '==', printRequestId),
        orderBy('updatedAt', 'desc'),
      ),
    );

    return snapshot.docs.flatMap((itemDoc) => {
      try {
        return [mapPrintRequestItem(itemDoc.id, itemDoc.data() as PrintRequestItemDocumentData)];
      } catch {
        // Skip a single malformed/pending doc instead of failing the whole selection load.
        return [];
      }
    });
  },

  async listPrintRequestItemsForRequests(printRequestIds: string[]): Promise<PrintRequestItem[]> {
    const uniquePrintRequestIds = [...new Set(printRequestIds.map((id) => id.trim()).filter(Boolean))];

    if (uniquePrintRequestIds.length === 0) {
      return [];
    }

    const itemLists = await Promise.all(
      chunkValues(uniquePrintRequestIds, 10).map(async (printRequestIdChunk) => {
        const snapshot = await getDocs(
          query(
            collection(getPortalDb(), 'printRequestItems'),
            where('printRequestId', 'in', printRequestIdChunk),
          ),
        );

        return snapshot.docs.flatMap((itemDoc) => {
          try {
            return [mapPrintRequestItem(itemDoc.id, itemDoc.data() as PrintRequestItemDocumentData)];
          } catch {
            return [];
          }
        });
      }),
    );

    return itemLists.flat();
  },

  async listShowAllocationsForPrintRequests(
    printRequestIds: string[],
  ): Promise<PortalShowAllocationRecord[]> {
    const uniquePrintRequestIds = [...new Set(printRequestIds.map((id) => id.trim()).filter(Boolean))];

    if (uniquePrintRequestIds.length === 0) {
      return [];
    }

    const allocationLists = await Promise.all(
      chunkValues(uniquePrintRequestIds, 10).map(async (printRequestIdChunk) => {
        const snapshot = await getDocs(
          query(
            collection(getPortalDb(), 'showAllocations'),
            where('printRequestId', 'in', printRequestIdChunk),
          ),
        );

        return snapshot.docs.map((allocationDoc) =>
          mapShowAllocationRecord(allocationDoc.data() as ShowAllocationDocumentData),
        );
      }),
    );

    return allocationLists.flat();
  },

  async getReadyDesign(designId: string) {
    const snapshot = await getDoc(doc(getPortalDb(), 'designs', designId));

    if (!snapshot.exists()) {
      throw new Error('Design not found.');
    }

    const data = snapshot.data() as DesignDocumentData;

    if (data.status !== 'ready' || typeof data.title !== 'string') {
      throw new Error('Design is not available for print requests.');
    }

    if (typeof data.width !== 'number' || typeof data.height !== 'number') {
      throw new Error('Design dimensions are required to add this design.');
    }

    return {
      id: snapshot.id,
      title: data.title,
      width: data.width,
      height: data.height,
      thumbnailPath: typeof data.thumbnailPath === 'string' ? data.thumbnailPath : undefined,
      previewPath: typeof data.previewPath === 'string' ? data.previewPath : undefined,
      printWidthInches: typeof data.printWidthInches === 'number' ? data.printWidthInches : undefined,
      printHeightInches: typeof data.printHeightInches === 'number' ? data.printHeightInches : undefined,
    };
  },

  async getDesignSummariesForItems(items: PrintRequestItem[]) {
    const uniqueDesignIds = [
      ...new Set(
        items
          .map((item) => item.designId)
          .filter((designId): designId is string => Boolean(designId)),
      ),
    ];
    const summaries = await Promise.all(
      uniqueDesignIds.map(async (designId) => {
        try {
          const design = await this.getReadyDesign(designId);
          return [designId, design] as const;
        } catch {
          return [designId, null] as const;
        }
      }),
    );

    return new Map(summaries);
  },

  async getUploadSummariesForItems(items: PrintRequestItem[]) {
    const uploadIds = [
      ...new Set(
        items
          .filter(printRequestItemHasCustomerUpload)
          .map((item) => item.customerUploadId)
          .filter((id): id is string => Boolean(id)),
      ),
    ];

    const { customerUploadService } = await import(
      '../../customer-uploads/services/customerUploadService'
    );

    const summaries = await Promise.all(
      uploadIds.map(async (uploadId) => {
        try {
          const upload = await customerUploadService.getUpload(uploadId);
          return [uploadId, upload] as const;
        } catch {
          return [uploadId, null] as const;
        }
      }),
    );

    return new Map(summaries);
  },

  /**
   * Catalog browse add: create a new line, or increment the primary (earliest)
   * catalog-backed variant when the design is already on the request.
   */
  async addOrIncrementCatalogDesign(input: {
    printRequestId: string;
    designId: string;
    userId: string;
    quantityDelta?: number;
  }): Promise<{ kind: 'created' | 'incremented'; item: PrintRequestItem }> {
    const delta = input.quantityDelta ?? 1;
    if (!Number.isFinite(delta) || delta < 1) {
      throw new Error('Quantity must be at least 1.');
    }

    const currentItems = await this.listPrintRequestItems(input.printRequestId);
    const action = resolveCatalogAddAction(
      currentItems.map((entry) => ({
        id: entry.id,
        designId: entry.designId,
        customerUploadId: entry.customerUploadId,
        sourceType: entry.sourceType,
        quantity: entry.quantity,
        createdAtMs:
          entry.createdAt && typeof entry.createdAt.toMillis === 'function'
            ? entry.createdAt.toMillis()
            : 0,
      })),
      input.designId,
    );

    if (action.kind === 'increment') {
      const nextQuantity = action.nextQuantity + (delta - 1);
      await this.updatePrintRequestItemQuantity({
        itemId: action.itemId,
        printRequestId: input.printRequestId,
        quantity: nextQuantity,
        userId: input.userId,
      });
      const items = await this.listPrintRequestItems(input.printRequestId);
      const item = items.find((entry) => entry.id === action.itemId);
      if (!item) {
        throw new Error('Unable to update request item quantity.');
      }
      return { kind: 'incremented', item };
    }

    const item = await this.addPrintRequestItem({
      printRequestId: input.printRequestId,
      designId: input.designId,
      quantity: delta,
      userId: input.userId,
    });
    return { kind: 'created', item };
  },

  /**
   * Decrease primary catalog variant qty by 1. Removes the primary line at qty 1.
   * Duplicate size variants are left unchanged.
   */
  async decrementPrimaryCatalogDesign(input: {
    printRequestId: string;
    designId: string;
    userId: string;
  }): Promise<{ kind: 'decremented' | 'removed'; itemId: string }> {
    const currentItems = await this.listPrintRequestItems(input.printRequestId);
    const likes = currentItems.map((entry) => ({
      id: entry.id,
      designId: entry.designId,
      customerUploadId: entry.customerUploadId,
      sourceType: entry.sourceType,
      quantity: entry.quantity,
      createdAtMs:
        entry.createdAt && typeof entry.createdAt.toMillis === 'function'
          ? entry.createdAt.toMillis()
          : 0,
    }));
    const action = resolveCatalogAddAction(likes, input.designId);
    if (action.kind !== 'increment') {
      throw new Error('This design is not in your Current Request.');
    }

    const primary = currentItems.find((entry) => entry.id === action.itemId);
    if (!primary) {
      throw new Error('Unable to update request item quantity.');
    }

    if (primary.quantity <= 1) {
      await this.removePrintRequestItem({
        itemId: primary.id,
        printRequestId: input.printRequestId,
        userId: input.userId,
      });
      return { kind: 'removed', itemId: primary.id };
    }

    await this.updatePrintRequestItemQuantity({
      itemId: primary.id,
      printRequestId: input.printRequestId,
      quantity: primary.quantity - 1,
      userId: input.userId,
    });
    return { kind: 'decremented', itemId: primary.id };
  },

  /**
   * Set the primary catalog variant quantity to an absolute value (≥ 1).
   * Duplicate size variants are left unchanged.
   */
  async setPrimaryCatalogDesignQuantity(input: {
    printRequestId: string;
    designId: string;
    quantity: number;
    userId: string;
  }): Promise<{ itemId: string; quantity: number }> {
    const nextQuantity = Math.max(1, Math.floor(input.quantity));
    const currentItems = await this.listPrintRequestItems(input.printRequestId);
    const likes = currentItems.map((entry) => ({
      id: entry.id,
      designId: entry.designId,
      customerUploadId: entry.customerUploadId,
      sourceType: entry.sourceType,
      quantity: entry.quantity,
      createdAtMs:
        entry.createdAt && typeof entry.createdAt.toMillis === 'function'
          ? entry.createdAt.toMillis()
          : 0,
    }));
    const action = resolveCatalogAddAction(likes, input.designId);
    if (action.kind !== 'increment') {
      throw new Error('This design is not in your Current Request.');
    }

    await this.updatePrintRequestItemQuantity({
      itemId: action.itemId,
      printRequestId: input.printRequestId,
      quantity: nextQuantity,
      userId: input.userId,
    });
    return { itemId: action.itemId, quantity: nextQuantity };
  },

  /**
   * Remove every catalog-backed line for a design (all size variants).
   */
  async removeCatalogDesignFromRequest(input: {
    printRequestId: string;
    designId: string;
    userId: string;
  }): Promise<{ removedItemIds: string[] }> {
    const trimmed = input.designId.trim();
    const currentItems = await this.listPrintRequestItems(input.printRequestId);
    const toRemove = currentItems.filter(
      (entry) =>
        entry.sourceType !== 'customer_upload' &&
        typeof entry.designId === 'string' &&
        entry.designId.trim() === trimmed,
    );

    for (const item of toRemove) {
      await this.removePrintRequestItem({
        itemId: item.id,
        printRequestId: input.printRequestId,
        userId: input.userId,
      });
    }

    return { removedItemIds: toRemove.map((item) => item.id) };
  },

  async addPrintRequestItem(input: {
    printRequestId: string;
    designId: string;
    quantity: number;
    userId: string;
    printWidthInches?: number;
    printHeightInches?: number;
    sortOrder?: number;
  }): Promise<PrintRequestItem> {
    if (!Number.isFinite(input.quantity) || input.quantity < 1) {
      throw new Error('Quantity must be at least 1.');
    }

    const [printRequest, design, currentItems] = await Promise.all([
      this.getPrintRequest(input.printRequestId),
      this.getReadyDesign(input.designId),
      this.listPrintRequestItems(input.printRequestId),
    ]);

    if (!printRequest) {
      throw new Error('Print request not found.');
    }

    if (printRequest.status !== 'draft' && printRequest.status !== 'editing') {
      throw new Error('This print request can no longer be edited.');
    }

    const defaultSize = resolveInitialPrintRequestItemSize({
      pixelWidth: design.width,
      pixelHeight: design.height,
      defaultPrintWidthInches: design.printWidthInches,
    });
    const printWidthInches = input.printWidthInches ?? defaultSize.printWidthInches;
    const printHeightInches = input.printHeightInches ?? defaultSize.printHeightInches;

    const itemRef = doc(collection(getPortalDb(), 'printRequestItems'));
    const payload = {
      id: itemRef.id,
      printRequestId: input.printRequestId,
      designId: design.id,
      quantity: input.quantity,
      printWidthInches,
      printHeightInches,
      sizeLabel: formatPrintRequestItemSizeLabel(printWidthInches, printHeightInches),
      sortOrder: input.sortOrder ?? resolveNextSortOrder(currentItems),
      status: 'pending' as const,
      addedBy: input.userId,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    };

    await setDoc(itemRef, payload);
    await updateDoc(doc(getPortalDb(), 'printRequests', input.printRequestId), {
      itemCount: printRequest.itemCount + 1,
      updatedBy: input.userId,
      updatedAt: serverTimestamp(),
    });

    const now = Timestamp.now();
    return mapPrintRequestItem(itemRef.id, {
      ...payload,
      createdAt: now,
      updatedAt: now,
    });
  },

  async addCustomerUploadPrintRequestItem(input: {
    printRequestId: string;
    customerUploadId: string;
    quantity: number;
    userId: string;
    printWidthInches?: number;
    printHeightInches?: number;
    sortOrder?: number;
    titleSnapshot?: string;
  }): Promise<PrintRequestItem> {
    if (!Number.isFinite(input.quantity) || input.quantity < 1) {
      throw new Error('Quantity must be at least 1.');
    }

    const customerUploadId = input.customerUploadId.trim();
    if (!customerUploadId) {
      throw new Error('A customer upload is required.');
    }

    const [printRequest, currentItems] = await Promise.all([
      this.getPrintRequest(input.printRequestId),
      this.listPrintRequestItems(input.printRequestId),
    ]);

    if (!printRequest) {
      throw new Error('Print request not found.');
    }

    if (printRequest.status !== 'draft' && printRequest.status !== 'editing') {
      throw new Error('This print request can no longer be edited.');
    }

    const printWidthInches = input.printWidthInches;
    const printHeightInches = input.printHeightInches;
    const itemRef = doc(collection(getPortalDb(), 'printRequestItems'));
    const payload = {
      id: itemRef.id,
      printRequestId: input.printRequestId,
      sourceType: 'customer_upload' as const,
      customerUploadId,
      ...(typeof input.titleSnapshot === 'string' && input.titleSnapshot.trim()
        ? { titleSnapshot: input.titleSnapshot.trim() }
        : {}),
      quantity: input.quantity,
      ...(typeof printWidthInches === 'number' ? { printWidthInches } : {}),
      ...(typeof printHeightInches === 'number' ? { printHeightInches } : {}),
      ...(typeof printWidthInches === 'number' && typeof printHeightInches === 'number'
        ? { sizeLabel: formatPrintRequestItemSizeLabel(printWidthInches, printHeightInches) }
        : {}),
      sortOrder: input.sortOrder ?? resolveNextSortOrder(currentItems),
      status: 'pending' as const,
      addedBy: input.userId,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    };

    await setDoc(itemRef, payload);
    await updateDoc(doc(getPortalDb(), 'printRequests', input.printRequestId), {
      itemCount: printRequest.itemCount + 1,
      updatedBy: input.userId,
      updatedAt: serverTimestamp(),
    });

    const now = Timestamp.now();
    return mapPrintRequestItem(itemRef.id, {
      ...payload,
      createdAt: now,
      updatedAt: now,
    });
  },

  async updatePrintRequestItem(input: {
    itemId: string;
    printRequestId: string;
    userId: string;
    quantity?: number;
    printWidthInches?: number;
    printHeightInches?: number;
  }): Promise<void> {
    const printRequest = await this.getPrintRequest(input.printRequestId);

    if (!printRequest) {
      throw new Error('Print request not found.');
    }

    if (printRequest.status !== 'draft' && printRequest.status !== 'editing') {
      throw new Error('This print request can no longer be edited.');
    }

    const itemSnapshot = await getDoc(doc(getPortalDb(), 'printRequestItems', input.itemId));

    if (!itemSnapshot.exists()) {
      throw new Error('Print request item not found.');
    }

    const current = mapPrintRequestItem(itemSnapshot.id, itemSnapshot.data() as PrintRequestItemDocumentData);
    const nextQuantity = input.quantity ?? current.quantity;
    const nextWidth = input.printWidthInches ?? current.printWidthInches;
    const nextHeight = input.printHeightInches ?? current.printHeightInches;

    if (!Number.isFinite(nextQuantity) || nextQuantity < 1) {
      throw new Error('Quantity must be at least 1.');
    }

    if (typeof nextWidth !== 'number' || typeof nextHeight !== 'number') {
      throw new Error('Print size is required.');
    }

    await updateDoc(doc(getPortalDb(), 'printRequestItems', input.itemId), {
      quantity: nextQuantity,
      printWidthInches: nextWidth,
      printHeightInches: nextHeight,
      sizeLabel: formatPrintRequestItemSizeLabel(nextWidth, nextHeight),
      updatedAt: serverTimestamp(),
    });

    await updateDoc(doc(getPortalDb(), 'printRequests', input.printRequestId), {
      updatedBy: input.userId,
      updatedAt: serverTimestamp(),
    });
  },

  async duplicatePrintRequestItem(input: {
    itemId: string;
    printRequestId: string;
    userId: string;
  }): Promise<{
    itemId: string;
    printRequestId: string;
    sourceType: 'catalog_design' | 'customer_upload';
    designId?: string;
    customerUploadId?: string;
  }> {
    const callable = httpsCallable<
      { printRequestId: string; itemId: string },
      {
        itemId: string;
        printRequestId: string;
        sourceType: 'catalog_design' | 'customer_upload';
        designId?: string;
        customerUploadId?: string;
      }
    >(getPortalFunctions(), 'duplicatePortalPrintRequestItem');

    const response = await callable({
      printRequestId: input.printRequestId,
      itemId: input.itemId,
    });

    return response.data;
  },

  async savePrintRequestDesignSelections(input: {
    printRequestId: string;
    userId: string;
    selections: Array<{ designId: string; quantity: number }>;
  }): Promise<void> {
    const normalizedSelections = input.selections
      .map((selection) => ({
        designId: selection.designId.trim(),
        quantity: Number(selection.quantity),
      }))
      .filter((selection) => selection.designId.length > 0);

    if (normalizedSelections.length === 0) {
      return;
    }

    for (const selection of normalizedSelections) {
      if (!Number.isFinite(selection.quantity) || selection.quantity < 1) {
        throw new Error('Quantity must be at least 1.');
      }
    }

    const [printRequest, currentItems] = await Promise.all([
      this.getPrintRequest(input.printRequestId),
      this.listPrintRequestItems(input.printRequestId),
    ]);

    if (!printRequest) {
      throw new Error('Print request not found.');
    }

    if (printRequest.status !== 'draft' && printRequest.status !== 'editing') {
      throw new Error('This print request can no longer be edited.');
    }

    const uniqueDesignIds = [...new Set(normalizedSelections.map((selection) => selection.designId))];
    const designs = await Promise.all(uniqueDesignIds.map((designId) => this.getReadyDesign(designId)));
    const designById = new Map(designs.map((design) => [design.id, design]));

    type QuantityUpdate = { itemId: string; quantity: number; printWidthInches: number; printHeightInches: number };
    type ItemCreate = {
      designId: string;
      quantity: number;
      printWidthInches: number;
      printHeightInches: number;
      sortOrder: number;
    };

    const quantityUpdates: QuantityUpdate[] = [];
    const itemCreates: ItemCreate[] = [];
    let nextSortOrder = resolveNextSortOrder(currentItems);

    for (const selection of normalizedSelections) {
      const design = designById.get(selection.designId);

      if (!design) {
        throw new Error('Design is not available for print requests.');
      }

      const requestedSize = resolveInitialPrintRequestItemSize({
        pixelWidth: design.width,
        pixelHeight: design.height,
        defaultPrintWidthInches: design.printWidthInches,
      });
      const existingItem = currentItems.find(
        (item) => item.designId === selection.designId && requestedSizesMatch(item, requestedSize),
      );

      if (existingItem) {
        if (existingItem.quantity !== selection.quantity) {
          quantityUpdates.push({
            itemId: existingItem.id,
            quantity: selection.quantity,
            printWidthInches: existingItem.printWidthInches ?? requestedSize.printWidthInches,
            printHeightInches: existingItem.printHeightInches ?? requestedSize.printHeightInches,
          });
        }

        continue;
      }

      itemCreates.push({
        designId: design.id,
        quantity: selection.quantity,
        printWidthInches: requestedSize.printWidthInches,
        printHeightInches: requestedSize.printHeightInches,
        sortOrder: nextSortOrder,
      });
      nextSortOrder += 1;
    }

    if (quantityUpdates.length === 0 && itemCreates.length === 0) {
      return;
    }

    const db = getPortalDb();
    const requestRef = doc(db, 'printRequests', input.printRequestId);

    // Use parallel single-doc writes (not one writeBatch). Customer rules call get()/exists()
    // on the parent request, customer profile, and design per item; a multi-doc batch shares
    // one ~20 access budget and fails as "Missing or insufficient permissions."
    await Promise.all([
      ...quantityUpdates.map((update) =>
        updateDoc(doc(db, 'printRequestItems', update.itemId), {
          quantity: Math.floor(update.quantity),
          printWidthInches: update.printWidthInches,
          printHeightInches: update.printHeightInches,
          sizeLabel: formatPrintRequestItemSizeLabel(update.printWidthInches, update.printHeightInches),
          updatedAt: serverTimestamp(),
        }),
      ),
      ...itemCreates.map((create) => {
        const itemRef = doc(collection(db, 'printRequestItems'));
        return setDoc(itemRef, {
          id: itemRef.id,
          printRequestId: input.printRequestId,
          designId: create.designId,
          quantity: Math.floor(create.quantity),
          printWidthInches: create.printWidthInches,
          printHeightInches: create.printHeightInches,
          sizeLabel: formatPrintRequestItemSizeLabel(create.printWidthInches, create.printHeightInches),
          sortOrder: create.sortOrder,
          status: 'pending' as const,
          addedBy: input.userId,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
      }),
    ]);

    await updateDoc(requestRef, {
      ...(itemCreates.length > 0
        ? { itemCount: printRequest.itemCount + itemCreates.length }
        : {}),
      updatedBy: input.userId,
      updatedAt: serverTimestamp(),
    });
  },

  async updatePrintRequestItemQuantity(input: {
    itemId: string;
    printRequestId: string;
    quantity: number;
    userId: string;
  }): Promise<void> {
    await this.updatePrintRequestItem({
      itemId: input.itemId,
      printRequestId: input.printRequestId,
      userId: input.userId,
      quantity: input.quantity,
    });
  },

  async removePrintRequestItem(input: {
    itemId: string;
    printRequestId: string;
    userId: string;
  }): Promise<void> {
    const [printRequest, itemSnapshot] = await Promise.all([
      this.getPrintRequest(input.printRequestId),
      getDoc(doc(getPortalDb(), 'printRequestItems', input.itemId)),
    ]);

    if (!printRequest) {
      throw new Error('Print request not found.');
    }

    if (printRequest.status !== 'draft' && printRequest.status !== 'editing') {
      throw new Error('This print request can no longer be edited.');
    }

    if (!itemSnapshot.exists()) {
      return;
    }

    await deleteDoc(doc(getPortalDb(), 'printRequestItems', input.itemId));
    await updateDoc(doc(getPortalDb(), 'printRequests', input.printRequestId), {
      itemCount: Math.max(0, printRequest.itemCount - 1),
      updatedBy: input.userId,
      updatedAt: serverTimestamp(),
    });
  },

  async updatePrintRequestNotes(input: {
    printRequestId: string;
    notes: string;
    userId: string;
  }): Promise<void> {
    const printRequest = await this.getPrintRequest(input.printRequestId);

    if (!printRequest) {
      throw new Error('Print request not found.');
    }

    if (printRequest.status !== 'draft' && printRequest.status !== 'editing') {
      throw new Error('This print request can no longer be edited.');
    }

    const notes = input.notes.trim();

    await updateDoc(doc(getPortalDb(), 'printRequests', input.printRequestId), {
      notes: notes || null,
      updatedBy: input.userId,
      updatedAt: serverTimestamp(),
    });
  },
};
