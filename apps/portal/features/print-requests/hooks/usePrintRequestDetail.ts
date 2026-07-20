'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import type { PrintRequest } from '@fresh-prints/shared/types/printRequest/printRequest.types';
import type { PrintRequestItem } from '@fresh-prints/shared/types/printRequest/printRequest.types';
import { sumPrintRequestItemQuantities } from '@fresh-prints/shared/utils/portalShowQueueCapacity';
import { clampItemQuantityToWorkingRequestMax } from '@fresh-prints/shared/utils/printRequestWorkingRequestMax';
import { resolveDuplicateInsertBeforeSortOrder } from '@fresh-prints/shared/utils/printRequestItemDisplayOrder';
import { formatPrintRequestItemSizeLabel } from '@fresh-prints/shared/utils/printRequestItemSizing';

import { useAuth } from '../../auth/context/AuthContext';
import {
  portalPrintRequestService,
  printRequestItemHasCustomerUpload,
} from '../services/portalPrintRequestService';
import { usePortalPrintRequests } from '../context/PortalPrintRequestContext';
import type { CustomerUploadDocSummary } from '../../customer-uploads/services/customerUploadService';
import {
  isOptimisticPrintRequestItemId,
  OPTIMISTIC_PRINT_REQUEST_ITEM_ID_PREFIX,
} from '../utils/optimisticPrintRequestItemId';
import { sortWorkingCurrentRequestItems } from '../utils/sortWorkingCurrentRequestItems';

function workingItemsSignature(items: PrintRequestItem[]): string {
  return items
    .map(
      (item) =>
        `${item.id}:${item.quantity}:${item.printWidthInches}x${item.printHeightInches}`,
    )
    .sort()
    .join('|');
}

export function usePrintRequestDetail(printRequestId: string | undefined) {
  const { firebaseUser } = useAuth();
  const {
    isLoadingCurrentRequestItems,
    patchWorkingItems,
    pendingWorkingRequestId,
    reloadWorkingItems,
    workingItems,
    workingRequest,
    workingRequestLimit,
  } = usePortalPrintRequests();
  const [printRequest, setPrintRequest] = useState<PrintRequest | null>(null);
  const [items, setItems] = useState<PrintRequestItem[]>([]);
  const [designSummaries, setDesignSummaries] = useState<
    Map<string, Awaited<ReturnType<typeof portalPrintRequestService.getReadyDesign>> | null>
  >(new Map());
  const [uploadSummaries, setUploadSummaries] = useState<
    Map<string, CustomerUploadDocSummary | null>
  >(new Map());
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  /** Stable React keys across optimistic duplicate → real item id swap. */
  const [itemClientKeyById, setItemClientKeyById] = useState<ReadonlyMap<string, string>>(
    () => new Map(),
  );
  /** True while this detail page is (or was) the Current Request / Stash. */
  const wasViewingWorkingRef = useRef(false);
  const lastSyncedWorkingSignatureRef = useRef<string | null>(null);

  const reload = useCallback(async (options?: { silent?: boolean }) => {
    if (!printRequestId) {
      setPrintRequest(null);
      setItems([]);
      setIsLoading(false);
      return;
    }

    const silent = options?.silent ?? false;

    if (!silent) {
      setIsLoading(true);
    }

    setError(null);

    try {
      const [nextRequest, nextItems] = await Promise.all([
        portalPrintRequestService.getPrintRequest(printRequestId),
        portalPrintRequestService.listPrintRequestItems(printRequestId),
      ]);
      const [nextSummaries, nextUploadSummaries] = await Promise.all([
        portalPrintRequestService.getDesignSummariesForItems(nextItems),
        portalPrintRequestService.getUploadSummariesForItems(nextItems),
      ]);
      setPrintRequest(nextRequest);
      setItems(sortWorkingCurrentRequestItems(nextItems));
      setDesignSummaries(nextSummaries);
      setUploadSummaries(nextUploadSummaries);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Unable to load print request.');
    } finally {
      if (!silent) {
        setIsLoading(false);
      }
    }
  }, [printRequestId]);

  useEffect(() => {
    wasViewingWorkingRef.current = false;
    lastSyncedWorkingSignatureRef.current = null;
    setItemClientKeyById(new Map());
    void reload();
  }, [reload]);

  useEffect(() => {
    setItemClientKeyById((previous) => {
      const liveIds = new Set(items.map((item) => item.id));
      let changed = false;
      const next = new Map(previous);
      for (const itemId of next.keys()) {
        if (!liveIds.has(itemId)) {
          next.delete(itemId);
          changed = true;
        }
      }
      return changed ? next : previous;
    });
  }, [items]);

  const getItemClientKey = useCallback(
    (itemId: string) => itemClientKeyById.get(itemId) ?? itemId,
    [itemClientKeyById],
  );
  const isViewingWorkingRequest = Boolean(
    printRequestId &&
      (workingRequest?.id === printRequestId || pendingWorkingRequestId === printRequestId),
  );

  const cartSignature = useMemo(
    () => (isViewingWorkingRequest ? workingItemsSignature(workingItems) : null),
    [isViewingWorkingRequest, workingItems],
  );

  // Keep detail items in sync with shared Stash (drawer clear / remove / qty).
  // Apply workingItems locally so optimistic drawer patches show immediately —
  // do not refetch here (server may still have the just-removed row).
  useEffect(() => {
    if (!printRequestId) {
      return;
    }

    if (isViewingWorkingRequest) {
      wasViewingWorkingRef.current = true;

      if (cartSignature === null) {
        return;
      }

      // Avoid clobbering a loaded detail with empty cart while Stash is still fetching.
      if (
        isLoadingCurrentRequestItems &&
        cartSignature === '' &&
        lastSyncedWorkingSignatureRef.current === null
      ) {
        return;
      }

      if (cartSignature === lastSyncedWorkingSignatureRef.current) {
        return;
      }

      lastSyncedWorkingSignatureRef.current = cartSignature;
      // Newest added first — same helper as Current Request drawer.
      setItems(sortWorkingCurrentRequestItems(workingItems));
      setPrintRequest((current) =>
        current
          ? {
              ...current,
              itemCount: workingItems.length,
            }
          : current,
      );
      return;
    }

    // Clear / queue removed this request from the working set while the page is open.
    if (wasViewingWorkingRef.current) {
      wasViewingWorkingRef.current = false;
      lastSyncedWorkingSignatureRef.current = null;
      void reload({ silent: true });
    }
  }, [
    cartSignature,
    isLoadingCurrentRequestItems,
    isViewingWorkingRequest,
    printRequestId,
    reload,
    workingItems,
  ]);

  const addDesign = useCallback(
    async (designId: string, quantity = 1) => {
      if (!printRequestId || !firebaseUser) {
        throw new Error('Unable to add design.');
      }

      setIsSaving(true);
      try {
        await portalPrintRequestService.addPrintRequestItem({
          printRequestId,
          designId,
          quantity,
          userId: firebaseUser.uid,
        });
        await reload({ silent: true });
      } finally {
        setIsSaving(false);
      }
    },
    [firebaseUser, printRequestId, reload],
  );

  const updateItem = useCallback(
    async (
      itemId: string,
      input: { quantity: number; printWidthInches: number; printHeightInches: number },
    ) => {
      if (!printRequestId || !firebaseUser) {
        throw new Error('Unable to update item.');
      }

      if (isOptimisticPrintRequestItemId(itemId)) {
        throw new Error('Wait for the duplicate to finish saving before editing.');
      }

      const currentItem = items.find((item) => item.id === itemId);
      const currentQuantity =
        currentItem && Number.isFinite(currentItem.quantity) ? currentItem.quantity : 1;
      const otherItemsPrintCount = sumPrintRequestItemQuantities(
        items.filter((item) => item.id !== itemId),
      );
      const quantity =
        workingRequestLimit.limit != null
          ? clampItemQuantityToWorkingRequestMax({
              requestedQuantity: input.quantity,
              currentQuantity,
              otherItemsPrintCount,
              maxPerRequest: workingRequestLimit.limit,
            })
          : Math.max(1, Math.floor(input.quantity));

      const sizeLabel = formatPrintRequestItemSizeLabel(
        input.printWidthInches,
        input.printHeightInches,
      );
      const applyLocalItemPatch = (currentItems: PrintRequestItem[]) =>
        currentItems.map((item) =>
          item.id === itemId
            ? {
                ...item,
                quantity,
                printWidthInches: input.printWidthInches,
                printHeightInches: input.printHeightInches,
                sizeLabel,
              }
            : item,
        );

      // Optimistic: cart aggregates + Cap A remaining update before the callable returns.
      setItems(applyLocalItemPatch);
      if (isViewingWorkingRequest) {
        patchWorkingItems(applyLocalItemPatch);
      }

      setIsSaving(true);

      try {
        await portalPrintRequestService.updatePrintRequestItem({
          itemId,
          printRequestId,
          userId: firebaseUser.uid,
          quantity,
          printWidthInches: input.printWidthInches,
          printHeightInches: input.printHeightInches,
        });
      } catch (error) {
        await reload({ silent: true });
        if (isViewingWorkingRequest) {
          await reloadWorkingItems({ silent: true });
        }
        throw error;
      } finally {
        setIsSaving(false);
      }
    },
    [
      workingRequestLimit.limit,
      firebaseUser,
      isViewingWorkingRequest,
      items,
      patchWorkingItems,
      printRequestId,
      reload,
      reloadWorkingItems,
    ],
  );

  const duplicateItem = useCallback(
    async (itemId: string) => {
      if (!printRequestId || !firebaseUser) {
        throw new Error('Unable to duplicate item.');
      }

      const sourceItem = items.find((item) => item.id === itemId);
      if (!sourceItem) {
        throw new Error('Item to duplicate was not found.');
      }

      const pendingId = `${OPTIMISTIC_PRINT_REQUEST_ITEM_ID_PREFIX}${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
      // Newest-first display: insert-before in ascending sort-space = visual right of source.
      const insertOrder = resolveDuplicateInsertBeforeSortOrder({
        sourceItemId: itemId,
        items: items.map((item) => ({
          id: item.id,
          sortOrder: item.sortOrder,
          createdAtMillis:
            typeof item.createdAt?.toMillis === 'function' ? item.createdAt.toMillis() : 0,
        })),
      });
      const optimisticItem: PrintRequestItem = {
        ...sourceItem,
        id: pendingId,
        sortOrder: insertOrder.duplicateSortOrder,
      };

      setItemClientKeyById((previous) => {
        const next = new Map(previous);
        next.set(pendingId, pendingId);
        return next;
      });

      setItems((currentItems) => {
        const withSourceAnchor =
          insertOrder.sourceSortOrderUpdate !== undefined
            ? currentItems.map((item) =>
                item.id === itemId
                  ? { ...item, sortOrder: insertOrder.sourceSortOrderUpdate }
                  : item,
              )
            : currentItems;

        return sortWorkingCurrentRequestItems([...withSourceAnchor, optimisticItem]);
      });
      setPrintRequest((currentRequest) =>
        currentRequest
          ? {
              ...currentRequest,
              itemCount: currentRequest.itemCount + 1,
            }
          : currentRequest,
      );
      setIsSaving(true);

      try {
        const created = await portalPrintRequestService.duplicatePrintRequestItem({
          itemId,
          printRequestId,
          userId: firebaseUser.uid,
        });

        const createdItem: PrintRequestItem = {
          ...sourceItem,
          id: created.itemId,
          sortOrder: optimisticItem.sortOrder,
          sourceType: created.sourceType,
          designId: created.designId ?? sourceItem.designId,
          customerUploadId: created.customerUploadId ?? sourceItem.customerUploadId,
        };

        setItemClientKeyById((previous) => {
          const next = new Map(previous);
          const clientKey = next.get(pendingId) ?? pendingId;
          next.delete(pendingId);
          next.set(created.itemId, clientKey);
          return next;
        });

        setItems((currentItems) =>
          sortWorkingCurrentRequestItems(
            currentItems.map((item) => (item.id === pendingId ? createdItem : item)),
          ),
        );

        if (createdItem.designId && !designSummaries.has(createdItem.designId)) {
          try {
            const design = await portalPrintRequestService.getReadyDesign(createdItem.designId);
            setDesignSummaries((currentSummaries) => {
              const nextSummaries = new Map(currentSummaries);
              nextSummaries.set(createdItem.designId!, design);
              return nextSummaries;
            });
          } catch {
            // Design summary is optional for rendering the duplicated card title.
          }
        }
      } catch (error) {
        setItemClientKeyById((previous) => {
          const next = new Map(previous);
          next.delete(pendingId);
          return next;
        });
        setItems((currentItems) => currentItems.filter((item) => item.id !== pendingId));
        setPrintRequest((currentRequest) =>
          currentRequest
            ? {
                ...currentRequest,
                itemCount: Math.max(0, currentRequest.itemCount - 1),
              }
            : currentRequest,
        );
        throw error;
      } finally {
        setIsSaving(false);
      }
    },
    [designSummaries, firebaseUser, items, printRequestId],
  );

  const updateItemQuantity = useCallback(
    async (itemId: string, quantity: number) => {
      if (!printRequestId || !firebaseUser) {
        throw new Error('Unable to update item.');
      }

      const currentItem = items.find((item) => item.id === itemId);
      const currentQuantity =
        currentItem && Number.isFinite(currentItem.quantity) ? currentItem.quantity : 1;
      const otherItemsPrintCount = sumPrintRequestItemQuantities(
        items.filter((item) => item.id !== itemId),
      );
      const nextQuantity =
        workingRequestLimit.limit != null
          ? clampItemQuantityToWorkingRequestMax({
              requestedQuantity: quantity,
              currentQuantity,
              otherItemsPrintCount,
              maxPerRequest: workingRequestLimit.limit,
            })
          : Math.max(1, Math.floor(quantity));

      setIsSaving(true);
      try {
        await portalPrintRequestService.updatePrintRequestItemQuantity({
          itemId,
          printRequestId,
          quantity: nextQuantity,
          userId: firebaseUser.uid,
        });
        setItems((currentItems) =>
          currentItems.map((item) =>
            item.id === itemId ? { ...item, quantity: nextQuantity } : item,
          ),
        );
      } finally {
        setIsSaving(false);
      }
    },
    [workingRequestLimit.limit, firebaseUser, items, printRequestId],
  );

  const removeItem = useCallback(
    async (itemId: string) => {
      if (!printRequestId || !firebaseUser) {
        throw new Error('Unable to remove item.');
      }

      if (isOptimisticPrintRequestItemId(itemId)) {
        throw new Error('Wait for the duplicate to finish saving before removing.');
      }

      setIsSaving(true);
      try {
        await portalPrintRequestService.removePrintRequestItem({
          itemId,
          printRequestId,
          userId: firebaseUser.uid,
        });
        setItems((currentItems) => currentItems.filter((item) => item.id !== itemId));
        setPrintRequest((currentRequest) =>
          currentRequest
            ? {
                ...currentRequest,
                itemCount: Math.max(0, currentRequest.itemCount - 1),
              }
            : currentRequest,
        );
      } finally {
        setIsSaving(false);
      }
    },
    [firebaseUser, printRequestId],
  );

  const isEditable =
    printRequest?.status === 'draft' || printRequest?.status === 'editing';

  return {
    printRequest,
    items,
    designSummaries,
    uploadSummaries,
    hasCustomerUploadItems: items.some(printRequestItemHasCustomerUpload),
    isLoading,
    error,
    isSaving,
    isEditable,
    reload,
    addDesign,
    updateItem,
    duplicateItem,
    getItemClientKey,
    updateItemQuantity,
    removeItem,
  };
}
