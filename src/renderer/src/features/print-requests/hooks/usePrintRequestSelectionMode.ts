import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { useAuth } from "../../auth/hooks/useAuth";
import { permissionService } from "../../permissions/services/permissionService";
import { printRequestService } from "../services/printRequestService";
import { usePrintRequestDetails } from "./usePrintRequestDetails";
import type { Design } from "../../designs/types/design.types";
import type { PrintRequest } from "@fresh-prints/shared/types/printRequest/printRequest.types";

interface SelectedDesignSelection {
  quantity: number;
  existingItemId?: string;
  isExisting: boolean;
}

type SelectionState = Record<string, SelectedDesignSelection>;

interface UsePrintRequestSelectionModeResult {
  error: string | null;
  isLoading: boolean;
  isSaving: boolean;
  printRequest: PrintRequest | null;
  selectedDesignCount: number;
  selectedDesigns: SelectionState;
  totalQuantity: number;
  addDesign: (design: Design) => void;
  clearNewSelection: (designId: string) => void;
    refreshSelection: () => Promise<void>;
  removeDesign: (designId: string) => Promise<void>;
  saveSelections: () => Promise<void>;
  setQuantity: (designId: string, quantity: number) => void;
}

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
  return items.map((item) => `${item.id}:${item.designId}:${item.quantity}`).join("|");
}

export function usePrintRequestSelectionMode(printRequestId: string | null): UsePrintRequestSelectionModeResult {
  const { user } = useAuth();
  const [selectedDesigns, setSelectedDesigns] = useState<SelectionState>({});
  const hydratedRequestIdRef = useRef<string | null>(null);
  const hydratedSelectionSignatureRef = useRef<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const {
    error,
    isLoading,
    items,
    printRequest,
    reloadPrintRequest,
  } = usePrintRequestDetails(printRequestId);

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

  const addDesign = useCallback((design: Design) => {
    setSelectedDesigns((current) => {
      const existing = current[design.id];

      if (existing) {
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

      if (!user || !permissionService.canManagePrintRequestItems(user)) {
        return;
      }

      await printRequestService.removePrintRequestItem(user, existingSelection.existingItemId);
      await reloadPrintRequest();
    },
    [clearNewSelection, reloadPrintRequest, selectedDesigns, user],
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

  const totalQuantity = useMemo(
    () => Object.values(selectedDesigns).reduce((sum, selection) => sum + selection.quantity, 0),
    [selectedDesigns],
  );

  const refreshSelection = useCallback(async () => {
    await reloadPrintRequest();
  }, [reloadPrintRequest]);

  const saveSelections = useCallback(async () => {
    if (!user || !printRequestId || !printRequest || !permissionService.canManagePrintRequestItems(user)) {
      return;
    }

    setIsSaving(true);

    try {
      await printRequestService.savePrintRequestDesignSelections(
        user,
        printRequestId,
        Object.entries(selectedDesigns).map(([designId, selection]) => ({
          designId,
          quantity: selection.quantity,
        })),
      );

      await reloadPrintRequest();
    } finally {
      setIsSaving(false);
    }
  }, [printRequest, printRequestId, reloadPrintRequest, selectedDesigns, user]);

  return {
    error,
    isLoading,
    isSaving,
    printRequest,
    selectedDesignCount,
    selectedDesigns,
    totalQuantity,
    addDesign,
    clearNewSelection,
    refreshSelection,
    removeDesign,
    saveSelections,
    setQuantity,
  };
}
