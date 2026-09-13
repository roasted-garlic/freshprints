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
  invalidatePrintRequestsPageCache,
  loadPrintRequestsPageCached,
} from "../services/printRequestsPageReadCache";
import { reconcileDeletedOrArchivedRequest as reconcileDeletedOrArchivedRequestInState } from "../utils/reconcileDeletedOrArchivedRequest";
import { mergePrintRequestsById } from "../utils/mergePrintRequestsById";
import { derivePrintRequestsListLoading } from "../utils/derivePrintRequestsListLoading";
import type { PrintRequestListTab } from "@fresh-prints/shared/utils/printRequestListGrouping";
import type { PrintRequest } from "@fresh-prints/shared/types/printRequest/printRequest.types";
import type { ShowAllocation } from "@fresh-prints/shared/types/showAllocation/showAllocation.types";
import type { UpcomingShow } from "@fresh-prints/shared/types/upcomingShow/upcomingShow.types";
import type { Customer } from "@fresh-prints/shared/types/customer/customer.types";
import {
  printRequestListKindFromIsInternal,
  type PrintRequestListKind,
} from "../constants/printRequestRoutes";
import { upcomingShowService } from "../../upcoming-shows/services/upcomingShowService";

const COUNTABLE_TABS: readonly PrintRequestListTab[] = [
  "working",
  "editing",
  "queued",
  "printing",
  "printed",
];

function buildAllocationsByRequestId(allocations: ShowAllocation[]): Record<string, ShowAllocation[]> {
  const grouped: Record<string, ShowAllocation[]> = {};

  for (const allocation of allocations) {
    if (allocation.status === "canceled") {
      continue;
    }

    grouped[allocation.printRequestId] ??= [];
    grouped[allocation.printRequestId]!.push(allocation);
  }

  return grouped;
}

function buildAllocationCacheKey(requestIds: string[]): string {
  return `allocations:${[...new Set(requestIds)].sort().join(",")}`;
}

function buildShowCacheKey(showIds: string[]): string {
  return `shows:${[...new Set(showIds)].sort().join(",")}`;
}

type LoadedListKind = PrintRequestListKind | "all";

interface PrintRequestsState {
  requests: PrintRequest[];
  summariesByRequestId: Record<string, PrintRequestItemSummary>;
  allocationTotalsByRequestId: Record<
    string,
    { totalAllocatedQuantity: number; totalInProgressQuantity: number; totalPrintedQuantity: number }
  >;
  allocationsByRequestId: Record<string, ShowAllocation[]>;
  showsById: Record<string, UpcomingShow>;
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
  allocationsByRequestId: {},
  showsById: {},
  customersById: {},
  countsByTab: { working: 0, editing: 0, queued: 0, printing: 0, printed: 0 },
  hasMore: false,
  error: null,
  isLoading: true,
  isLoadingMore: false,
};

interface LoadPrintRequestsOptions {
  silent?: boolean;
}

function listKindKey(isInternal: boolean | undefined): LoadedListKind {
  return typeof isInternal === "boolean" ? printRequestListKindFromIsInternal(isInternal) : "all";
}

/**
 * `isInternal` is required for the Studio Print Requests page (Customer vs Internal lists).
 * Omit it for Show Queue, which must still see both request kinds for a given `queueTab`.
 */
export function usePrintRequests(activeTab: PrintRequestListTab, isInternal?: boolean) {
  const { user } = useAuth();
  const [state, setState] = useState<PrintRequestsState>(initialState);
  const cursorRef = useRef<PrintRequestListCursor | undefined>(undefined);
  const requestGenerationRef = useRef(0);
  const activeTabRef = useRef(activeTab);
  const activeIsInternalRef = useRef(isInternal);
  const activeKind = listKindKey(isInternal);
  useEffect(() => {
    activeTabRef.current = activeTab;
  }, [activeTab]);
  useEffect(() => {
    activeIsInternalRef.current = isInternal;
  }, [isInternal]);
  const loadedTabRef = useRef<PrintRequestListTab | null>(null);
  const loadedKindRef = useRef<LoadedListKind | null>(null);
  const showsCacheRef = useRef<Record<string, UpcomingShow>>({});
  const requestsRef = useRef<PrintRequest[]>(initialState.requests);
  requestsRef.current = state.requests;
  const isLoading = derivePrintRequestsListLoading(
    state.isLoading,
    loadedTabRef.current,
    activeTab,
    loadedKindRef.current,
    activeKind,
  );

  const loadCounts = useCallback(async (): Promise<Record<PrintRequestListTab, number>> => {
    if (!user) {
      return initialState.countsByTab;
    }
    const cacheKeyBase = `counts:${listKindKey(isInternal)}`;
    const entries = await Promise.all(
      COUNTABLE_TABS.map(async (tab) => {
        const count = await loadPrintRequestsPageCached(user.id, `${cacheKeyBase}:${tab}`, () =>
          printRequestService.countPrintRequests(user, {
            queueTab: tab,
            ...(typeof isInternal === "boolean" ? { isInternal } : {}),
          }),
        );
        return [tab, count] as const;
      }),
    );
    return Object.fromEntries(entries) as Record<PrintRequestListTab, number>;
  }, [isInternal, user]);

  const hydratePage = useCallback(
    async (requests: PrintRequest[]) => {
      if (!user) {
        return {
          summariesByRequestId: {},
          allocationTotalsByRequestId: {},
          allocationsByRequestId: {},
          showsById: {},
          customersById: {},
        };
      }

      const requestIds = [...new Set(requests.map((request) => request.id))];
      const customerIds = [
        ...new Set(
          requests
            .filter((request) => !request.isInternal && request.customerId)
            .map((request) => request.customerId as string),
        ),
      ];

      const [summariesByRequestId, allocationTotalsByRequestId, activeAllocations, customers] =
        await Promise.all([
          requestIds.length > 0
            ? printRequestService.listPrintRequestItemSummariesForRequests(user, requestIds)
            : Promise.resolve({}),
          requestIds.length > 0
            ? printRequestService.listAllocationTotalsForRequests(user, requestIds)
            : Promise.resolve({}),
          requestIds.length > 0
            ? loadPrintRequestsPageCached(user.id, buildAllocationCacheKey(requestIds), () =>
                printRequestService.listActiveShowAllocationsForRequests(user, requestIds),
              )
            : Promise.resolve([]),
          customerIds.length > 0
            ? printRequestService.listCustomersByIds(user, customerIds)
            : Promise.resolve([]),
        ]);

      const allocationsByRequestId = buildAllocationsByRequestId(activeAllocations);
      const showIds = [
        ...new Set(activeAllocations.map((allocation) => allocation.upcomingShowId).filter(Boolean)),
      ];
      const missingShowIds = showIds.filter((showId) => !showsCacheRef.current[showId]);
      if (missingShowIds.length > 0) {
        const loadedShows = await loadPrintRequestsPageCached(
          user.id,
          buildShowCacheKey(missingShowIds),
          () => upcomingShowService.getUpcomingShowsByIds(user, missingShowIds),
        );
        for (const show of loadedShows) {
          showsCacheRef.current[show.id] = show;
        }
      }

      const showsById = Object.fromEntries(
        showIds.map((showId) => [showId, showsCacheRef.current[showId]]).filter((entry) => entry[1]),
      ) as Record<string, UpcomingShow>;

      return {
        summariesByRequestId,
        allocationTotalsByRequestId,
        allocationsByRequestId,
        showsById,
        customersById: Object.fromEntries(customers.map((customer) => [customer.id, customer])),
      };
    },
    [user],
  );

  const invalidateAllocationHydrationCache = useCallback(() => {
    if (!user) {
      return;
    }

    invalidatePrintRequestsPageCache(user.id, "allocations:");
    invalidatePrintRequestsPageCache(user.id, "shows:");
  }, [user]);

  const refreshAllocationHydration = useCallback(async () => {
    if (!user) {
      return;
    }

    invalidateAllocationHydrationCache();
    const loadedRequests = requestsRef.current;
    if (loadedRequests.length === 0) {
      return;
    }

    const hydrated = await hydratePage(loadedRequests);
    setState((current) => ({
      ...current,
      allocationsByRequestId: {
        ...current.allocationsByRequestId,
        ...hydrated.allocationsByRequestId,
      },
      showsById: {
        ...current.showsById,
        ...hydrated.showsById,
      },
      allocationTotalsByRequestId: {
        ...current.allocationTotalsByRequestId,
        ...hydrated.allocationTotalsByRequestId,
      },
    }));
  }, [hydratePage, invalidateAllocationHydrationCache, user]);

  const loadFirstPage = useCallback(
    async (options?: LoadPrintRequestsOptions) => {
      if (!user || !permissionService.canViewPrintRequests(user)) {
        loadedTabRef.current = activeTab;
        loadedKindRef.current = activeKind;
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
          loadPrintRequestsPageCached(user.id, `list:${activeKind}:${activeTab}:page-1`, () =>
            printRequestService.listPrintRequestsPage(user, {
              queueTab: activeTab,
              limitCount: PRINT_REQUEST_LIST_PAGE_SIZE,
              ...(typeof isInternal === "boolean" ? { isInternal } : {}),
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
        loadedTabRef.current = activeTab;
        loadedKindRef.current = activeKind;
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
        loadedTabRef.current = activeTab;
        loadedKindRef.current = activeKind;
        setState((current) => ({
          ...current,
          error: error instanceof Error ? error.message : "Unable to load print requests.",
          isLoading: false,
        }));
      }
    },
    [activeKind, activeTab, hydratePage, isInternal, loadCounts, user],
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
        ...(typeof isInternal === "boolean" ? { isInternal } : {}),
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
        allocationsByRequestId: {
          ...current.allocationsByRequestId,
          ...hydrated.allocationsByRequestId,
        },
        showsById: { ...current.showsById, ...hydrated.showsById },
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
  }, [activeTab, hydratePage, isInternal, user]);

  const reloadPrintRequests = useCallback(
    async (options?: LoadPrintRequestsOptions) => {
      if (user) {
        invalidateAllocationHydrationCache();
        clearPrintRequestsPageCache();
      }
      cursorRef.current = undefined;
      await loadFirstPage(options);
    },
    [invalidateAllocationHydrationCache, loadFirstPage, user],
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
        requests: mergePrintRequestsById(
          current.requests,
          found,
          activeTabRef.current,
          activeIsInternalRef.current,
        ),
        summariesByRequestId: { ...current.summariesByRequestId, ...hydrated.summariesByRequestId },
        allocationTotalsByRequestId: {
          ...current.allocationTotalsByRequestId,
          ...hydrated.allocationTotalsByRequestId,
        },
        allocationsByRequestId: {
          ...current.allocationsByRequestId,
          ...hydrated.allocationsByRequestId,
        },
        showsById: { ...current.showsById, ...hydrated.showsById },
        customersById: { ...current.customersById, ...hydrated.customersById },
      }));
    },
    [hydratePage, user],
  );

  const ensureRequestLoaded = useCallback(
    async (printRequestId: string) => ensureRequestsLoaded([printRequestId]),
    [ensureRequestsLoaded],
  );

  const reconcileDeletedOrArchivedRequest = useCallback(
    (printRequestId: string, outcome: "deleted" | "archived") => {
      setState((current) =>
        reconcileDeletedOrArchivedRequestInState(current, printRequestId, outcome, activeTab),
      );
    },
    [activeTab],
  );

  const patchRequestLocally = useCallback((printRequestId: string, patch: Partial<PrintRequest>) => {
    setState((current) => {
      const previous = current.requests.find((request) => request.id === printRequestId);
      const nextQueueTab = patch.queueTab;
      const previousQueueTab = previous?.queueTab;
      const shouldMoveTabCount =
        previous &&
        nextQueueTab &&
        previousQueueTab &&
        nextQueueTab !== previousQueueTab;

      return {
        ...current,
        requests: current.requests.map((request) =>
          request.id === printRequestId ? { ...request, ...patch } : request,
        ),
        countsByTab: shouldMoveTabCount
          ? {
              ...current.countsByTab,
              [previousQueueTab]: Math.max(0, current.countsByTab[previousQueueTab] - 1),
              [nextQueueTab]: current.countsByTab[nextQueueTab] + 1,
            }
          : current.countsByTab,
      };
    });
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

  const insertCreatedRequestLocally = useCallback(
    (request: PrintRequest) => {
      if (activeTab !== "working") {
        return;
      }
      if (typeof isInternal === "boolean" && request.isInternal !== isInternal) {
        return;
      }
      setState((current) => ({
        ...current,
        requests: [request, ...current.requests],
        countsByTab: { ...current.countsByTab, working: current.countsByTab.working + 1 },
      }));
    },
    [activeTab, isInternal],
  );

  return {
    ...state,
    isLoading,
    reloadPrintRequests,
    refreshAllocationHydration,
    loadMore,
    ensureRequestsLoaded,
    ensureRequestLoaded,
    reconcileDeletedOrArchivedRequest,
    patchRequestLocally,
    patchSummaryLocally,
    insertCreatedRequestLocally,
  };
}
