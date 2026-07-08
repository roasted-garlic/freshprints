'use client';

import { useCallback, useEffect, useState } from 'react';

import type { PrintRequest } from '@fresh-prints/shared/types/printRequest/printRequest.types';
import type { PrintRequestItem } from '@fresh-prints/shared/types/printRequest/printRequest.types';
import { sortPrintRequestItemsForDisplay } from '@fresh-prints/shared/utils/printRequestItemDisplayOrder';
import { formatPrintRequestItemSizeLabel } from '@fresh-prints/shared/utils/printRequestItemSizing';

import { useAuth } from '../../auth/context/AuthContext';
import { portalPrintRequestService } from '../services/portalPrintRequestService';

export function usePrintRequestDetail(printRequestId: string | undefined) {
  const { firebaseUser } = useAuth();
  const [printRequest, setPrintRequest] = useState<PrintRequest | null>(null);
  const [items, setItems] = useState<PrintRequestItem[]>([]);
  const [designSummaries, setDesignSummaries] = useState<
    Map<string, Awaited<ReturnType<typeof portalPrintRequestService.getReadyDesign>> | null>
  >(new Map());
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

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
      const nextSummaries = await portalPrintRequestService.getDesignSummariesForItems(nextItems);
      setPrintRequest(nextRequest);
      setItems(sortPrintRequestItemsForDisplay(nextItems));
      setDesignSummaries(nextSummaries);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Unable to load print request.');
    } finally {
      if (!silent) {
        setIsLoading(false);
      }
    }
  }, [printRequestId]);

  useEffect(() => {
    void reload();
  }, [reload]);

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

      setIsSaving(true);

      try {
        await portalPrintRequestService.updatePrintRequestItem({
          itemId,
          printRequestId,
          userId: firebaseUser.uid,
          quantity: input.quantity,
          printWidthInches: input.printWidthInches,
          printHeightInches: input.printHeightInches,
        });

        setItems((currentItems) =>
          currentItems.map((item) =>
            item.id === itemId
              ? {
                  ...item,
                  quantity: input.quantity,
                  printWidthInches: input.printWidthInches,
                  printHeightInches: input.printHeightInches,
                  sizeLabel: formatPrintRequestItemSizeLabel(
                    input.printWidthInches,
                    input.printHeightInches,
                  ),
                }
              : item,
          ),
        );
      } finally {
        setIsSaving(false);
      }
    },
    [firebaseUser, printRequestId],
  );

  const duplicateItem = useCallback(
    async (itemId: string) => {
      if (!printRequestId || !firebaseUser) {
        throw new Error('Unable to duplicate item.');
      }

      setIsSaving(true);

      try {
        const createdItem = await portalPrintRequestService.duplicatePrintRequestItem({
          itemId,
          printRequestId,
          userId: firebaseUser.uid,
        });

        setItems((currentItems) =>
          sortPrintRequestItemsForDisplay([...currentItems, createdItem]),
        );
        setPrintRequest((currentRequest) =>
          currentRequest
            ? {
                ...currentRequest,
                itemCount: currentRequest.itemCount + 1,
              }
            : currentRequest,
        );

        try {
          const design = await portalPrintRequestService.getReadyDesign(createdItem.designId);
          setDesignSummaries((currentSummaries) => {
            const nextSummaries = new Map(currentSummaries);
            nextSummaries.set(createdItem.designId, design);
            return nextSummaries;
          });
        } catch {
          // Design summary is optional for rendering the duplicated card title.
        }
      } finally {
        setIsSaving(false);
      }
    },
    [firebaseUser, printRequestId],
  );

  const updateItemQuantity = useCallback(
    async (itemId: string, quantity: number) => {
      if (!printRequestId || !firebaseUser) {
        throw new Error('Unable to update item.');
      }

      setIsSaving(true);
      try {
        await portalPrintRequestService.updatePrintRequestItemQuantity({
          itemId,
          printRequestId,
          quantity,
          userId: firebaseUser.uid,
        });
        setItems((currentItems) =>
          currentItems.map((item) => (item.id === itemId ? { ...item, quantity } : item)),
        );
      } finally {
        setIsSaving(false);
      }
    },
    [firebaseUser, printRequestId],
  );

  const removeItem = useCallback(
    async (itemId: string) => {
      if (!printRequestId || !firebaseUser) {
        throw new Error('Unable to remove item.');
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
    isLoading,
    error,
    isSaving,
    isEditable,
    reload,
    addDesign,
    updateItem,
    duplicateItem,
    updateItemQuantity,
    removeItem,
  };
}
