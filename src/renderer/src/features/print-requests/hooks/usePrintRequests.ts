import { useCallback, useEffect, useState } from "react";

import { useAuth } from "../../auth/hooks/useAuth";
import { permissionService } from "../../permissions/services/permissionService";
import { printRequestService, type PrintRequestItemSummary } from "../services/printRequestService";
import type { PrintRequest } from "@fresh-prints/shared/types/printRequest/printRequest.types";

interface PrintRequestsState {
  requests: PrintRequest[];
  summariesByRequestId: Record<string, PrintRequestItemSummary>;
  error: string | null;
  isLoading: boolean;
}

const initialState: PrintRequestsState = {
  requests: [],
  summariesByRequestId: {},
  error: null,
  isLoading: true,
};

export function usePrintRequests() {
  const { user } = useAuth();
  const [state, setState] = useState<PrintRequestsState>(initialState);

  const loadPrintRequests = useCallback(async () => {
    if (!user || !permissionService.canViewPrintRequests(user)) {
      setState({ requests: [], summariesByRequestId: {}, error: null, isLoading: false });
      return;
    }

    setState((currentState) => ({ ...currentState, error: null, isLoading: true }));

    try {
      const requests = await printRequestService.listPrintRequests(user);
      const summariesByRequestId = await printRequestService.listPrintRequestItemSummariesForRequests(
        user,
        requests.map((request) => request.id),
      );

      setState({ requests, summariesByRequestId, error: null, isLoading: false });
    } catch (error) {
      setState({
        requests: [],
        summariesByRequestId: {},
        error: error instanceof Error ? error.message : "Unable to load print requests.",
        isLoading: false,
      });
    }
  }, [user]);

  useEffect(() => {
    void loadPrintRequests();
  }, [loadPrintRequests]);

  const reloadPrintRequests = useCallback(async () => {
    await loadPrintRequests();
  }, [loadPrintRequests]);

  return {
    ...state,
    reloadPrintRequests,
  };
}
