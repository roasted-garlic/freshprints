'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';

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

  const pixelWidth =
    pixels?.width ??
    (typeof upload?.widthPx === 'number' && upload.widthPx > 0 ? upload.widthPx : undefined);
  const pixelHeight =
    pixels?.height ??
    (typeof upload?.heightPx === 'number' && upload.heightPx > 0 ? upload.heightPx : undefined);

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
    pixelWidth,
    pixelHeight,
    uploadTechnicalStatus: upload?.technicalStatus ?? null,
  };
}

/**
 * Single owner of working Current Request item loads for Portal chrome
 * (drawer, catalog badges, header badge). Detail page may still load its own
 * richer summaries; it should call `reloadWorkingItems` after mutations that
 * affect the shared Current Request.
 */
export function useWorkingCurrentRequestItems(workingRequest: PrintRequest | null) {
  const [items, setItems] = useState<PrintRequestItem[]>([]);
  const [designSummaries, setDesignSummaries] = useState<
    Map<string, Awaited<ReturnType<typeof portalPrintRequestService.getReadyDesign>>>
  >(new Map());
  const [uploadSummaries, setUploadSummaries] = useState<
    Map<string, CustomerUploadDocSummary | null>
  >(new Map());
  const [isLoadingItems, setIsLoadingItems] = useState(false);
  const [itemsError, setItemsError] = useState<string | null>(null);

  const reloadWorkingItems = useCallback(
    async (options?: { silent?: boolean }) => {
      if (!workingRequest) {
        setItems([]);
        setDesignSummaries(new Map());
        setUploadSummaries(new Map());
        setIsLoadingItems(false);
        setItemsError(null);
        return;
      }

      if (!options?.silent) {
        setIsLoadingItems(true);
      }
      setItemsError(null);

      try {
        const nextItems = await portalPrintRequestService.listPrintRequestItems(workingRequest.id);
        // Update quantities immediately so qty controls feel live; keep existing
        // design thumbs until any newly needed summaries resolve.
        setItems(nextItems);

        const neededDesignIds = [
          ...new Set(
            nextItems
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

        const missingDesignItems = nextItems.filter((item) => {
          const designId = item.designId?.trim();
          return Boolean(designId);
        });

        const [nextDesigns, nextUploads] = await Promise.all([
          portalPrintRequestService.getDesignSummariesForItems(missingDesignItems),
          portalPrintRequestService.getUploadSummariesForItems(nextItems),
        ]);

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
      } catch (error) {
        setItemsError(error instanceof Error ? error.message : 'Unable to load Current Request items.');
      } finally {
        if (!options?.silent) {
          setIsLoadingItems(false);
        }
      }
    },
    [workingRequest],
  );

  useEffect(() => {
    void reloadWorkingItems();
  }, [reloadWorkingItems]);

  const aggregates: CurrentRequestAggregates = useMemo(() => {
    const pixels = new Map<string, { width: number; height: number }>();
    for (const [designId, design] of designSummaries.entries()) {
      pixels.set(designId, { width: design.width, height: design.height });
    }
    const likes = items.map((entry) => toItemLike(entry, pixels, uploadSummaries));
    return buildCurrentRequestAggregates(likes);
  }, [designSummaries, items, uploadSummaries]);

  return {
    workingItems: items,
    designSummaries,
    uploadSummaries,
    aggregates,
    isLoadingItems,
    itemsError,
    reloadWorkingItems,
  };
}
