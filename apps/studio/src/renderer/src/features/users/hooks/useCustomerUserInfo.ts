import { useCallback, useEffect, useState } from "react";

import type { Customer } from "@fresh-prints/shared/types/customer/customer.types";

import { useAuth } from "../../auth/hooks/useAuth";
import { customerAccountActivityService } from "../services/customerAccountActivityService";
import { customerPrintRequestHistoryService } from "../services/customerPrintRequestHistoryService";
import type { AuditTrailEntry } from "../types/auditTrail.types";
import type {
  PrintRequestHistoryCardSummary,
  PrintRequestHistoryDetail,
} from "../types/customerPrintRequestHistory.types";
import type { PrintRequestLifecyclePageCursor } from "../../print-requests/services/printRequestService";
import {
  ACCOUNT_ACTIVITY_COUNT_CAP,
  ACCOUNT_ACTIVITY_PAGE_SIZE,
  PRINT_REQUEST_HISTORY_INDEXED_READER_ENABLED,
  PRINT_REQUEST_HISTORY_PAGE_SIZE,
} from "../types/customerPrintRequestHistory.types";
import { sortPrintRequestHistorySummaries } from "../utils/buildPrintRequestHistoryCard";

export interface CustomerUserInfoStats {
  printRequests: number;
  queuedShows: number;
  accountActivity: number;
}

interface CustomerUserInfoState {
  allPrintRequestSummaries: PrintRequestHistoryCardSummary[];
  printRequestTotalCount: number;
  printRequestHasMore: boolean;
  printRequestCursorByCustomerId?: Record<string, PrintRequestLifecyclePageCursor>;
  printRequestVisibleCount: number;
  selectedPrintRequestId: string | null;
  selectedDetail: PrintRequestHistoryDetail | null;
  isDetailLoading: boolean;
  allAccountActivityEntries: AuditTrailEntry[];
  accountActivityVisibleCount: number;
  stats: CustomerUserInfoStats;
  error: string | null;
  isLoading: boolean;
}

const initialState: CustomerUserInfoState = {
  allPrintRequestSummaries: [],
  printRequestTotalCount: 0,
  printRequestHasMore: false,
  printRequestCursorByCustomerId: undefined,
  printRequestVisibleCount: 0,
  selectedPrintRequestId: null,
  selectedDetail: null,
  isDetailLoading: false,
  allAccountActivityEntries: [],
  accountActivityVisibleCount: 0,
  stats: {
    printRequests: 0,
    queuedShows: 0,
    accountActivity: 0,
  },
  error: null,
  isLoading: false,
};

export function useCustomerUserInfo(customer: Customer | null, isEnabled: boolean) {
  const { user: caller } = useAuth();
  const [state, setState] = useState<CustomerUserInfoState>(initialState);

  const loadSummary = useCallback(async () => {
    if (!customer || !caller || !isEnabled) {
      setState(initialState);
      return;
    }

    setState((current) => ({
      ...current,
      error: null,
      isLoading: true,
      selectedDetail: null,
    }));

    try {
      const [historyPage, accountActivityPage, queuedPrintRequestCount] = await Promise.all([
        customerPrintRequestHistoryService.loadPrintRequestHistoryPage(
          caller,
          customer,
          PRINT_REQUEST_HISTORY_PAGE_SIZE,
        ),
        customerAccountActivityService.loadAccountActivityPage(
          caller,
          customer,
          ACCOUNT_ACTIVITY_COUNT_CAP,
        ),
        customerPrintRequestHistoryService.loadQueuedPrintRequestCount(caller, customer),
      ]);

      setState({
        allPrintRequestSummaries: historyPage.summaries,
        printRequestTotalCount: historyPage.totalCount,
        printRequestHasMore: historyPage.hasMore,
        printRequestCursorByCustomerId: historyPage.nextCursorByCustomerId,
        printRequestVisibleCount: Math.min(PRINT_REQUEST_HISTORY_PAGE_SIZE, historyPage.totalCount),
        selectedPrintRequestId: null,
        selectedDetail: null,
        isDetailLoading: false,
        allAccountActivityEntries: accountActivityPage.entries,
        accountActivityVisibleCount: Math.min(
          ACCOUNT_ACTIVITY_PAGE_SIZE,
          accountActivityPage.entries.length,
        ),
        stats: {
          printRequests: Math.max(customer.totalPrintRequests, historyPage.totalCount),
          queuedShows: queuedPrintRequestCount,
          accountActivity: accountActivityPage.boundedTotalCount,
        },
        error: null,
        isLoading: false,
      });
    } catch (error) {
      setState({
        ...initialState,
        error: error instanceof Error ? error.message : "Unable to load customer user info.",
        isLoading: false,
      });
    }
  }, [caller, customer, isEnabled]);

  const loadMorePrintRequests = useCallback(async () => {
    if (!customer || !caller) {
      return;
    }
    const nextVisibleCount = state.printRequestVisibleCount + PRINT_REQUEST_HISTORY_PAGE_SIZE;
    try {
      const historyPage = await customerPrintRequestHistoryService.loadPrintRequestHistoryPage(
        caller,
        customer,
        PRINT_REQUEST_HISTORY_INDEXED_READER_ENABLED
          ? PRINT_REQUEST_HISTORY_PAGE_SIZE
          : nextVisibleCount,
        PRINT_REQUEST_HISTORY_INDEXED_READER_ENABLED
          ? state.printRequestCursorByCustomerId
          : undefined,
      );
      const summaries = PRINT_REQUEST_HISTORY_INDEXED_READER_ENABLED
        ? sortPrintRequestHistorySummaries([
            ...state.allPrintRequestSummaries,
            ...historyPage.summaries,
          ])
        : historyPage.summaries;
      setState((current) => ({
        ...current,
        allPrintRequestSummaries: summaries,
        printRequestVisibleCount: PRINT_REQUEST_HISTORY_INDEXED_READER_ENABLED
          ? summaries.length
          : historyPage.visibleCount,
        printRequestTotalCount: PRINT_REQUEST_HISTORY_INDEXED_READER_ENABLED
          ? Math.max(current.printRequestTotalCount, summaries.length)
          : historyPage.totalCount,
        printRequestHasMore: historyPage.hasMore,
        printRequestCursorByCustomerId: historyPage.nextCursorByCustomerId,
      }));
    } catch (error) {
      setState((current) => ({
        ...current,
        error: error instanceof Error ? error.message : "Unable to load more print requests.",
      }));
    }
  }, [
    caller,
    customer,
    state.allPrintRequestSummaries,
    state.printRequestCursorByCustomerId,
    state.printRequestVisibleCount,
  ]);

  const openPrintRequestDetail = useCallback(
    async (printRequestId: string) => {
      if (!customer || !caller) {
        return;
      }

      setState((current) => ({
        ...current,
        isDetailLoading: true,
        selectedPrintRequestId: printRequestId,
        selectedDetail: null,
      }));

      try {
        const detail = await customerPrintRequestHistoryService.loadPrintRequestHistoryDetail(
          caller,
          customer,
          printRequestId,
        );

        setState((current) => ({
          ...current,
          selectedDetail: detail,
          isDetailLoading: false,
          error: detail ? null : "Unable to load print request details.",
        }));
      } catch (error) {
        setState((current) => ({
          ...current,
          isDetailLoading: false,
          error: error instanceof Error ? error.message : "Unable to load print request details.",
        }));
      }
    },
    [caller, customer],
  );

  const closePrintRequestDetail = useCallback(() => {
    setState((current) => ({
      ...current,
      selectedPrintRequestId: null,
      selectedDetail: null,
      isDetailLoading: false,
    }));
  }, []);

  const loadMoreAccountActivity = useCallback(() => {
    setState((current) => ({
      ...current,
      accountActivityVisibleCount: Math.min(
        current.accountActivityVisibleCount + ACCOUNT_ACTIVITY_PAGE_SIZE,
        current.allAccountActivityEntries.length,
      ),
    }));
  }, []);

  useEffect(() => {
    void loadSummary();
  }, [loadSummary]);

  const printRequestSummaries = state.allPrintRequestSummaries.slice(0, state.printRequestVisibleCount);
  const accountActivityEntries = state.allAccountActivityEntries.slice(0, state.accountActivityVisibleCount);

  return {
    printRequestSummaries,
    printRequestTotalCount: state.printRequestTotalCount,
    printRequestVisibleCount: state.printRequestVisibleCount,
    hasMorePrintRequests: state.printRequestHasMore,
    selectedDetail: state.selectedDetail,
    selectedPrintRequestId: state.selectedPrintRequestId,
    isDetailLoading: state.isDetailLoading,
    accountActivityEntries,
    accountActivityVisibleCount: state.accountActivityVisibleCount,
    hasMoreAccountActivity: state.accountActivityVisibleCount < state.allAccountActivityEntries.length,
    stats: state.stats,
    error: state.error,
    isLoading: state.isLoading,
    reloadCustomerUserInfo: loadSummary,
    loadMorePrintRequests,
    openPrintRequestDetail,
    closePrintRequestDetail,
    loadMoreAccountActivity,
  };
}
