import { useCallback, useEffect, useRef, useState } from "react";

import { useAuth } from "../../auth/hooks/useAuth";
import { permissionService } from "../../permissions/services/permissionService";
import {
  printRequestService,
  PRINT_REQUEST_LIST_PAGE_SIZE,
  type PrintRequestItemSummary,
  type PrintRequestListCursor,
} from "../services/printRequestService";
import {
  clearPrintRequestsPageCache,
  loadPrintRequestsPageCached,
} from "../services/printRequestsPageReadCache";
import { reconcileDeletedOrArchivedRequest as reconcileDeletedOrArchivedRequestInState } from "../utils/reconcileDeletedOrArchivedRequest";
import type { PrintRequestListTab } from "@fresh-prints/shared/utils/printRequestListGrouping";
import type { PrintRequest } from "@fresh-prints/shared/types/printRequest/printRequest.types";
import type { Customer } from "@fresh-prints/shared/types/customer/customer.types";

const COUNTABLE_TABS: readonly PrintRequestListTab[] = ["working", "queued", "printing", "printed"];

interface PrintRequestsState {
  requests: PrintRequest[];
  summariesByRequestId: Record<string, PrintRequestItemSummary>;
  allocationTotalsByRequestId: Record<
    string,
    { totalAllocatedQuantity: number; totalInProgressQuantity: number; totalPrintedQuantity: number }
  >;
  customersById: Record<string, Customer>;
  countsByTab: Record<PrintRequestListTab, number>;
  hasMore: boolean;
  error: string | null;
  isLoading: boolean;
  isLoadingMore: boolean;
}

const initialState: PrintRequestsState = {
  requests: [],
  summariesByRequestId: {},
  allocationTotalsByRequestId: {},
  customersById: {},
  countsByTab: { working: 0, queued: 0, printing: 0, printed: 0 },
  hasMore: false,
  error: null,
  isLoading: true,
  isLoadingMore: false,
};

interface LoadPrintRequestsOptions {
  silent?: boolean;
}

export function mergePrintRequestsById(
  current: PrintRequest[],
  additions: PrintRequest[],
): PrintRequest[] {
  const byId = new Map(current.map((request) => [request.id, request]));
  for (const request of additions) {
    byId.set(request.id, request);
  }
  return [...byId.values()];
}

export function usePrintRequests(activeTab: PrintRequestListTab) {
  const { user } = useAuth();
  const [state, setState] = useState<PrintRequestsState>(initialState);
  const cursorRef = useRef<PrintRequestListCursor | undefined>(undefined);
  const requestGenerationRef = useRef(0);

  const loadCounts = useCallback(async (): Promise<Record<PrintRequestListTab, number>> => {
    if (!user) {
      return initialState.countsByTab;
    }
    const cacheKeyBase = `counts`;
    const entries = await Promise.all(
      COUNTABLE_TABS.map(async (tab) => {
        const count = await loadPrintRequestsPageCached(user.id, `${cacheKeyBase}:${tab}`, () =>
          printRequestService.countPrintRequests(user, { queueTab: tab }),
        );
        return [tab, count] as const;
      }),
    );
    return Object.fromEntries(entries) as Record<PrintRequestListTab, number>;
  }, [user]);

  const hydratePage = useCallback(
    async (requests: PrintRequest[]) => {
      if (!user) {
        return { summariesByRequestId: {}, allocationTotalsByRequestId: {}, customersById: {} };
      }
      const requestIds = requests.map((request) => request.id);
      const customerIds = requests
        .filter((request) => !request.isInternal && request.customerId)
        .map((request) => request.customerId as string);

      const [summariesByRequestId, allocationTotalsByRequestId, customers] = await Promise.all([
        requestIds.length > 0
          ? printRequestService.listPrintRequestItemSummariesForRequests(user, requestIds)
          : Promise.resolve({}),
        requestIds.length > 0
          ? printRequestService.listAllocationTotalsForRequests(user, requestIds)
          : Promise.resolve({}),
        customerIds.length > 0
          ? printRequestService.listCustomersByIds(user, customerIds)
          : Promise.resolve([]),
      ]);

      return {
        summariesByRequestId,
        allocationTotalsByRequestId,
        customersById: Object.fromEntries(customers.map((customer) => [customer.id, customer])),
      };
    },
    [user],
  );

  const loadFirstPage = useCallback(
    async (options?: LoadPrintRequestsOptions) => {
      if (!user || !permissionService.canViewPrintRequests(user)) {
        setState({ ...initialState, isLoading: false });
        return;
      }

      const generation = ++requestGenerationRef.current;
      setState((current) => ({
        ...current,
        error: null,
        isLoading: options?.silent ? current.isLoading : true,
      }));

      try {
        const [countsByTab, page] = await Promise.all([
          loadCounts(),
          loadPrintRequestsPageCached(user.id, `list:${activeTab}:page-1`, () =>
            printRequestService.listPrintRequestsPage(user, {
              queueTab: activeTab,
              limitCount: PRINT_REQUEST_LIST_PAGE_SIZE,
            }),
          ),
        ]);
        if (generation !== requestGenerationRef.current) {
          return;
        }
        const hydrated = await hydratePage(page.requests);
        if (generation !== requestGenerationRef.current) {
          return;
        }
        cursorRef.current = page.nextCursor;
        setState({
          requests: page.requests,
          ...hydrated,
          countsByTab,
          hasMore: page.hasMore,
          error: null,
          isLoading: false,
          isLoadingMore: false,
        });
      } catch (error) {
        if (generation !== requestGenerationRef.current) {
          return;
        }
        setState((current) => ({
          ...current,
          error: error instanceof Error ? error.message : "Unable to load print requests.",
          isLoading: false,
        }));
      }
    },
    [activeTab, hydratePage, loadCounts, user],
  );

  useEffect(() => {
    cursorRef.current = undefined;
    void loadFirstPage();
  }, [loadFirstPage]);

  const loadMore = useCallback(async () => {
    if (!user || !cursorRef.current) {
      return;
    }
    const generation = requestGenerationRef.current;
    setState((current) => ({ ...current, isLoadingMore: true }));
    try {
      const page = await printRequestService.listPrintRequestsPage(user, {
        queueTab: activeTab,
        limitCount: PRINT_REQUEST_LIST_PAGE_SIZE,
        cursor: cursorRef.current,
      });
      if (generation !== requestGenerationRef.current) {
        return;
      }
      const hydrated = await hydratePage(page.requests);
      if (generation !== requestGenerationRef.current) {
        return;
      }
      cursorRef.current = page.nextCursor;
      setState((current) => ({
        requests: [...current.requests, ...page.requests],
        summariesByRequestId: { ...current.summariesByRequestId, ...hydrated.summariesByRequestId },
        allocationTotalsByRequestId: {
          ...current.allocationTotalsByRequestId,
          ...hydrated.allocationTotalsByRequestId,
        },
        customersById: { ...current.customersById, ...hydrated.customersById },
        countsByTab: current.countsByTab,
        hasMore: page.hasMore,
        error: null,
        isLoading: false,
        isLoadingMore: false,
      }));
    } catch (error) {
      setState((current) => ({
        ...current,
        error: error instanceof Error ? error.message : "Unable to load more print requests.",
        isLoadingMore: false,
      }));
    }
  }, [activeTab, hydratePage, user]);

  const reloadPrintRequests = useCallback(
    async (options?: LoadPrintRequestsOptions) => {
      if (user) {
        clearPrintRequestsPageCache();
      }
      cursorRef.current = undefined;
      await loadFirstPage(options);
    },
    [loadFirstPage, user],
  );

  /**
   * Fetches a single request by ID directly (never queries the collection) when a deep link or
   * selection points outside the currently loaded page — merged into local state without
   * disturbing the loaded page/cursor.
   */
  const ensureRequestsLoaded = useCallback(
    async (printRequestIds: string[]) => {
      if (!user) {
        return;
      }
      const exactIds = [...new Set(printRequestIds.map((id) => id.trim()).filter(Boolean))];
      if (exactIds.length === 0) {
        return;
      }
      const found = await printRequestService.getPrintRequestsByIds(user, exactIds);
      if (found.length === 0) {
        return;
      }
      const hydrated = await hydratePage(found);
      setState((current) => ({
        ...current,
        requests: mergePrintRequestsById(current.requests, found),
        summariesByRequestId: { ...current.summariesByRequestId, ...hydrated.summariesByRequestId },
        allocationTotalsByRequestId: {
          ...current.allocationTotalsByRequestId,
          ...hydrated.allocationTotalsByRequestId,
        },
        customersById: { ...current.customersById, ...hydrated.customersById },
      }));
    },
    [hydratePage, user],
  );

  const ensureRequestLoaded = useCallback(
    async (printRequestId: string) => ensureRequestsLoaded([printRequestId]),
    [ensureRequestsLoaded],
  );

  // An explicit "Refresh"/tab-change action still performs a full authoritative
  // `reloadPrintRequests()`. Successful mutations reconcile the visible page locally instead
  // (Wave C hydration remediation, 2026-07-25 — extends the 2026-07-24 delete/archive pattern to
  // every mutation on this page).
  const reconcileDeletedOrArchivedRequest = useCallback(
    (printRequestId: string, outcome: "deleted" | "archived") => {
      setState((current) =>
        reconcileDeletedOrArchivedRequestInState(current, printRequestId, outcome, activeTab),
      );
    },
    [activeTab],
  );

  const patchRequestLocally = useCallback((printRequestId: string, patch: Partial<PrintRequest>) => {
    setState((current) => ({
      ...current,
      requests: current.requests.map((request) =>
        request.id === printRequestId ? { ...request, ...patch } : request,
      ),
    }));
  }, []);

  const patchSummaryLocally = useCallback(
    (printRequestId: string, summary: PrintRequestItemSummary) => {
      setState((current) => ({
        ...current,
        summariesByRequestId: { ...current.summariesByRequestId, [printRequestId]: summary },
      }));
    },
    [],
  );

  // A brand-new request is always Working/Empty — only insert the row (and increment the exact
  // Working count) when the currently loaded tab actually IS Working; the guard lives here, not
  // in the caller, so a future call site cannot silently corrupt another tab's exact count
  // (independent-review finding, Wave C hydration remediation pass 5, 2026-07-25).
  const insertCreatedRequestLocally = useCallback(
    (request: PrintRequest) => {
      if (activeTab !== "working") {
        return;
      }
      setState((current) => ({
        ...current,
        requests: [request, ...current.requests],
        countsByTab: { ...current.countsByTab, working: current.countsByTab.working + 1 },
      }));
    },
    [activeTab],
  );

  return {
    ...state,
    reloadPrintRequests,
    loadMore,
    ensureRequestsLoaded,
    ensureRequestLoaded,
    reconcileDeletedOrArchivedRequest,
    patchRequestLocally,
    patchSummaryLocally,
    insertCreatedRequestLocally,
  };
}
