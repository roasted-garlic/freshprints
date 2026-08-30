'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import type { PrintRequest } from '@fresh-prints/shared/types/printRequest/printRequest.types';
import { resolvePrintRequestDefaultWidthInches } from '@fresh-prints/shared/utils/printRequestItemSizing';

import { useAuth } from '../../auth/context/AuthContext';
import type { CatalogDesign } from '../../catalog/types/catalog.types';
import { usePortalStandardPrintSizes } from './usePortalStandardPrintSizes';
import { portalPrintRequestService } from '../services/portalPrintRequestService';
import {
  awaitPendingSeedPersist,
  awaitPendingSeedPersists,
} from '../utils/seedPersistRegistry';
import { usePrintRequestDetail } from './usePrintRequestDetail';

interface SelectedDesignSelection {
  quantity: number;
  existingItemId?: string;
  isExisting: boolean;
}

type SelectionState = Record<string, SelectedDesignSelection>;

function catalogSelectionItems(
  items: Array<{ designId?: string; id: string; quantity: number }>,
): Array<{ designId: string; id: string; quantity: number }> {
  return items.filter(
    (item): item is { designId: string; id: string; quantity: number } =>
      typeof item.designId === 'string' && item.designId.length > 0,
  );
}

function buildSelectionStateFromRequestItems(items: Array<{ designId?: string; id: string; quantity: number }>) {
  const nextState: SelectionState = {};

  for (const item of catalogSelectionItems(items)) {
    nextState[item.designId] = {
      quantity: item.quantity,
      existingItemId: item.id,
      isExisting: true,
    };
  }

  return nextState;
}

function buildSelectionSignature(items: Array<{ designId?: string; id: string; quantity: number }>): string {
  return catalogSelectionItems(items)
    .map((item) => `${item.id}:${item.designId}:${item.quantity}`)
    .join('|');
}

function buildQuantitySignature(state: SelectionState): string {
  return Object.entries(state)
    .sort(([leftDesignId], [rightDesignId]) => leftDesignId.localeCompare(rightDesignId))
    .map(([designId, selection]) => `${designId}:${selection.quantity}`)
    .join('|');
}

function buildQuantitySignatureFromItems(items: Array<{ designId?: string; quantity: number }>): string {
  return catalogSelectionItems(
    items.map((item, index) => ({
      designId: item.designId,
      id: `sig-${index}`,
      quantity: item.quantity,
    })),
  )
    .slice()
    .sort((left, right) => left.designId.localeCompare(right.designId))
    .map((item) => `${item.designId}:${item.quantity}`)
    .join('|');
}

export function usePortalPrintRequestSelectionMode(printRequestId: string | null) {
  const { firebaseUser } = useAuth();
  const { settings: standardPrintSizesSettings } = usePortalStandardPrintSizes();
  const printRequestDefaultWidthInches = useMemo(
    () => resolvePrintRequestDefaultWidthInches(standardPrintSizesSettings),
    [standardPrintSizesSettings],
  );
  const [selectedDesigns, setSelectedDesigns] = useState<SelectionState>({});
  const hydratedRequestIdRef = useRef<string | null>(null);
  const hydratedSelectionSignatureRef = useRef<string | null>(null);
  const intentionallyRemovedDesignIdsRef = useRef<Set<string>>(new Set());
  const pendingRemovalWorkRef = useRef<Set<Promise<unknown>>>(new Set());
  const [isSaving, setIsSaving] = useState(false);

  const { error, isLoading, items, printRequest, reload, removeItem } = usePrintRequestDetail(
    printRequestId ?? undefined,
  );

  useEffect(() => {
    if (!printRequestId) {
      hydratedRequestIdRef.current = null;
      hydratedSelectionSignatureRef.current = null;
      intentionallyRemovedDesignIdsRef.current.clear();
      setSelectedDesigns({});
      return;
    }

    if (isLoading) {
      return;
    }

    const nextSignature = buildSelectionSignature(items);

    if (
      hydratedRequestIdRef.current === printRequestId &&
      hydratedSelectionSignatureRef.current === nextSignature
    ) {
      return;
    }

    if (!printRequest || error) {
      hydratedRequestIdRef.current = printRequestId;
      hydratedSelectionSignatureRef.current = null;
      setSelectedDesigns({});
      return;
    }

    // Drop intentional removals from the "still pending on server" set once the server agrees.
    for (const designId of [...intentionallyRemovedDesignIdsRef.current]) {
      if (!items.some((item) => item.designId === designId)) {
        intentionallyRemovedDesignIdsRef.current.delete(designId);
      }
    }

    setSelectedDesigns((current) => {
      const fromServer = buildSelectionStateFromRequestItems(items);
      const merged: SelectionState = { ...fromServer };

      for (const designId of intentionallyRemovedDesignIdsRef.current) {
        delete merged[designId];
      }

      // Keep optimistic seed / local adds until the server item appears.
      for (const [designId, selection] of Object.entries(current)) {
        if (
          !selection.isExisting &&
          !merged[designId] &&
          !intentionallyRemovedDesignIdsRef.current.has(designId)
        ) {
          merged[designId] = selection;
        }
      }

      return merged;
    });
    hydratedRequestIdRef.current = printRequestId;
    hydratedSelectionSignatureRef.current = nextSignature;
  }, [error, isLoading, items, printRequest, printRequestId]);

  const addDesign = useCallback((design: CatalogDesign) => {
    intentionallyRemovedDesignIdsRef.current.delete(design.id);
    setSelectedDesigns((current) => {
      if (current[design.id]) {
        return current;
      }

      return {
        ...current,
        [design.id]: {
          quantity: 1,
          isExisting: false,
        },
      };
    });
  }, []);

  const clearNewSelection = useCallback((designId: string) => {
    setSelectedDesigns((current) => {
      const existing = current[designId];

      if (!existing || existing.isExisting) {
        return current;
      }

      const nextState = { ...current };
      delete nextState[designId];
      return nextState;
    });
  }, []);

  const trackRemovalWork = useCallback((work: Promise<unknown>) => {
    pendingRemovalWorkRef.current.add(work);
    void work.finally(() => {
      pendingRemovalWorkRef.current.delete(work);
    });
    return work;
  }, []);

  const removeDesign = useCallback(
    async (designId: string) => {
      const existingSelection = selectedDesigns[designId];

      if (!existingSelection) {
        return;
      }

      intentionallyRemovedDesignIdsRef.current.add(designId);
      setSelectedDesigns((current) => {
        const nextState = { ...current };
        delete nextState[designId];
        return nextState;
      });

      if (!firebaseUser || !printRequestId) {
        return;
      }

      const work = (async () => {
        try {
          if (existingSelection.isExisting && existingSelection.existingItemId) {
            await removeItem(existingSelection.existingItemId);
            return;
          }

          // Just-seeded designs are local-only until background persist finishes.
          await awaitPendingSeedPersist(printRequestId, designId);
          const currentItems = await portalPrintRequestService.listPrintRequestItems(printRequestId);
          const createdItem = currentItems.find((item) => item.designId === designId);

          if (createdItem) {
            await removeItem(createdItem.id);
          }
        } catch {
          intentionallyRemovedDesignIdsRef.current.delete(designId);
          await reload({ silent: true });
        }
      })();

      await trackRemovalWork(work);
    },
    [firebaseUser, printRequestId, reload, removeItem, selectedDesigns, trackRemovalWork],
  );

  const setQuantity = useCallback((designId: string, quantity: number) => {
    const nextQuantity = Math.max(1, Math.floor(quantity));

    setSelectedDesigns((current) => {
      const existing = current[designId];

      if (existing) {
        return {
          ...current,
          [designId]: {
            ...existing,
            quantity: nextQuantity,
          },
        };
      }

      return {
        ...current,
        [designId]: {
          quantity: nextQuantity,
          isExisting: false,
        },
      };
    });
  }, []);

  const selectedDesignCount = useMemo(() => Object.keys(selectedDesigns).length, [selectedDesigns]);

  const baselineQuantitySignature = useMemo(() => buildQuantitySignatureFromItems(items), [items]);

  const currentQuantitySignature = useMemo(
    () => buildQuantitySignature(selectedDesigns),
    [selectedDesigns],
  );

  const hasPendingChanges = useMemo(
    () => currentQuantitySignature !== baselineQuantitySignature,
    [baselineQuantitySignature, currentQuantitySignature],
  );

  const totalQuantity = useMemo(
    () => Object.values(selectedDesigns).reduce((sum, selection) => sum + selection.quantity, 0),
    [selectedDesigns],
  );

  const flushPendingMutations = useCallback(async () => {
    if (!printRequestId) {
      return;
    }

    await awaitPendingSeedPersists(printRequestId);
    await Promise.all([...pendingRemovalWorkRef.current]);
  }, [printRequestId]);

  const saveSelections = useCallback(async (options?: { skipReload?: boolean }) => {
    if (!firebaseUser || !printRequestId || !printRequest) {
      return;
    }

    setIsSaving(true);

    try {
      await flushPendingMutations();

      const latestItems = await portalPrintRequestService.listPrintRequestItems(printRequestId);
      const selectedDesignIds = new Set(Object.keys(selectedDesigns));
      const removedItems = latestItems.filter(
        (item) => item.designId && !selectedDesignIds.has(item.designId),
      );

      for (const item of removedItems) {
        await portalPrintRequestService.removePrintRequestItem({
          itemId: item.id,
          printRequestId,
          userId: firebaseUser.uid,
        });
      }

      const quantityByExistingItemId = new Map(latestItems.map((item) => [item.id, item.quantity]));
      const dirtySelections = Object.entries(selectedDesigns)
        .filter(([, selection]) => {
          if (!selection.isExisting || !selection.existingItemId) {
            return true;
          }

          return quantityByExistingItemId.get(selection.existingItemId) !== selection.quantity;
        })
        .map(([designId, selection]) => ({
          designId,
          quantity: selection.quantity,
        }));

      if (dirtySelections.length > 0) {
        await portalPrintRequestService.savePrintRequestDesignSelections({
          printRequestId,
          userId: firebaseUser.uid,
          selections: dirtySelections,
          printRequestDefaultWidthInches,
        });
      }

      if (!options?.skipReload) {
        await reload({ silent: true });
      }
    } finally {
      setIsSaving(false);
    }
  }, [
    firebaseUser,
    flushPendingMutations,
    printRequest,
    printRequestDefaultWidthInches,
    printRequestId,
    reload,
    selectedDesigns,
  ]);

  return {
    error,
    hasPendingChanges,
    isLoading,
    isSaving,
    printRequest: printRequest as PrintRequest | null,
    selectedDesignCount,
    selectedDesigns,
    totalQuantity,
    addDesign,
    clearNewSelection,
    flushPendingMutations,
    refreshSelection: reload,
    removeDesign,
    saveSelections,
    setQuantity,
  };
}
