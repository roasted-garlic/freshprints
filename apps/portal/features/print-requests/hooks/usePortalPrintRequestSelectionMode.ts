'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import type { PrintRequest } from '@fresh-prints/shared/types/printRequest/printRequest.types';

import { useAuth } from '../../auth/context/AuthContext';
import type { CatalogDesign } from '../../catalog/types/catalog.types';
import { portalPrintRequestService } from '../services/portalPrintRequestService';
import { usePrintRequestDetail } from './usePrintRequestDetail';

interface SelectedDesignSelection {
  quantity: number;
  existingItemId?: string;
  isExisting: boolean;
}

type SelectionState = Record<string, SelectedDesignSelection>;

function buildSelectionStateFromRequestItems(items: Array<{ designId: string; id: string; quantity: number }>) {
  const nextState: SelectionState = {};

  for (const item of items) {
    nextState[item.designId] = {
      quantity: item.quantity,
      existingItemId: item.id,
      isExisting: true,
    };
  }

  return nextState;
}

function buildSelectionSignature(items: Array<{ designId: string; id: string; quantity: number }>): string {
  return items.map((item) => `${item.id}:${item.designId}:${item.quantity}`).join('|');
}

export function usePortalPrintRequestSelectionMode(printRequestId: string | null) {
  const { firebaseUser } = useAuth();
  const [selectedDesigns, setSelectedDesigns] = useState<SelectionState>({});
  const hydratedRequestIdRef = useRef<string | null>(null);
  const hydratedSelectionSignatureRef = useRef<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const { error, isLoading, items, printRequest, reload, removeItem } = usePrintRequestDetail(
    printRequestId ?? undefined,
  );

  useEffect(() => {
    if (!printRequestId) {
      hydratedRequestIdRef.current = null;
      hydratedSelectionSignatureRef.current = null;
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

    setSelectedDesigns(buildSelectionStateFromRequestItems(items));
    hydratedRequestIdRef.current = printRequestId;
    hydratedSelectionSignatureRef.current = nextSignature;
  }, [error, isLoading, items, printRequest, printRequestId]);

  const addDesign = useCallback((design: CatalogDesign) => {
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

  const removeDesign = useCallback(
    async (designId: string) => {
      const existingSelection = selectedDesigns[designId];

      if (!existingSelection) {
        return;
      }

      if (!existingSelection.isExisting || !existingSelection.existingItemId) {
        clearNewSelection(designId);
        return;
      }

      if (!firebaseUser || !printRequestId) {
        return;
      }

      setSelectedDesigns((current) => {
        const nextState = { ...current };
        delete nextState[designId];
        return nextState;
      });

      try {
        await removeItem(existingSelection.existingItemId);
      } catch {
        await reload({ silent: true });
      }
    },
    [clearNewSelection, firebaseUser, printRequestId, reload, removeItem, selectedDesigns],
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

  const hasNewSelections = useMemo(
    () => Object.values(selectedDesigns).some((selection) => !selection.isExisting),
    [selectedDesigns],
  );

  const totalQuantity = useMemo(
    () => Object.values(selectedDesigns).reduce((sum, selection) => sum + selection.quantity, 0),
    [selectedDesigns],
  );

  const saveSelections = useCallback(async (options?: { skipReload?: boolean }) => {
    if (!firebaseUser || !printRequestId || !printRequest) {
      return;
    }

    setIsSaving(true);

    try {
      await portalPrintRequestService.savePrintRequestDesignSelections({
        printRequestId,
        userId: firebaseUser.uid,
        selections: Object.entries(selectedDesigns).map(([designId, selection]) => ({
          designId,
          quantity: selection.quantity,
        })),
      });

      if (!options?.skipReload) {
        await reload({ silent: true });
      }
    } finally {
      setIsSaving(false);
    }
  }, [firebaseUser, printRequest, printRequestId, reload, selectedDesigns]);

  return {
    error,
    hasNewSelections,
    isLoading,
    isSaving,
    printRequest: printRequest as PrintRequest | null,
    selectedDesignCount,
    selectedDesigns,
    totalQuantity,
    addDesign,
    clearNewSelection,
    refreshSelection: reload,
    removeDesign,
    saveSelections,
    setQuantity,
  };
}
