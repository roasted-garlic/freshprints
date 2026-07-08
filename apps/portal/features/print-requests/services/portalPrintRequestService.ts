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

import { getPortalDb, getPortalFunctions } from '../../../lib/firebase/client';
import { mapFirestoreTimestamp, resolveDesignDocumentTimestamps } from '../../firebase/utils/mapFirestoreTimestamp';
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
  const createdAt = mapFirestoreTimestamp(data.createdAt);
  const updatedAt = mapFirestoreTimestamp(data.updatedAt);

  if (
    typeof data.name !== 'string' ||
    typeof data.isInternal !== 'boolean' ||
    typeof data.status !== 'string' ||
    typeof data.itemCount !== 'number' ||
    typeof data.createdBy !== 'string' ||
    typeof data.updatedBy !== 'string' ||
    createdAt === undefined ||
    updatedAt === undefined
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
  const timestamps = resolveDesignDocumentTimestamps(data);

  if (
    typeof data.printRequestId !== 'string' ||
    typeof data.designId !== 'string' ||
    typeof data.quantity !== 'number' ||
    typeof data.status !== 'string' ||
    typeof data.addedBy !== 'string' ||
    timestamps === null
  ) {
    throw new Error('Print request item data is incomplete.');
  }

  return {
    id: itemId,
    printRequestId: data.printRequestId,
    designId: data.designId,
    quantity: data.quantity,
    printWidthInches: typeof data.printWidthInches === 'number' ? data.printWidthInches : undefined,
    printHeightInches: typeof data.printHeightInches === 'number' ? data.printHeightInches : undefined,
    sizeLabel: typeof data.sizeLabel === 'string' ? data.sizeLabel : undefined,
    sortOrder: typeof data.sortOrder === 'number' ? data.sortOrder : undefined,
    notes: typeof data.notes === 'string' ? data.notes : undefined,
    status: data.status as PrintRequestItem['status'],
    addedBy: data.addedBy,
    createdAt: timestamps.createdAt,
    updatedAt: timestamps.updatedAt,
  };
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

    return snapshot.docs.map((itemDoc) =>
      mapPrintRequestItem(itemDoc.id, itemDoc.data() as PrintRequestItemDocumentData),
    );
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

        return snapshot.docs.map((itemDoc) =>
          mapPrintRequestItem(itemDoc.id, itemDoc.data() as PrintRequestItemDocumentData),
        );
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
    const uniqueDesignIds = [...new Set(items.map((item) => item.designId))];
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

    const createdSnapshot = await getDoc(itemRef);
    return mapPrintRequestItem(createdSnapshot.id, createdSnapshot.data() as PrintRequestItemDocumentData);
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
  }): Promise<PrintRequestItem> {
    const itemSnapshot = await getDoc(doc(getPortalDb(), 'printRequestItems', input.itemId));

    if (!itemSnapshot.exists()) {
      throw new Error('Print request item not found.');
    }

    const item = mapPrintRequestItem(itemSnapshot.id, itemSnapshot.data() as PrintRequestItemDocumentData);
    const currentItems = await this.listPrintRequestItems(input.printRequestId);
    const sourceSortOrder =
      typeof item.sortOrder === 'number' && Number.isFinite(item.sortOrder) ? item.sortOrder : undefined;

    return this.addPrintRequestItem({
      printRequestId: input.printRequestId,
      designId: item.designId,
      quantity: item.quantity,
      userId: input.userId,
      printWidthInches: item.printWidthInches,
      printHeightInches: item.printHeightInches,
      sortOrder: sourceSortOrder === undefined ? resolveNextSortOrder(currentItems) : sourceSortOrder + 0.5,
    });
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

    await this.getPrintRequest(input.printRequestId);
    const currentItems = await this.listPrintRequestItems(input.printRequestId);

    for (const selection of normalizedSelections) {
      if (!Number.isFinite(selection.quantity) || selection.quantity < 1) {
        throw new Error('Quantity must be at least 1.');
      }

      const design = await this.getReadyDesign(selection.designId);
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
          await this.updatePrintRequestItem({
            itemId: existingItem.id,
            printRequestId: input.printRequestId,
            userId: input.userId,
            quantity: selection.quantity,
          });
        }

        continue;
      }

      await this.addPrintRequestItem({
        printRequestId: input.printRequestId,
        designId: selection.designId,
        quantity: selection.quantity,
        userId: input.userId,
      });
    }
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
    const printRequest = await this.getPrintRequest(input.printRequestId);

    if (!printRequest) {
      throw new Error('Print request not found.');
    }

    if (printRequest.status !== 'draft' && printRequest.status !== 'editing') {
      throw new Error('This print request can no longer be edited.');
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
