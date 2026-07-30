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
import type { CatalogDesign } from '../../catalog/types/catalog.types';
import {
  isOptimisticPrintRequestItemId,
  OPTIMISTIC_PRINT_REQUEST_ITEM_ID_PREFIX,
} from '../utils/optimisticPrintRequestItemId';
import { ItemMutationGenerationTracker } from '../utils/itemMutationGeneration';
import { sortWorkingCurrentRequestItems } from '../utils/sortWorkingCurrentRequestItems';
import { shouldApplyReloadedItems } from '../utils/printRequestDetailItemsReloadAuthority';
import {
  resolveCurrentQuantityForEdit,
  resolveServerAuthoritativeQuantity,
} from '../utils/resolveQuantityCommitOutcome';

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
    beginPendingItemRemovals,
    endPendingItemRemovals,
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
    Map<string, CatalogDesign | null>
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
  const loadGenerationRef = useRef(0);
  /**
   * Per-item mutation generation so a stale reload/sync resolving after a newer
   * removeItem/updateItem for the same item id is discarded, not applied. Mirrors the
   * reloadEpochRef pattern already proven in useWorkingCurrentRequestItems.
   */
  const itemMutationGenerationRef = useRef(new ItemMutationGenerationTracker());
  /**
   * Kept in sync with isViewingWorkingRequest (computed below) every render so reload()'s async
   * completion can re-check it at apply time — not the value captured when reload() started —
   * per Root Cause 1 (Plan Section 20.1/20.4): while viewing the working request, workingItems is
   * the sole authority for `items`; reload()'s own item fetch must never win against it, even if
   * viewing state changed while the fetch was in flight.
   */
  const isViewingWorkingRequestRef = useRef(false);

  const beginItemMutation = useCallback((itemId: string) => {
    return itemMutationGenerationRef.current.begin(itemId);
  }, []);

  const isLatestItemMutation = useCallback((itemId: string, generation: number) => {
    return itemMutationGenerationRef.current.isLatest(itemId, generation);
  }, []);

  const reload = useCallback(async (options?: { silent?: boolean }) => {
    const generation = ++loadGenerationRef.current;
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
      if (generation !== loadGenerationRef.current) return;
      setPrintRequest(nextRequest);
      // Root Cause 1 gate: reload()'s own item fetch is reserved for metadata + historical/
      // non-working requests. While viewing the working request, workingItems (synced via the
      // cartSignature effect below) owns `items` — applying this fetch's items here would let a
      // stale/racing reload overwrite an already-correct optimistic or workingItems-synced state.
      if (shouldApplyReloadedItems({ isViewingWorkingRequestAtApplyTime: isViewingWorkingRequestRef.current })) {
        setItems(sortWorkingCurrentRequestItems(nextItems));
      }
      setDesignSummaries(nextSummaries);
      setUploadSummaries(nextUploadSummaries);
    } catch (loadError) {
      if (generation !== loadGenerationRef.current) return;
      setError(loadError instanceof Error ? loadError.message : 'Unable to load print request.');
    } finally {
      if (!silent && generation === loadGenerationRef.current) {
        setIsLoading(false);
      }
    }
  }, [printRequestId]);

  const catalogDesignIdsKey = useMemo(
    () =>
      [...new Set(items.flatMap((item) => (item.designId?.trim() ? [item.designId.trim()] : [])))]
        .sort()
        .join('|'),
    [items],
  );

  useEffect(() => {
    if (!catalogDesignIdsKey) {
      setDesignSummaries(new Map());
      return;
    }
    const generation = loadGenerationRef.current;
    let cancelled = false;
    void portalPrintRequestService
      .getDesignSummariesForItems(items)
      .then((summaries) => {
        if (!cancelled && generation === loadGenerationRef.current) {
          setDesignSummaries(summaries);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [catalogDesignIdsKey, items]);

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
  // Synchronous ref mirror so reload()'s async completion (see shouldApplyReloadedItems above)
  // reads the viewing state at apply time, not a stale value closed over at call time.
  isViewingWorkingRequestRef.current = isViewingWorkingRequest;

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
    ): Promise<{ quantity: number }> => {
      if (!printRequestId || !firebaseUser) {
        throw new Error('Unable to update item.');
      }

      if (isOptimisticPrintRequestItemId(itemId)) {
        throw new Error('Wait for the duplicate to finish saving before editing.');
      }

      const currentItem = items.find((item) => item.id === itemId);
      // Root Cause 2 fallback hardening (Plan Section 20.2/20.4): a lookup miss (or a non-finite
      // current quantity) is an inconsistent-state condition, not a legitimate "assume 1" case —
      // surface an explicit, user-safe failure instead of silently guessing a real quantity.
      const currentQuantityResult = resolveCurrentQuantityForEdit(currentItem);
      if (!currentQuantityResult.ok) {
        throw new Error(
          'This item could not be found in the current request. Refresh and try again.',
        );
      }
      const currentQuantity = currentQuantityResult.currentQuantity;
      const otherItemsPrintCount = sumPrintRequestItemQuantities(
        items.filter((item) => item.id !== itemId),
      );
      // Optimistic-only clamp for the immediate UI patch below — the server independently
      // re-derives and clamps authoritatively; its returned quantity (not this one) is what gets
      // committed on success (see applyServerQuantityPatch below).
      // Plan Section 22.2 (Amendment 4): a `null` limit means the limit is genuinely UNKNOWN (not yet
      // hydrated), never "no limit" — the request quantity must not be optimistically applied
      // uncapped in that window (it previously fell back to `Math.max(1, Math.floor(input.quantity))`,
      // writing the raw, unclamped typed value into shared state while the capacity banner was
      // simultaneously frozen/not-ready, matching the owner's "field stuck, banner doesn't move"
      // report). `hasKnownLimit` gates whether an optimistic local patch is applied at all; the
      // server-authoritative response (always requested, regardless) remains the sole source of
      // truth for what actually gets committed.
      const hasKnownLimit = workingRequestLimit.limit != null;
      const optimisticQuantity = hasKnownLimit
        ? clampItemQuantityToWorkingRequestMax({
            requestedQuantity: input.quantity,
            currentQuantity,
            otherItemsPrintCount,
            maxPerRequest: workingRequestLimit.limit as number,
          })
        : currentQuantity;

      const sizeLabel = formatPrintRequestItemSizeLabel(
        input.printWidthInches,
        input.printHeightInches,
      );
      const applyLocalItemPatch = (currentItems: PrintRequestItem[]) =>
        currentItems.map((item) =>
          item.id === itemId
            ? {
                ...item,
                quantity: optimisticQuantity,
                printWidthInches: input.printWidthInches,
                printHeightInches: input.printHeightInches,
                sizeLabel,
              }
            : item,
        );
      const applyServerQuantityPatch = (serverQuantity: number) => (currentItems: PrintRequestItem[]) =>
        currentItems.map((item) =>
          item.id === itemId ? { ...item, quantity: serverQuantity } : item,
        );

      // Per-item generation: a stale reload/sync resolving after a newer edit for this
      // same item id must be discarded, not applied (mirrors reloadEpochRef elsewhere).
      const generation = beginItemMutation(itemId);

      // Optimistic: cart aggregates + Cap A remaining update before the callable returns.
      setItems(applyLocalItemPatch);
      if (isViewingWorkingRequest) {
        // Delegate to the context's single owner of working-request item state — the same
        // mechanism useAddDesignToRequestFlow already uses — so a concurrent silent reload
        // elsewhere reconciles against this optimistic patch instead of racing a second,
        // untracked local representation.
        patchWorkingItems(applyLocalItemPatch);
      }

      setIsSaving(true);

      try {
        const result = await portalPrintRequestService.updatePrintRequestItem({
          itemId,
          printRequestId,
          userId: firebaseUser.uid,
          // Plan Section 22.2: when the limit is unknown, `optimisticQuantity` intentionally holds
          // `currentQuantity` (no optimistic UI change) — the REQUEST itself must still carry the
          // user's actual requested quantity so the server can authoritatively clamp it; sending
          // `optimisticQuantity` here in that case would silently submit the old, unchanged value.
          quantity: hasKnownLimit ? optimisticQuantity : Math.max(1, Math.floor(input.quantity)),
          printWidthInches: input.printWidthInches,
          printHeightInches: input.printHeightInches,
        });
        // Root Cause 2 (Plan Section 20.2/20.4): commit the server's authoritative accepted
        // quantity, not the client's optimistic guess — closes the "displayed 7, server capped it
        // differently" gap regardless of any transient client/server otherItemsPrintCount
        // mismatch. Only the still-latest mutation for this item id may apply this reconciliation.
        const serverQuantity = resolveServerAuthoritativeQuantity(result);
        if (isLatestItemMutation(itemId, generation) && serverQuantity !== optimisticQuantity) {
          const applyServerPatch = applyServerQuantityPatch(serverQuantity);
          setItems(applyServerPatch);
          if (isViewingWorkingRequest) {
            patchWorkingItems(applyServerPatch);
          }
        }
        // Threaded back to the caller (PrintRequestDetailView.handleUpdateItem ->
        // PortalPrintRequestItemCard.onUpdate) so the requesting card can reconcile its own
        // local draft against the server-accepted value directly, instead of relying solely on
        // the async prop-sync effect (Plan Section 21.4 point 1 — all three layers must return
        // this value, not just the card's prop type).
        return { quantity: serverQuantity };
      } catch (error) {
        // Only the still-latest mutation for this item id may restore authoritative state —
        // a superseded (already-replaced-by-a-newer-edit) failure must not clobber it.
        if (isLatestItemMutation(itemId, generation)) {
          await reload({ silent: true });
          if (isViewingWorkingRequest) {
            await reloadWorkingItems({ silent: true });
          }
        }
        throw error;
      } finally {
        setIsSaving(false);
      }
    },
    [
      workingRequestLimit.limit,
      beginItemMutation,
      firebaseUser,
      isLatestItemMutation,
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

      const applyOptimisticInsert = (currentItems: PrintRequestItem[]) => {
        const withSourceAnchor =
          insertOrder.sourceSortOrderUpdate !== undefined
            ? currentItems.map((item) =>
                item.id === itemId
                  ? { ...item, sortOrder: insertOrder.sourceSortOrderUpdate }
                  : item,
              )
            : currentItems;

        return sortWorkingCurrentRequestItems([...withSourceAnchor, optimisticItem]);
      };

      setItems(applyOptimisticInsert);
      if (isViewingWorkingRequest) {
        patchWorkingItems(applyOptimisticInsert);
      }
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

        const applyRealIdSwap = (currentItems: PrintRequestItem[]) =>
          sortWorkingCurrentRequestItems(
            currentItems.map((item) => (item.id === pendingId ? createdItem : item)),
          );

        setItems(applyRealIdSwap);
        if (isViewingWorkingRequest) {
          patchWorkingItems(applyRealIdSwap);
        }

        if (createdItem.designId && !designSummaries.has(createdItem.designId)) {
          try {
            const summaries =
              await portalPrintRequestService.getDesignSummariesForItems([createdItem]);
            const design = summaries.get(createdItem.designId) ?? null;
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
        const removeOptimisticInsert = (currentItems: PrintRequestItem[]) =>
          currentItems.filter((item) => item.id !== pendingId);
        setItemClientKeyById((previous) => {
          const next = new Map(previous);
          next.delete(pendingId);
          return next;
        });
        setItems(removeOptimisticInsert);
        if (isViewingWorkingRequest) {
          patchWorkingItems(removeOptimisticInsert);
        }
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
    [designSummaries, firebaseUser, isViewingWorkingRequest, items, patchWorkingItems, printRequestId],
  );

  const removeItem = useCallback(
    async (itemId: string) => {
      if (!printRequestId || !firebaseUser) {
        throw new Error('Unable to remove item.');
      }

      if (isOptimisticPrintRequestItemId(itemId)) {
        throw new Error('Wait for the duplicate to finish saving before removing.');
      }

      // Same generation guard as updateItem: a stale in-flight load resolving after this
      // removal must not resurrect the row.
      beginItemMutation(itemId);

      if (isViewingWorkingRequest) {
        // Mark this item id as pending-removed in the context's single owner of
        // working-request item state (useWorkingCurrentRequestItems) BEFORE the callable
        // resolves, so any concurrent/slower reloadWorkingItems (triggered by an unrelated
        // action — Add to Show cancel, another item's quantity edit) filters this id out of
        // its merge instead of resurrecting it. This is the same mechanism
        // useAddDesignToRequestFlow already relies on for its own optimistic mutations.
        beginPendingItemRemovals([itemId]);
      }

      setIsSaving(true);
      try {
        await portalPrintRequestService.removePrintRequestItem({
          itemId,
          printRequestId,
          userId: firebaseUser.uid,
        });
        setItems((currentItems) => currentItems.filter((item) => item.id !== itemId));
        if (isViewingWorkingRequest) {
          patchWorkingItems((currentItems) =>
            currentItems.filter((item) => item.id !== itemId),
          );
        }
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
        if (isViewingWorkingRequest) {
          // Clear the pending-remove mark after the callable settles (success or error) —
          // matches the begin/end contract useAddDesignToRequestFlow's paths already follow.
          endPendingItemRemovals([itemId]);
        }
      }
    },
    [
      beginItemMutation,
      beginPendingItemRemovals,
      endPendingItemRemovals,
      firebaseUser,
      isViewingWorkingRequest,
      patchWorkingItems,
      printRequestId,
    ],
  );

  const isEditable =
    printRequest?.status === 'draft' || printRequest?.status === 'editing';
  const reconcileQueued = useCallback(() => {
    // Queue success is a locally-known transition, not an external change: the callable response
    // already carries the authoritative outcome. Clear the working-transition flags synchronously
    // so the "request left the working set" effect above does NOT fire its silent reload
    // (1 request read + full item query) — the exact 1+N reread the owner traced after queue
    // success (Wave C comprehensive-audit pass 2, 2026-07-25). Explicit refresh/navigation
    // remains authoritative.
    wasViewingWorkingRef.current = false;
    lastSyncedWorkingSignatureRef.current = null;
    setPrintRequest((current) => (current ? { ...current, status: 'active' } : current));
  }, []);

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
    removeItem,
    reconcileQueued,
  };
}
