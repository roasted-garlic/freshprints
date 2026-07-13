'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

import type { PrintRequest } from '@fresh-prints/shared/types/printRequest/printRequest.types';
import type { PrintRequestItem } from '@fresh-prints/shared/types/printRequest/printRequest.types';
import { resolveCatalogAddAction } from '@fresh-prints/shared/utils/currentRequestAggregates';

import { useAuth } from '../../auth/context/AuthContext';
import type { CatalogDesign } from '../../catalog/types/catalog.types';
import { usePortalToast } from '../../shared/context/PortalToastContext';
import { usePortalPrintRequests } from '../context/PortalPrintRequestContext';
import { portalPrintRequestService } from '../services/portalPrintRequestService';
import { resolveAddDesignToRequestBranch } from '../utils/resolveAddDesignToRequestBranch';

interface UseAddDesignToRequestFlowOptions {
  continuableRequests: PrintRequest[];
  createPrintRequest: (
    notes?: string,
    options?: { skipListReload?: boolean },
  ) => Promise<{ printRequestId: string }>;
  onBeforeNavigate?: () => void;
  /** Full request list + working items (use after creating a new request). */
  refreshRequests: (options?: { silent?: boolean }) => Promise<void>;
  /** Working-items-only sync for qty mutations (avoids full list flash). */
  reloadWorkingItems: (options?: { silent?: boolean }) => Promise<void>;
}

type DesiredPrimaryQty = number; // 0 = remove all catalog lines for the design

function toActionLike(item: PrintRequestItem) {
  return {
    id: item.id,
    designId: item.designId,
    customerUploadId: item.customerUploadId,
    sourceType: item.sourceType,
    quantity: item.quantity,
    createdAtMs:
      item.createdAt && typeof item.createdAt.toMillis === 'function'
        ? item.createdAt.toMillis()
        : 0,
  };
}

function isCatalogDesignItem(item: PrintRequestItem, designId: string): boolean {
  return (
    item.sourceType !== 'customer_upload' &&
    typeof item.designId === 'string' &&
    item.designId.trim() === designId.trim()
  );
}

function isOptimisticCatalogItemId(itemId: string): boolean {
  return itemId.startsWith('optimistic:');
}

function readPrimaryQuantity(items: PrintRequestItem[], designId: string): number {
  const action = resolveCatalogAddAction(items.map(toActionLike), designId);
  if (action.kind !== 'increment') {
    return 0;
  }
  const primary = items.find((item) => item.id === action.itemId);
  return primary && Number.isFinite(primary.quantity) ? primary.quantity : 0;
}

/**
 * Catalog qty controls: +1 creates/increments primary; −1 decrements/removes primary.
 * Qty taps are optimistic and coalesced so rapid +/- stays responsive.
 * Success toast fires only when a design is newly added (0 → in request).
 */
export function useAddDesignToRequestFlow({
  continuableRequests,
  createPrintRequest,
  onBeforeNavigate,
  refreshRequests,
  reloadWorkingItems,
}: UseAddDesignToRequestFlowOptions) {
  const { firebaseUser } = useAuth();
  const { showSuccess } = usePortalToast();
  const { ensureDesignSummaries, patchWorkingItems, seedDesignSummary, workingItems } =
    usePortalPrintRequests();
  const [pendingDesign, setPendingDesign] = useState<CatalogDesign | null>(null);
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [isPickerOpen, setIsPickerOpen] = useState(false);
  const [busyDesignId, setBusyDesignId] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  /** Latest desired primary qty per design (0 = remove). */
  const desiredPrimaryQtyRef = useRef(new Map<string, DesiredPrimaryQty>());
  /** Monotonic generation so stale flushes ignore superseded targets. */
  const qtyGenerationRef = useRef(new Map<string, number>());
  const flushTimersRef = useRef(new Map<string, ReturnType<typeof setTimeout>>());
  const flushingDesignIdsRef = useRef(new Set<string>());
  /** Snapshot of working items for coalescing without waiting on React state. */
  const workingItemsSnapshotRef = useRef<PrintRequestItem[]>(workingItems);

  useEffect(() => {
    // Prefer local coalesced state while a design has a pending desired qty.
    if (desiredPrimaryQtyRef.current.size === 0) {
      workingItemsSnapshotRef.current = workingItems;
    }
  }, [workingItems]);

  const isBusy = busyDesignId !== null;

  const resetTransientState = useCallback(() => {
    for (const timer of flushTimersRef.current.values()) {
      clearTimeout(timer);
    }
    flushTimersRef.current.clear();
    desiredPrimaryQtyRef.current.clear();
    qtyGenerationRef.current.clear();
    flushingDesignIdsRef.current.clear();
    setBusyDesignId(null);
    setIsPickerOpen(false);
    setIsConfirmOpen(false);
    setPendingDesign(null);
  }, []);

  const syncWorkingItems = useCallback(async () => {
    await reloadWorkingItems({ silent: true });
  }, [reloadWorkingItems]);

  const patchItemsAndSnapshot = useCallback(
    (updater: (items: PrintRequestItem[]) => PrintRequestItem[]) => {
      patchWorkingItems((current) => {
        const next = updater(current);
        workingItemsSnapshotRef.current = next;
        return next;
      });
    },
    [patchWorkingItems],
  );

  const applyDesiredPrimaryQuantity = useCallback(
    (
      designId: string,
      nextQuantity: DesiredPrimaryQty,
      printRequestId: string,
      userId: string,
      titleSnapshot?: string,
    ) => {
      patchItemsAndSnapshot((items) => {
        if (nextQuantity < 1) {
          return items.filter((item) => !isCatalogDesignItem(item, designId));
        }

        const action = resolveCatalogAddAction(items.map(toActionLike), designId);
        if (action.kind === 'increment') {
          return items.map((item) =>
            item.id === action.itemId ? { ...item, quantity: nextQuantity } : item,
          );
        }

        const nowMs = Date.now();
        const optimisticStamp = {
          toMillis: () => nowMs,
        } as PrintRequestItem['createdAt'];

        const optimisticItem: PrintRequestItem = {
          id: `optimistic:${designId}`,
          printRequestId,
          designId,
          sourceType: 'catalog_design',
          quantity: nextQuantity,
          status: 'pending',
          addedBy: userId,
          createdAt: optimisticStamp,
          updatedAt: optimisticStamp,
          ...(titleSnapshot?.trim() ? { titleSnapshot: titleSnapshot.trim() } : {}),
        };
        return [...items, optimisticItem];
      });
    },
    [patchItemsAndSnapshot],
  );

  const flushDesiredQuantity = useCallback(
    async (designId: string, printRequestId: string, userId: string, generation: number) => {
      if (qtyGenerationRef.current.get(designId) !== generation) {
        return;
      }

      if (flushingDesignIdsRef.current.has(designId)) {
        return;
      }

      flushingDesignIdsRef.current.add(designId);
      const desired = desiredPrimaryQtyRef.current.get(designId);

      try {
        if (desired === undefined) {
          return;
        }

        if (desired < 1) {
          await portalPrintRequestService.removeCatalogDesignFromRequest({
            printRequestId,
            designId,
            userId,
          });
        } else {
          const snapshot = workingItemsSnapshotRef.current;
          const hasRealPrimary = snapshot.some(
            (item) =>
              isCatalogDesignItem(item, designId) && !isOptimisticCatalogItemId(item.id),
          );

          if (!hasRealPrimary) {
            const created = await portalPrintRequestService.addOrIncrementCatalogDesign({
              printRequestId,
              designId,
              userId,
              quantityDelta: desired,
            });
            // Replace optimistic stub with the real item id before any later absolute set.
            patchItemsAndSnapshot((items) => {
              const withoutOptimistic = items.filter(
                (item) => !(isCatalogDesignItem(item, designId) && isOptimisticCatalogItemId(item.id)),
              );
              const alreadyHasReal = withoutOptimistic.some((item) => item.id === created.item.id);
              if (alreadyHasReal) {
                return withoutOptimistic.map((item) =>
                  item.id === created.item.id ? { ...item, quantity: desired } : item,
                );
              }
              return [...withoutOptimistic, { ...created.item, quantity: desired }];
            });
            void ensureDesignSummaries?.([designId]);
          } else {
            await portalPrintRequestService.setPrimaryCatalogDesignQuantity({
              printRequestId,
              designId,
              quantity: desired,
              userId,
            });
          }
        }

        if (qtyGenerationRef.current.get(designId) !== generation) {
          return;
        }

        desiredPrimaryQtyRef.current.delete(designId);
        // Skip silent reload while settled — optimistic state already matches the write.
        // Reloading here races with rapid follow-up taps and can flash old qty.
      } catch (error: unknown) {
        if (qtyGenerationRef.current.get(designId) === generation) {
          desiredPrimaryQtyRef.current.delete(designId);
          setActionError(
            error instanceof Error ? error.message : 'Unable to update Current Request quantity.',
          );
          await syncWorkingItems();
        }
      } finally {
        flushingDesignIdsRef.current.delete(designId);
        const latestGeneration = qtyGenerationRef.current.get(designId);
        if (
          latestGeneration !== undefined &&
          latestGeneration !== generation &&
          desiredPrimaryQtyRef.current.has(designId)
        ) {
          void flushDesiredQuantity(designId, printRequestId, userId, latestGeneration);
        }
      }
    },
    [ensureDesignSummaries, patchItemsAndSnapshot, syncWorkingItems],
  );

  const scheduleQuantityFlush = useCallback(
    (designId: string, printRequestId: string, userId: string) => {
      const generation = (qtyGenerationRef.current.get(designId) ?? 0) + 1;
      qtyGenerationRef.current.set(designId, generation);

      const existingTimer = flushTimersRef.current.get(designId);
      if (existingTimer) {
        clearTimeout(existingTimer);
      }

      // Short coalesce window so rapid taps batch into one absolute write.
      const timer = setTimeout(() => {
        flushTimersRef.current.delete(designId);
        void flushDesiredQuantity(designId, printRequestId, userId, generation);
      }, 80);
      flushTimersRef.current.set(designId, timer);
    },
    [flushDesiredQuantity],
  );

  const queuePrimaryQuantity = useCallback(
    (input: {
      designId: string;
      nextQuantity: DesiredPrimaryQty;
      printRequestId: string;
      userId: string;
      announceAdd?: boolean;
      title?: string;
      catalogDesign?: CatalogDesign;
    }) => {
      const previousDesired =
        desiredPrimaryQtyRef.current.get(input.designId) ??
        readPrimaryQuantity(workingItemsSnapshotRef.current, input.designId);
      const wasAbsent = previousDesired < 1;
      const nextQuantity = Math.max(0, Math.floor(input.nextQuantity));

      if (input.catalogDesign && nextQuantity >= 1) {
        seedDesignSummary?.(input.designId, {
          id: input.catalogDesign.id,
          title: input.catalogDesign.title,
          width: 1,
          height: 1,
          thumbnailPath: input.catalogDesign.thumbnailPath,
          previewPath: input.catalogDesign.previewPath,
          printWidthInches: input.catalogDesign.printWidthInches,
          printHeightInches: input.catalogDesign.printHeightInches,
        });
      } else if (wasAbsent && nextQuantity >= 1) {
        void ensureDesignSummaries?.([input.designId]);
      }

      desiredPrimaryQtyRef.current.set(input.designId, nextQuantity);
      applyDesiredPrimaryQuantity(
        input.designId,
        nextQuantity,
        input.printRequestId,
        input.userId,
        input.title ?? input.catalogDesign?.title,
      );

      if (input.announceAdd && wasAbsent && nextQuantity >= 1) {
        showSuccess(
          input.title ?? input.catalogDesign?.title
            ? `Added “${input.title ?? input.catalogDesign?.title}” to your Current Request.`
            : 'Added to your Current Request.',
        );
      }

      scheduleQuantityFlush(input.designId, input.printRequestId, input.userId);
    },
    [
      applyDesiredPrimaryQuantity,
      ensureDesignSummaries,
      scheduleQuantityFlush,
      seedDesignSummary,
      showSuccess,
    ],
  );

  const adjustQuantity = useCallback(
    (design: CatalogDesign, delta: 1 | -1) => {
      setActionError(null);

      const branch = resolveAddDesignToRequestBranch(continuableRequests.map((request) => request.id));

      if (delta < 0) {
        if (branch.kind === 'create') {
          return;
        }
        if (branch.kind === 'pick') {
          onBeforeNavigate?.();
          setPendingDesign(design);
          setIsPickerOpen(true);
          return;
        }

        if (!firebaseUser) {
          setActionError('You must be signed in to update your Current Request.');
          return;
        }

        const current =
          desiredPrimaryQtyRef.current.get(design.id) ??
          readPrimaryQuantity(workingItemsSnapshotRef.current, design.id);
        queuePrimaryQuantity({
          designId: design.id,
          nextQuantity: current - 1,
          printRequestId: branch.requestId,
          userId: firebaseUser.uid,
        });
        return;
      }

      if (branch.kind === 'pick') {
        onBeforeNavigate?.();
        setPendingDesign(design);
        setIsPickerOpen(true);
        return;
      }

      if (branch.kind === 'create') {
        if (!firebaseUser || busyDesignId) {
          if (!firebaseUser) {
            setActionError('You must be signed in to update your Current Request.');
          }
          return;
        }

        setBusyDesignId(design.id);
        seedDesignSummary?.(design.id, {
          id: design.id,
          title: design.title,
          width: 1,
          height: 1,
          thumbnailPath: design.thumbnailPath,
          previewPath: design.previewPath,
          printWidthInches: design.printWidthInches,
          printHeightInches: design.printHeightInches,
        });
        void createPrintRequest(undefined, { skipListReload: true })
          .then((created) =>
            portalPrintRequestService.addOrIncrementCatalogDesign({
              printRequestId: created.printRequestId,
              designId: design.id,
              userId: firebaseUser.uid,
            }),
          )
          .then(() => refreshRequests({ silent: true }))
          .then(() => {
            showSuccess(`Added “${design.title}” to your Current Request.`);
          })
          .catch((error: unknown) => {
            setActionError(
              error instanceof Error ? error.message : 'Unable to update Current Request.',
            );
          })
          .finally(() => {
            setBusyDesignId(null);
            setPendingDesign(null);
          });
        return;
      }

      if (!firebaseUser) {
        setActionError('You must be signed in to update your Current Request.');
        return;
      }

      const current =
        desiredPrimaryQtyRef.current.get(design.id) ??
        readPrimaryQuantity(workingItemsSnapshotRef.current, design.id);
      queuePrimaryQuantity({
        designId: design.id,
        nextQuantity: current + 1,
        printRequestId: branch.requestId,
        userId: firebaseUser.uid,
        announceAdd: true,
        title: design.title,
        catalogDesign: design,
      });
    },
    [
      busyDesignId,
      continuableRequests,
      createPrintRequest,
      firebaseUser,
      onBeforeNavigate,
      queuePrimaryQuantity,
      refreshRequests,
      seedDesignSummary,
      showSuccess,
    ],
  );

  /** @deprecated Prefer adjustQuantity — kept for modal confirm paths. */
  const requestAddDesign = useCallback(
    (design: CatalogDesign) => {
      adjustQuantity(design, 1);
    },
    [adjustQuantity],
  );

  const addDesign = useCallback(
    (design: CatalogDesign) => {
      adjustQuantity(design, 1);
    },
    [adjustQuantity],
  );

  const setQuantity = useCallback(
    (designId: string, quantity: number, options?: { title?: string; announce?: boolean }) => {
      setActionError(null);

      const branch = resolveAddDesignToRequestBranch(continuableRequests.map((request) => request.id));
      if (branch.kind === 'create' || branch.kind === 'pick') {
        return;
      }

      if (!firebaseUser) {
        setActionError('You must be signed in to update your Current Request.');
        return;
      }

      queuePrimaryQuantity({
        designId,
        nextQuantity: Math.max(1, Math.floor(quantity)),
        printRequestId: branch.requestId,
        userId: firebaseUser.uid,
        // Qty edits never toast; only true first-add paths may announce.
        announceAdd: false,
        title: options?.title,
      });
    },
    [continuableRequests, firebaseUser, queuePrimaryQuantity],
  );

  const removeDesign = useCallback(
    (designId: string) => {
      setActionError(null);

      const branch = resolveAddDesignToRequestBranch(continuableRequests.map((request) => request.id));
      if (branch.kind === 'create' || branch.kind === 'pick') {
        return;
      }

      if (!firebaseUser) {
        setActionError('You must be signed in to update your Current Request.');
        return;
      }

      queuePrimaryQuantity({
        designId,
        nextQuantity: 0,
        printRequestId: branch.requestId,
        userId: firebaseUser.uid,
      });
    },
    [continuableRequests, firebaseUser, queuePrimaryQuantity],
  );

  const closeConfirm = useCallback(() => {
    if (isBusy) {
      return;
    }
    setIsConfirmOpen(false);
    setPendingDesign(null);
  }, [isBusy]);

  const confirmAddDesign = useCallback(() => {
    if (!pendingDesign || isBusy) {
      return;
    }
    const design = pendingDesign;
    setIsConfirmOpen(false);
    adjustQuantity(design, 1);
  }, [adjustQuantity, isBusy, pendingDesign]);

  const closePicker = useCallback(() => {
    if (isBusy) {
      return;
    }
    setIsPickerOpen(false);
    setPendingDesign(null);
  }, [isBusy]);

  const confirmPickRequest = useCallback(
    (printRequestId: string) => {
      if (!pendingDesign || isBusy || !firebaseUser) {
        return;
      }

      const design = pendingDesign;
      setBusyDesignId(design.id);
      setActionError(null);
      setIsPickerOpen(false);

      void portalPrintRequestService
        .addOrIncrementCatalogDesign({
          printRequestId,
          designId: design.id,
          userId: firebaseUser.uid,
        })
        .then(() => refreshRequests({ silent: true }))
        .then(() => {
          showSuccess(`Added “${design.title}” to your Current Request.`);
        })
        .catch((error: unknown) => {
          setActionError(error instanceof Error ? error.message : 'Unable to add design to request.');
        })
        .finally(() => {
          setBusyDesignId(null);
          setPendingDesign(null);
        });
    },
    [firebaseUser, isBusy, pendingDesign, refreshRequests, showSuccess],
  );

  return {
    actionError,
    addingDesignId: busyDesignId,
    addDesign,
    adjustQuantity,
    closeConfirm,
    closePicker,
    confirmAddDesign,
    confirmMessage: pendingDesign
      ? `Add “${pendingDesign.title}” to your Current Request?`
      : 'Add this design to your Current Request?',
    confirmPickRequest,
    isAdding: isBusy,
    isConfirmOpen,
    isPickerOpen,
    pendingDesign,
    removeDesign,
    requestAddDesign,
    resetTransientState,
    setQuantity,
  };
}
