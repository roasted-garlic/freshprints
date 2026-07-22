import {
  collection,
  deleteField,
  doc,
  getDoc,
  getDocs,
  orderBy,
  query,
  serverTimestamp,
  Timestamp,
  updateDoc,
  where,
  type DocumentData,
} from 'firebase/firestore';
import { httpsCallable } from 'firebase/functions';

import { traceFirestoreRead } from '@fresh-prints/shared/utils/firestoreUsageTrace';
import type {
  AddPortalCatalogDesignToPrintRequestRequest,
  AddPortalCatalogDesignToPrintRequestResponse,
} from '@fresh-prints/shared/types/printRequest/addPortalCatalogDesignToPrintRequest.types';
import type {
  CreatePortalPrintRequestRequest,
  CreatePortalPrintRequestResponse,
} from '@fresh-prints/shared/types/printRequest/createPortalPrintRequest.types';
import type { PrintRequest, PrintRequestItem } from '@fresh-prints/shared/types/printRequest/printRequest.types';
import type { ShowAllocationStatus } from '@fresh-prints/shared/types/showAllocation/showAllocation.enums';
import {
  formatPrintRequestItemSizeLabel,
  MAX_STANDARD_PRINT_REQUEST_SIZE_INCHES,
  resolveInitialPrintRequestItemSize,
} from '@fresh-prints/shared/utils/printRequestItemSizing';
import { isPortalContinuablePrintRequestStatus } from '@fresh-prints/shared/utils/portalPrintRequestListTabs';
import { resolveCatalogAddAction } from '@fresh-prints/shared/utils/currentRequestAggregates';

import { getPortalDb, getPortalFunctions } from '../../../lib/firebase/client';
import { resolveDesignDocumentTimestamps } from '../../firebase/utils/mapFirestoreTimestamp';
import { mapPortalPrintRequestCallableError } from '../utils/mapPortalPrintRequestCallableError';
import { isOptimisticPrintRequestItemId } from '../utils/optimisticPrintRequestItemId';

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
  artworkBackgroundHex?: unknown;
  printWidthInches?: unknown;
  printHeightInches?: unknown;
  updatedAt?: unknown;
}

interface PortalShowAllocationRecord {
  printRequestId: string;
  printRequestItemId: string;
  allocatedQuantity: number;
  status: ShowAllocationStatus;
}

interface ShowAllocationDocumentData extends DocumentData {
  printRequestId?: unknown;
  printRequestItemId?: unknown;
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
    typeof data.printRequestItemId !== 'string' ||
    typeof data.allocatedQuantity !== 'number' ||
    typeof data.status !== 'string'
  ) {
    throw new Error('Show allocation data is incomplete.');
  }

  return {
    printRequestId: data.printRequestId,
    printRequestItemId: data.printRequestItemId,
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
      throw mapPortalPrintRequestCallableError(error);
    }
  },

  async listMyPrintRequests(customerId: string): Promise<PrintRequest[]> {
    traceFirestoreRead('getDocs', 'printRequests:mine:all');
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

  /**
   * Shell / chrome load: only continuable (draft|editing) requests — uses existing
   * customerId+status indexes (no new composite). Skips full history fan-out.
   */
  async listMyContinuablePrintRequests(customerId: string): Promise<PrintRequest[]> {
    const statuses = ['draft', 'editing'] as const;
    const snapshots = await Promise.all(
      statuses.map(async (status) => {
        traceFirestoreRead('getDocs', `printRequests:mine:status=${status}`);
        return getDocs(
          query(
            collection(getPortalDb(), 'printRequests'),
            where('customerId', '==', customerId),
            where('status', '==', status),
          ),
        );
      }),
    );

    const byId = new Map<string, PrintRequest>();
    for (const snapshot of snapshots) {
      for (const requestDoc of snapshot.docs) {
        const mapped = mapPrintRequest(requestDoc.id, requestDoc.data() as PrintRequestDocumentData);
        if (isPortalContinuablePrintRequestStatus(mapped.status)) {
          byId.set(mapped.id, mapped);
        }
      }
    }

    return [...byId.values()].sort((left, right) => right.updatedAt.toMillis() - left.updatedAt.toMillis());
  },

  async listEditablePrintRequests(customerId: string): Promise<PrintRequest[]> {
    const requests = await this.listMyContinuablePrintRequests(customerId);
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

  async getPrintRequestItem(itemId: string): Promise<PrintRequestItem | null> {
    const trimmed = itemId.trim();
    if (!trimmed) {
      return null;
    }
    const itemSnapshot = await getDoc(doc(getPortalDb(), 'printRequestItems', trimmed));
    if (!itemSnapshot.exists()) {
      return null;
    }
    try {
      return mapPrintRequestItem(
        itemSnapshot.id,
        itemSnapshot.data() as PrintRequestItemDocumentData,
      );
    } catch {
      return null;
    }
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
      artworkBackgroundHex:
        typeof data.artworkBackgroundHex === 'string' ? data.artworkBackgroundHex : undefined,
      printWidthInches: typeof data.printWidthInches === 'number' ? data.printWidthInches : undefined,
      printHeightInches: typeof data.printHeightInches === 'number' ? data.printHeightInches : undefined,
      updatedAtMs:
        data.updatedAt instanceof Timestamp ? data.updatedAt.toMillis() : undefined,
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
   * New lines go through a callable so Cap A (daily designs) cannot be bypassed.
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

    const callable = httpsCallable<
      AddPortalCatalogDesignToPrintRequestRequest,
      AddPortalCatalogDesignToPrintRequestResponse
    >(getPortalFunctions(), 'addPortalCatalogDesignToPrintRequest');

    const response = await callable({
      printRequestId: input.printRequestId,
      designId: input.designId,
      quantityDelta: delta,
    });

    const result = response.data;
    const item = await this.getPrintRequestItem(result.itemId);
    if (!item) {
      throw new Error('Unable to load the updated request item.');
    }
    return { kind: result.kind, item };
  },

  /**
   * @deprecated Portal catalog creates must use addOrIncrementCatalogDesign (callable).
   * Kept for rare staff-adjacent tooling; customer rules no longer allow client create.
   */
  async addPrintRequestItem(input: {
    printRequestId: string;
    designId: string;
    quantity: number;
    userId: string;
    printWidthInches?: number;
    printHeightInches?: number;
    sortOrder?: number;
  }): Promise<PrintRequestItem> {
    const result = await this.addOrIncrementCatalogDesign({
      printRequestId: input.printRequestId,
      designId: input.designId,
      userId: input.userId,
      quantityDelta: input.quantity,
    });
    return result.item;
  },
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
    void input;
    throw new Error(
      'Uploaded artwork must be added through the upload confirm flow (server-enforced limits).',
    );
  },

  async updatePrintRequestItem(input: {
    itemId: string;
    printRequestId: string;
    userId: string;
    quantity?: number;
    printWidthInches?: number;
    printHeightInches?: number;
  }): Promise<void> {
    if (isOptimisticPrintRequestItemId(input.itemId)) {
      throw new Error('Wait for the duplicate to finish saving before editing.');
    }

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
    const nextQuantity = Math.floor(input.quantity ?? current.quantity);
    const nextWidth = input.printWidthInches ?? current.printWidthInches;
    const nextHeight = input.printHeightInches ?? current.printHeightInches;

    if (!Number.isFinite(nextQuantity) || nextQuantity < 1) {
      throw new Error('Quantity must be at least 1.');
    }

    if (typeof nextWidth !== 'number' || typeof nextHeight !== 'number') {
      throw new Error('Print size is required.');
    }

    if (
      !Number.isFinite(nextWidth) ||
      !Number.isFinite(nextHeight) ||
      nextWidth <= 0 ||
      nextHeight <= 0
    ) {
      throw new Error('Requested print size must be greater than 0 inches.');
    }

    if (
      nextWidth > MAX_STANDARD_PRINT_REQUEST_SIZE_INCHES ||
      nextHeight > MAX_STANDARD_PRINT_REQUEST_SIZE_INCHES
    ) {
      throw new Error(
        `Requested standard print sizes cannot exceed ${MAX_STANDARD_PRINT_REQUEST_SIZE_INCHES} inches. Use a Custom Request for this item.`,
      );
    }

    // Quantity changes charge/refund Cap A via callable; size-only updates stay client-side.
    if (nextQuantity !== current.quantity) {
      await this.updatePrintRequestItemQuantity({
        itemId: input.itemId,
        printRequestId: input.printRequestId,
        quantity: nextQuantity,
        userId: input.userId,
      });
    }

    if (
      nextWidth === current.printWidthInches &&
      nextHeight === current.printHeightInches
    ) {
      return;
    }

    // Item-only write (Studio parity). Do not bump parent printRequests here — customer
    // parent-update rules are stricter and were denying resize autosaves as permission-denied.
    // Quantity is locked by rules for customers (Cap A callables own quantity changes).
    await updateDoc(doc(getPortalDb(), 'printRequestItems', input.itemId), {
      printWidthInches: nextWidth,
      printHeightInches: nextHeight,
      sizeLabel: formatPrintRequestItemSizeLabel(nextWidth, nextHeight),
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
    await Promise.all(
      quantityUpdates.map((update) =>
        this.updatePrintRequestItemQuantity({
          itemId: update.itemId,
          printRequestId: input.printRequestId,
          quantity: Math.floor(update.quantity),
          userId: input.userId,
        }),
      ),
    );

    // New lines must go through the Cap A callable (customer create is denied in rules).
    for (const create of itemCreates) {
      const callable = httpsCallable<
        AddPortalCatalogDesignToPrintRequestRequest,
        AddPortalCatalogDesignToPrintRequestResponse
      >(getPortalFunctions(), 'addPortalCatalogDesignToPrintRequest');
      await callable({
        printRequestId: input.printRequestId,
        designId: create.designId,
        quantityDelta: create.quantity,
        forceNewLine: true,
        printWidthInches: create.printWidthInches,
        printHeightInches: create.printHeightInches,
        sortOrder: create.sortOrder,
      });
    }

    if (itemCreates.length > 0) {
      // itemCount is updated by the callable; refresh parent updatedAt for selection UX.
      await updateDoc(requestRef, {
        updatedBy: input.userId,
        updatedAt: serverTimestamp(),
      });
    } else if (quantityUpdates.length > 0) {
      await updateDoc(requestRef, {
        updatedBy: input.userId,
        updatedAt: serverTimestamp(),
      });
    }
  },

  async updatePrintRequestItemQuantity(input: {
    itemId: string;
    printRequestId: string;
    quantity: number;
    userId: string;
  }): Promise<void> {
    if (isOptimisticPrintRequestItemId(input.itemId)) {
      throw new Error('Wait for the duplicate to finish saving before editing.');
    }

    const quantity = Math.floor(input.quantity);
    if (!Number.isFinite(quantity) || quantity < 1) {
      throw new Error('Quantity must be at least 1.');
    }

    const callable = httpsCallable<
      { printRequestId: string; itemId: string; quantity: number },
      { itemId: string; printRequestId: string; quantity: number; charged: number; refunded: number }
    >(getPortalFunctions(), 'updatePortalPrintRequestItemQuantity');

    await callable({
      printRequestId: input.printRequestId,
      itemId: input.itemId,
      quantity,
    });
  },

  async removePrintRequestItem(input: {
    itemId: string;
    printRequestId: string;
    userId: string;
  }): Promise<void> {
    if (isOptimisticPrintRequestItemId(input.itemId)) {
      throw new Error('Wait for the duplicate to finish saving before removing.');
    }

    const callable = httpsCallable<
      { printRequestId: string; itemId: string },
      { itemId: string; printRequestId: string; refunded: number; removed: boolean }
    >(getPortalFunctions(), 'removePortalPrintRequestItem');

    await callable({
      printRequestId: input.printRequestId,
      itemId: input.itemId,
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
      notes: notes ? notes : deleteField(),
      updatedBy: input.userId,
      updatedAt: serverTimestamp(),
    });
  },

  async clearWorkingPrintRequest(printRequestId: string): Promise<{
    printRequestId: string;
    status: 'draft' | 'editing';
    removedItemCount: number;
  }> {
    const callable = httpsCallable<
      { printRequestId: string },
      { printRequestId: string; status: 'draft' | 'editing'; removedItemCount: number }
    >(getPortalFunctions(), 'clearPortalWorkingPrintRequest');

    const result = await callable({ printRequestId });
    return {
      printRequestId: result.data.printRequestId,
      status: result.data.status,
      removedItemCount: result.data.removedItemCount,
    };
  },
};
