'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

import type { PrintRequest } from '@fresh-prints/shared/types/printRequest/printRequest.types';
import type { PrintRequestItem } from '@fresh-prints/shared/types/printRequest/printRequest.types';
import { resolveCatalogAddAction } from '@fresh-prints/shared/utils/currentRequestAggregates';
import { sumPrintRequestItemQuantities } from '@fresh-prints/shared/utils/portalShowQueueCapacity';
import { clampItemQuantityToWorkingRequestMax } from '@fresh-prints/shared/utils/printRequestWorkingRequestMax';
import {
  formatPrintRequestItemSizeLabel,
  resolveInitialPrintRequestItemSize,
} from '@fresh-prints/shared/utils/printRequestItemSizing';

import { useAuth } from '../../auth/context/AuthContext';
import type { CatalogDesign } from '../../catalog/types/catalog.types';
import { usePortalToast } from '../../shared/context/PortalToastContext';
import { usePortalPrintRequests } from '../context/PortalPrintRequestContext';
import { portalPrintRequestService } from '../services/portalPrintRequestService';
import { mapPortalPrintRequestCallableError } from '../utils/mapPortalPrintRequestCallableError';
import { resolveAddDesignToRequestBranch } from '../utils/resolveAddDesignToRequestBranch';

interface UseAddDesignToRequestFlowOptions {
  continuableRequests: PrintRequest[];
  /** @deprecated Prefer context ensureWorkingPrintRequestId — kept for call-site compatibility. */
  createPrintRequest?: (
    notes?: string,
    options?: { skipListReload?: boolean },
  ) => Promise<{ printRequestId: string }>;
  onBeforeNavigate?: () => void;
  /** Full request list + working items (use after creating a new request). */
  refreshRequests: (options?: {
    silent?: boolean;
    printRequestId?: string;
    skipWorkingItems?: boolean;
  }) => Promise<void>;
  /** Working-items-only sync for qty mutations (avoids full list flash). */
  reloadWorkingItems: (options?: { silent?: boolean; printRequestId?: string }) => Promise<void>;
}

type DesiredPrimaryQty = number; // 0 = remove all catalog lines for the design

function toSeedDesignSummary(design: CatalogDesign) {
  return {
    id: design.id,
    title: design.title,
    width: design.width,
    height: design.height,
    thumbnailPath: design.thumbnailPath,
    previewPath: design.previewPath,
    printWidthInches: design.printWidthInches,
    printHeightInches: design.printHeightInches,
    updatedAtMs: design.updatedAtMs,
  };
}

function resolveOptimisticPrintSize(design: CatalogDesign): {
  printWidthInches: number;
  printHeightInches: number;
  sizeLabel: string;
} | null {
  if (
    !Number.isFinite(design.width) ||
    design.width <= 1 ||
    !Number.isFinite(design.height) ||
    design.height <= 1
  ) {
    return null;
  }
  try {
    const size = resolveInitialPrintRequestItemSize({
      pixelWidth: design.width,
      pixelHeight: design.height,
      defaultPrintWidthInches: design.printWidthInches,
    });
    return {
      printWidthInches: size.printWidthInches,
      printHeightInches: size.printHeightInches,
      sizeLabel: formatPrintRequestItemSizeLabel(size.printWidthInches, size.printHeightInches),
    };
  } catch {
    return null;
  }
}

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

const PENDING_WORKING_REQUEST_ID = 'optimistic:pending-request';

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
  createPrintRequest: _createPrintRequest,
  onBeforeNavigate,
  refreshRequests,
  reloadWorkingItems,
}: UseAddDesignToRequestFlowOptions) {
  const { firebaseUser } = useAuth();
  const { showSuccess } = usePortalToast();
  const {
    ensureDesignSummaries,
    ensureWorkingPrintRequestId,
    isEnsuringWorkingRequest,
    patchWorkingItems,
    pendingWorkingRequestId,
    seedDesignSummary,
    workingItems,
    workingRequestLimit,
  } = usePortalPrintRequests();
  const [pendingDesign, setPendingDesign] = useState<CatalogDesign | null>(null);
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [isPickerOpen, setIsPickerOpen] = useState(false);
  const [busyDesignId, setBusyDesignId] = useState<string | null>(null);
  const adjustQuantityRef = useRef<(design: CatalogDesign, delta: 1 | -1) => void>(() => {});

  function announceDesignAdded(design: CatalogDesign) {
    showSuccess(`Added “${design.title}” to your Current Request.`, {
      action: {
        label: 'Undo',
        onClick: () => {
          adjustQuantityRef.current(design, -1);
        },
      },
    });
  }
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

  const isBusy = busyDesignId !== null || isEnsuringWorkingRequest;

  const resolveBranch = useCallback(() => {
    const knownIds =
      continuableRequests.length > 0
        ? continuableRequests.map((request) => request.id)
        : pendingWorkingRequestId
          ? [pendingWorkingRequestId]
          : [];
    return resolveAddDesignToRequestBranch(knownIds);
  }, [continuableRequests, pendingWorkingRequestId]);

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
      catalogDesign?: CatalogDesign,
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

        const optimisticSize = catalogDesign ? resolveOptimisticPrintSize(catalogDesign) : null;

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
          ...(optimisticSize
            ? {
                printWidthInches: optimisticSize.printWidthInches,
                printHeightInches: optimisticSize.printHeightInches,
                sizeLabel: optimisticSize.sizeLabel,
              }
            : {}),
        };
        // Newest first in the cart — prepend so B appears above A immediately.
        return [optimisticItem, ...items];
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
              return [{ ...created.item, quantity: desired }, ...withoutOptimistic];
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
          setActionError(mapPortalPrintRequestCallableError(error).message);
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
    [
      ensureDesignSummaries,
      patchItemsAndSnapshot,
      syncWorkingItems,
    ],
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
        seedDesignSummary?.(input.designId, toSeedDesignSummary(input.catalogDesign));
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
        input.catalogDesign,
      );

      if (input.announceAdd && wasAbsent && nextQuantity >= 1) {
        const title = input.title ?? input.catalogDesign?.title;
        if (input.catalogDesign) {
          announceDesignAdded(input.catalogDesign);
        } else {
          showSuccess(
            title ? `Added “${title}” to your Current Request.` : 'Added to your Current Request.',
          );
        }
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

      const branch = resolveBranch();

      if (delta > 0 && !workingRequestLimit.canAddPrints) {
        setActionError(
          workingRequestLimit.exhaustedMessage ??
            'This request is full. Add your Current Request to a show before adding more.',
        );
        return;
      }

      if (delta < 0) {
        if (branch.kind === 'create') {
          if (!firebaseUser) {
            return;
          }
          const current =
            desiredPrimaryQtyRef.current.get(design.id) ??
            readPrimaryQuantity(workingItemsSnapshotRef.current, design.id);
          if (current < 1) {
            return;
          }
          const nextQuantity = current - 1;
          desiredPrimaryQtyRef.current.set(design.id, nextQuantity);
          applyDesiredPrimaryQuantity(
            design.id,
            nextQuantity,
            PENDING_WORKING_REQUEST_ID,
            firebaseUser.uid,
          );
          const generation = (qtyGenerationRef.current.get(design.id) ?? 0) + 1;
          qtyGenerationRef.current.set(design.id, generation);
          void ensureWorkingPrintRequestId()
            .then(async (printRequestId) => {
              patchItemsAndSnapshot((items) =>
                items.map((item) =>
                  item.printRequestId === PENDING_WORKING_REQUEST_ID
                    ? { ...item, printRequestId }
                    : item,
                ),
              );
              await flushDesiredQuantity(design.id, printRequestId, firebaseUser.uid, generation);
              // List only — cart already patched; item reload races wipe optimistic rows.
              void refreshRequests({ silent: true, printRequestId, skipWorkingItems: true });
            })
            .catch((error: unknown) => {
              desiredPrimaryQtyRef.current.delete(design.id);
              patchItemsAndSnapshot((items) =>
                items.filter((item) => !isCatalogDesignItem(item, design.id)),
              );
              setActionError(mapPortalPrintRequestCallableError(error).message);
            });
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
        if (!firebaseUser) {
          setActionError('You must be signed in to update your Current Request.');
          return;
        }

        const current =
          desiredPrimaryQtyRef.current.get(design.id) ??
          readPrimaryQuantity(workingItemsSnapshotRef.current, design.id);
        const nextQuantity = current + 1;
        const wasAbsent = current < 1;

        seedDesignSummary?.(design.id, toSeedDesignSummary(design));
        desiredPrimaryQtyRef.current.set(design.id, nextQuantity);
        applyDesiredPrimaryQuantity(
          design.id,
          nextQuantity,
          PENDING_WORKING_REQUEST_ID,
          firebaseUser.uid,
          design.title,
          design,
        );

        if (wasAbsent) {
          announceDesignAdded(design);
        }

        const generation = (qtyGenerationRef.current.get(design.id) ?? 0) + 1;
        qtyGenerationRef.current.set(design.id, generation);

        void ensureWorkingPrintRequestId()
          .then(async (printRequestId) => {
            patchItemsAndSnapshot((items) =>
              items.map((item) =>
                item.printRequestId === PENDING_WORKING_REQUEST_ID
                  ? { ...item, printRequestId }
                  : item,
              ),
            );
            await flushDesiredQuantity(design.id, printRequestId, firebaseUser.uid, generation);
            // List only — optimistic/real cart rows are already patched; a silent items
            // reload here races concurrent first-adds and flashes highlight/drawer.
            void refreshRequests({ silent: true, printRequestId, skipWorkingItems: true });
          })
          .catch((error: unknown) => {
            desiredPrimaryQtyRef.current.delete(design.id);
            patchItemsAndSnapshot((items) =>
              items.filter((item) => !isCatalogDesignItem(item, design.id)),
            );
            setActionError(mapPortalPrintRequestCallableError(error).message);
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
      applyDesiredPrimaryQuantity,
      ensureWorkingPrintRequestId,
      firebaseUser,
      flushDesiredQuantity,
      onBeforeNavigate,
      patchItemsAndSnapshot,
      queuePrimaryQuantity,
      refreshRequests,
      resolveBranch,
      seedDesignSummary,
      workingRequestLimit.canAddPrints,
      workingRequestLimit.exhaustedMessage,
    ],
  );

  adjustQuantityRef.current = adjustQuantity;

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

      const branch = resolveBranch();
      if (branch.kind === 'create' || branch.kind === 'pick') {
        return;
      }

      if (!firebaseUser) {
        setActionError('You must be signed in to update your Current Request.');
        return;
      }

      const floored = Math.floor(quantity);
      if (!Number.isFinite(floored)) {
        return;
      }

      // Typed 0 (or below) removes the design from Current Request.
      if (floored < 1) {
        if (floored === 0) {
          queuePrimaryQuantity({
            designId,
            nextQuantity: 0,
            printRequestId: branch.requestId,
            userId: firebaseUser.uid,
          });
        }
        return;
      }

      const requested = floored;
      const snapshot = workingItemsSnapshotRef.current;
      const current =
        desiredPrimaryQtyRef.current.get(designId) ?? readPrimaryQuantity(snapshot, designId);
      const primaryAction = resolveCatalogAddAction(snapshot.map(toActionLike), designId);
      const primaryItemId = primaryAction.kind === 'increment' ? primaryAction.itemId : null;
      const otherItemsPrintCount = sumPrintRequestItemQuantities(
        primaryItemId ? snapshot.filter((item) => item.id !== primaryItemId) : snapshot,
      );
      const nextQuantity =
        workingRequestLimit.limit != null
          ? clampItemQuantityToWorkingRequestMax({
              requestedQuantity: requested,
              currentQuantity: Math.max(1, current),
              otherItemsPrintCount,
              maxPerRequest: workingRequestLimit.limit,
            })
          : requested;

      if (nextQuantity === current) {
        if (requested > current && !workingRequestLimit.canAddPrints) {
          setActionError(
            workingRequestLimit.exhaustedMessage ??
              'This request is full. Add your Current Request to a show before adding more.',
          );
        }
        return;
      }

      queuePrimaryQuantity({
        designId,
        nextQuantity,
        printRequestId: branch.requestId,
        userId: firebaseUser.uid,
        // Qty edits never toast; only true first-add paths may announce.
        announceAdd: false,
        title: options?.title,
      });
    },
    [
      workingRequestLimit.canAddPrints,
      workingRequestLimit.exhaustedMessage,
      workingRequestLimit.limit,
      firebaseUser,
      queuePrimaryQuantity,
      resolveBranch,
    ],
  );

  const removeDesign = useCallback(
    (designId: string) => {
      setActionError(null);

      const branch = resolveBranch();
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
    [firebaseUser, queuePrimaryQuantity, resolveBranch],
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
        .then(() => {
          return refreshRequests({ silent: true });
        })
        .then(() => {
          announceDesignAdded(design);
        })
        .catch((error: unknown) => {
          setActionError(mapPortalPrintRequestCallableError(error).message);
        })
        .finally(() => {
          setBusyDesignId(null);
          setPendingDesign(null);
        });
    },
    [firebaseUser, isBusy, pendingDesign, refreshRequests],
  );

  return {
    actionError,
    addingDesignId: busyDesignId,
    addDesign,
    adjustQuantity,
    /** False when the Current Request is full (no room below L). */
    canAddPrints: workingRequestLimit.canAddPrints,
    closeConfirm,
    closePicker,
    confirmAddDesign,
    confirmMessage: pendingDesign
      ? `Add “${pendingDesign.title}” to your Current Request?`
      : 'Add this design to your Current Request?',
    confirmPickRequest,
    exhaustedHelperText: workingRequestLimit.exhaustedHelperText,
    exhaustedStatusText: workingRequestLimit.exhaustedStatusText,
    isAdding: isBusy,
    isConfirmOpen,
    /** True while the shared working-request create is in flight (disable all Add buttons). */
    isEnsuringWorkingRequest,
    isPickerOpen,
    pendingDesign,
    removeDesign,
    requestAddDesign,
    resetTransientState,
    setQuantity,
  };
}
