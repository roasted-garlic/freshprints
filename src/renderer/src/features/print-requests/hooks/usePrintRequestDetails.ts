import { useCallback, useEffect, useRef, useState } from "react";

import { useAuth } from "../../auth/hooks/useAuth";
import { permissionService } from "../../permissions/services/permissionService";
import { printRequestService } from "../services/printRequestService";
import { sortPrintRequestItemsForDisplay } from "../utils/printRequestQueryPlanning";
import type { PrintRequest, PrintRequestItem } from "../../../../../../shared/types/printRequest/printRequest.types";

interface PrintRequestDetailsState {
  printRequest: PrintRequest | null;
  items: PrintRequestItem[];
  error: string | null;
  isLoading: boolean;
  loadedRequestId: string | null;
}

const initialState: PrintRequestDetailsState = {
  printRequest: null,
  items: [],
  error: null,
  isLoading: true,
  loadedRequestId: null,
};

export function usePrintRequestDetails(printRequestId: string | null) {
  const { user } = useAuth();
  const [state, setState] = useState<PrintRequestDetailsState>(initialState);
  const loadSequenceRef = useRef(0);

  const loadDetails = useCallback(async () => {
    const requestSequence = ++loadSequenceRef.current;

    if (!user || !permissionService.canViewPrintRequests(user) || !printRequestId) {
      setState({ printRequest: null, items: [], error: null, isLoading: false, loadedRequestId: null });
      return;
    }

    setState((currentState) => ({ ...currentState, error: null, isLoading: true }));

    try {
      const [printRequest, items] = await Promise.all([
        printRequestService.getPrintRequestById(user, printRequestId),
        printRequestService.listPrintRequestItems(user, printRequestId),
      ]);

      if (requestSequence !== loadSequenceRef.current) {
        return;
      }

      setState({ printRequest, items, error: null, isLoading: false, loadedRequestId: printRequestId });
    } catch (error) {
      if (requestSequence !== loadSequenceRef.current) {
        return;
      }

      setState({
        printRequest: null,
        items: [],
        error: error instanceof Error ? error.message : "Unable to load print request details.",
        isLoading: false,
        loadedRequestId: printRequestId,
      });
    }
  }, [printRequestId, user]);

  useEffect(() => {
    void loadDetails();
  }, [loadDetails]);

  const reloadPrintRequest = useCallback(async () => {
    await loadDetails();
  }, [loadDetails]);

  const replacePrintRequest = useCallback((printRequest: PrintRequest) => {
    setState((currentState) => ({
      ...currentState,
      printRequest,
    }));
  }, []);

  const replaceItem = useCallback((item: PrintRequestItem) => {
    setState((currentState) => ({
      ...currentState,
      items: sortPrintRequestItemsForDisplay(
        currentState.items.map((currentItem) => (currentItem.id === item.id ? item : currentItem)),
      ),
    }));
  }, []);

  const addItem = useCallback((item: PrintRequestItem) => {
    setState((currentState) => ({
      ...currentState,
      items: sortPrintRequestItemsForDisplay([...currentState.items, item]),
      printRequest: currentState.printRequest
        ? {
            ...currentState.printRequest,
            itemCount: currentState.printRequest.itemCount + 1,
          }
        : currentState.printRequest,
    }));
  }, []);

  const removeItem = useCallback((itemId: string) => {
    setState((currentState) => ({
      ...currentState,
      items: currentState.items.filter((item) => item.id !== itemId),
      printRequest: currentState.printRequest
        ? {
            ...currentState.printRequest,
            itemCount: Math.max(0, currentState.printRequest.itemCount - 1),
          }
        : currentState.printRequest,
    }));
  }, []);

  return {
    ...state,
    addItem,
    reloadPrintRequest,
    removeItem,
    replaceItem,
    replacePrintRequest,
  };
}
