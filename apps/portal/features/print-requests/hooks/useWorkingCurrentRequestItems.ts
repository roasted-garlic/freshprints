'use client';

import { useCallback, useEffect, useMemo, useRef, useState, type Dispatch, type SetStateAction } from 'react';

import type { PrintRequest } from '@fresh-prints/shared/types/printRequest/printRequest.types';
import type { PrintRequestItem } from '@fresh-prints/shared/types/printRequest/printRequest.types';
import {
  buildCurrentRequestAggregates,
  type CurrentRequestAggregates,
  type CurrentRequestItemLike,
} from '@fresh-prints/shared/utils/currentRequestAggregates';

import {
  portalPrintRequestService,
} from '../services/portalPrintRequestService';
import type { CustomerUploadDocSummary } from '../../customer-uploads/services/customerUploadService';
import { mergeServerWorkingItemsWithLocal } from '../utils/mergeServerWorkingItemsWithLocal';
import { sortWorkingCurrentRequestItems } from '../utils/sortWorkingCurrentRequestItems';

function toItemLike(
  item: PrintRequestItem,
  designPixels: Map<string, { width: number; height: number }>,
  uploadSummaries: Map<string, CustomerUploadDocSummary | null>,
): CurrentRequestItemLike {
  const designId = item.designId?.trim();
  const pixels = designId ? designPixels.get(designId) : undefined;
  const upload = item.customerUploadId
    ? uploadSummaries.get(item.customerUploadId)
    : null;

  const rawPixelWidth =
    pixels?.width ??
    (typeof upload?.widthPx === 'number' && upload.widthPx > 0 ? upload.widthPx : undefined);
  const rawPixelHeight =
    pixels?.height ??
    (typeof upload?.heightPx === 'number' && upload.heightPx > 0 ? upload.heightPx : undefined);
  // Ignore legacy 1×1 seed placeholders so Stash does not false-flag attention.
  const isPlaceholderPixels = rawPixelWidth === 1 && rawPixelHeight === 1;

  return {
    id: item.id,
    designId: item.designId,
    customerUploadId: item.customerUploadId,
    sourceType: item.sourceType,
    quantity: item.quantity,
    printWidthInches: item.printWidthInches,
    printHeightInches: item.printHeightInches,
    createdAtMs:
      item.createdAt && typeof item.createdAt.toMillis === 'function'
        ? item.createdAt.toMillis()
        : 0,
    pixelWidth: isPlaceholderPixels ? undefined : rawPixelWidth,
    pixelHeight: isPlaceholderPixels ? undefined : rawPixelHeight,
    uploadTechnicalStatus: upload?.technicalStatus ?? null,
  };
}

/**
 * Single owner of working Current Request item loads for Portal chrome
 * (drawer, catalog badges, header badge). Detail page keeps richer summaries
 * but mirrors `workingItems` while viewing the Current Request so clear/remove
 * from the drawer update the page immediately.
 */
export function useWorkingCurrentRequestItems(workingRequest: PrintRequest | null) {
  const [items, setItems] = useState<PrintRequestItem[]>([]);
  const [designSummaries, setDesignSummaries] = useState<
    Map<string, Awaited<ReturnType<typeof portalPrintRequestService.getReadyDesign>>>
  >(new Map());
  const designSummariesRef = useRef(designSummaries);
  designSummariesRef.current = designSummaries;
  const [uploadSummaries, setUploadSummaries] = useState<
    Map<string, CustomerUploadDocSummary | null>
  >(new Map());
  const [isLoadingItems, setIsLoadingItems] = useState(false);
  const [itemsError, setItemsError] = useState<string | null>(null);
  /**
   * Working-request id whose item list has finished loading at least once.
   * `undefined` = never hydrated; `null` = hydrated as empty (no working request).
   * Used so quota UI does not treat the initial `[]` as "0 prints used".
   */
  const [hydratedWorkingRequestId, setHydratedWorkingRequestId] = useState<
    string | null | undefined
  >(undefined);

  /** True once a real working request has been linked this session (not optimistic-only). */
  const hasLinkedWorkingRequestRef = useRef(false);
  /** Updated only in effect / resetWorkingCart — never synced on render (would hide transitions). */
  const workingRequestIdRef = useRef<string | null>(null);
  /**
   * Item ids optimistically removed but not yet confirmed by the server list.
   * Silent reloads must not resurrect these during rapid multi-remove.
   */
  const pendingRemovedItemIdsRef = useRef(new Set<string>());
  /** Monotonic epoch so a slower list response cannot overwrite a newer one. */
  const reloadEpochRef = useRef(0);

  const filterPendingRemoved = useCallback((nextItems: PrintRequestItem[]) => {
    const pending = pendingRemovedItemIdsRef.current;
    if (pending.size === 0) {
      return nextItems;
    }
    return nextItems.filter((item) => !pending.has(item.id));
  }, []);

  const beginPendingItemRemovals = useCallback((itemIds: string[]) => {
    for (const itemId of itemIds) {
      const trimmed = itemId.trim();
      if (trimmed) {
        pendingRemovedItemIdsRef.current.add(trimmed);
      }
    }
  }, []);

  const endPendingItemRemovals = useCallback((itemIds: string[]) => {
    for (const itemId of itemIds) {
      pendingRemovedItemIdsRef.current.delete(itemId.trim());
    }
  }, []);

  const resetWorkingCart = useCallback(() => {
    hasLinkedWorkingRequestRef.current = true;
    workingRequestIdRef.current = null;
    pendingRemovedItemIdsRef.current.clear();
    reloadEpochRef.current += 1;
    setItems([]);
    setDesignSummaries(new Map());
    setUploadSummaries(new Map());
    setItemsError(null);
    setIsLoadingItems(false);
    setHydratedWorkingRequestId(null);
  }, []);

  const reloadWorkingItems = useCallback(
    async (options?: { silent?: boolean; printRequestId?: string }) => {
      const linkedId = options?.printRequestId ?? workingRequestIdRef.current;
      const epoch = ++reloadEpochRef.current;

      if (!linkedId) {
        // Keep optimistic first-add only before any real working request existed.
        if (hasLinkedWorkingRequestRef.current) {
          pendingRemovedItemIdsRef.current.clear();
          setItems([]);
          setDesignSummaries(new Map());
          setUploadSummaries(new Map());
        }
        if (!options?.silent) {
          setIsLoadingItems(false);
        }
        setItemsError(null);
        if (epoch === reloadEpochRef.current) {
          setHydratedWorkingRequestId(null);
        }
        return;
      }

      if (!options?.silent) {
        setIsLoadingItems(true);
      }
      setItemsError(null);

      try {
        const nextItems = await portalPrintRequestService.listPrintRequestItems(linkedId);
        // Drop late responses if the cart was reset / working request changed / a newer reload started.
        if (epoch !== reloadEpochRef.current) {
          return;
        }
        if (workingRequestIdRef.current !== linkedId && !options?.printRequestId) {
          return;
        }

        const visibleItems = filterPendingRemoved(nextItems);
        // Merge so first-create / rapid-add optimistic rows are not wiped by a
        // partial server snapshot (list lag while flushes are still in flight).
        let mergedItems: PrintRequestItem[] = visibleItems;
        setItems((current) => {
          mergedItems = mergeServerWorkingItemsWithLocal(visibleItems, current);
          return mergedItems;
        });

        const neededDesignIds = [
          ...new Set(
            mergedItems
              .map((item) => item.designId?.trim())
              .filter((designId): designId is string => Boolean(designId)),
          ),
        ];

        setDesignSummaries((previous) => {
          const kept = new Map(previous);
          for (const designId of [...kept.keys()]) {
            if (!neededDesignIds.includes(designId)) {
              kept.delete(designId);
            }
          }
          return kept;
        });

        const missingDesignItems = mergedItems.filter((item) => {
          const designId = item.designId?.trim();
          return Boolean(designId);
        });

        const [nextDesigns, nextUploads] = await Promise.all([
          portalPrintRequestService.getDesignSummariesForItems(missingDesignItems),
          portalPrintRequestService.getUploadSummariesForItems(mergedItems),
        ]);

        if (epoch !== reloadEpochRef.current) {
          return;
        }
        if (workingRequestIdRef.current !== linkedId && !options?.printRequestId) {
          return;
        }

        setDesignSummaries((previous) => {
          const next = new Map(previous);
          for (const [designId, design] of nextDesigns.entries()) {
            if (design) {
              next.set(designId, design);
            }
          }
          for (const designId of [...next.keys()]) {
            if (!neededDesignIds.includes(designId)) {
              next.delete(designId);
            }
          }
          return next;
        });
        setUploadSummaries(nextUploads);
        setHydratedWorkingRequestId(linkedId);
      } catch (error) {
        if (epoch === reloadEpochRef.current) {
          setItemsError(error instanceof Error ? error.message : 'Unable to load Current Request items.');
        }
      } finally {
        if (!options?.silent && epoch === reloadEpochRef.current) {
          setIsLoadingItems(false);
        }
      }
    },
    [filterPendingRemoved],
  );

  useEffect(() => {
    const nextId = workingRequest?.id ?? null;
    const previousId = workingRequestIdRef.current;

    if (nextId) {
      hasLinkedWorkingRequestRef.current = true;
    }

    if (previousId && !nextId) {
      // Working request left the continuable set (queued to show, archived, etc.).
      resetWorkingCart();
      return;
    }

    workingRequestIdRef.current = nextId;
    void reloadWorkingItems();
  }, [reloadWorkingItems, resetWorkingCart, workingRequest?.id]);

  const aggregates: CurrentRequestAggregates = useMemo(() => {
    const pixels = new Map<string, { width: number; height: number }>();
    for (const [designId, design] of designSummaries.entries()) {
      pixels.set(designId, { width: design.width, height: design.height });
    }
    const likes = items.map((entry) => toItemLike(entry, pixels, uploadSummaries));
    return buildCurrentRequestAggregates(likes);
  }, [designSummaries, items, uploadSummaries]);

  const patchWorkingItems = useCallback<Dispatch<SetStateAction<PrintRequestItem[]>>>((update) => {
    setItems((current) => {
      const next = typeof update === 'function' ? update(current) : update;
      return sortWorkingCurrentRequestItems(next);
    });
  }, []);

  type DesignSummary = Awaited<ReturnType<typeof portalPrintRequestService.getReadyDesign>>;

  const seedDesignSummary = useCallback((designId: string, summary: DesignSummary) => {
    const trimmed = designId.trim();
    if (!trimmed) {
      return;
    }
    // Never seed placeholder 1×1 pixels — that falsely flags Stash "needs attention".
    if (
      !Number.isFinite(summary.width) ||
      summary.width <= 1 ||
      !Number.isFinite(summary.height) ||
      summary.height <= 1
    ) {
      return;
    }
    setDesignSummaries((previous) => {
      const next = new Map(previous);
      next.set(trimmed, summary);
      return next;
    });
  }, []);

  const ensureDesignSummaries = useCallback(async (designIds: string[]) => {
    const uniqueIds = [
      ...new Set(designIds.map((id) => id.trim()).filter((id): id is string => Boolean(id))),
    ];
    const missingIds = uniqueIds.filter((id) => !designSummariesRef.current.has(id));
    if (missingIds.length === 0) {
      return;
    }

    const fetched = await Promise.all(
      missingIds.map(async (designId) => {
        try {
          const design = await portalPrintRequestService.getReadyDesign(designId);
          return [designId, design] as const;
        } catch {
          return [designId, null] as const;
        }
      }),
    );

    setDesignSummaries((previous) => {
      const next = new Map(previous);
      for (const [designId, design] of fetched) {
        if (design) {
          next.set(designId, design);
        }
      }
      return next;
    });
  }, []);

  return {
    workingItems: items,
    designSummaries,
    uploadSummaries,
    aggregates,
    isLoadingItems,
    /**
     * Id of the working request whose items have been fetched (`null` = empty cart known).
     * `undefined` until the first resolve — do not treat `workingItems` as authoritative yet.
     */
    hydratedWorkingRequestId,
    itemsError,
    beginPendingItemRemovals,
    endPendingItemRemovals,
    ensureDesignSummaries,
    patchWorkingItems,
    seedDesignSummary,
    reloadWorkingItems,
    resetWorkingCart,
  };
}
