import type { Customer } from "@fresh-prints/shared/types/customer/customer.types";
import type { PrintRequest } from "@fresh-prints/shared/types/printRequest/printRequest.types";
import type { ShowAllocation } from "@fresh-prints/shared/types/showAllocation/showAllocation.types";
import type { UpcomingShow } from "@fresh-prints/shared/types/upcomingShow/upcomingShow.types";

import { permissionService } from "../../permissions/services/permissionService";
import { printRequestService } from "../../print-requests/services/printRequestService";
import { upcomingShowService } from "../../upcoming-shows/services/upcomingShowService";
import type { User } from "../types/user.types";
import type {
  PrintRequestHistoryDetail,
  PrintRequestHistoryPage,
} from "../types/customerPrintRequestHistory.types";
import { PRINT_REQUEST_HISTORY_PAGE_SIZE } from "../types/customerPrintRequestHistory.types";
import {
  buildPrintRequestHistoryCardSummary,
  buildPrintRequestHistoryDetailEvents,
  countDistinctQueuedPrintRequests,
  dedupePrintRequestsById,
  sortPrintRequestHistorySummaries,
} from "../utils/buildPrintRequestHistoryCard";
import { resolveLogicalCustomerIds } from "../utils/resolveLogicalCustomerIds";

interface CustomerPrintRequestHistoryContext {
  requests: PrintRequest[];
  allocations: ShowAllocation[];
  showsById: Map<string, UpcomingShow>;
  relatedRequestNamesById: Map<string, string>;
  relatedRequestsById: Map<string, PrintRequest>;
  queuedPrintRequestCount: number;
}

async function listPrintRequestsForLogicalCustomerIds(
  caller: User,
  customerIds: readonly string[],
): Promise<PrintRequest[]> {
  if (!permissionService.canViewPrintRequests(caller) || customerIds.length === 0) {
    return [];
  }

  const batches = await Promise.all(
    customerIds.map((customerId) => printRequestService.listPrintRequestsByCustomer(caller, customerId)),
  );

  return dedupePrintRequestsById(batches.flat());
}

async function listAllocationsForPrintRequests(
  caller: User,
  printRequestIds: readonly string[],
): Promise<ShowAllocation[]> {
  if (!permissionService.canViewUpcomingShows(caller) || printRequestIds.length === 0) {
    return [];
  }

  return printRequestService.listShowAllocationsForRequests(caller, [...printRequestIds]);
}

async function loadShowsById(caller: User, showIds: readonly string[]): Promise<Map<string, UpcomingShow>> {
  const showsById = new Map<string, UpcomingShow>();

  if (!permissionService.canViewUpcomingShows(caller) || showIds.length === 0) {
    return showsById;
  }

  const uniqueIds = [...new Set(showIds.map((id) => id.trim()).filter(Boolean))];
  const shows = await Promise.all(
    uniqueIds.map(async (showId) => {
      try {
        return await upcomingShowService.getUpcomingShowById(caller, showId);
      } catch {
        return null;
      }
    }),
  );

  for (const show of shows) {
    if (show) {
      showsById.set(show.id, show);
    }
  }

  return showsById;
}

async function loadRelatedRequests(
  caller: User,
  requests: readonly PrintRequest[],
): Promise<{ namesById: Map<string, string>; requestsById: Map<string, PrintRequest> }> {
  const relatedIds = new Set<string>();

  for (const request of requests) {
    if (request.convertedToInternalRequestId) {
      relatedIds.add(request.convertedToInternalRequestId);
    }
    if (request.convertedFromCustomerRequestId) {
      relatedIds.add(request.convertedFromCustomerRequestId);
    }
  }

  if (relatedIds.size === 0 || !permissionService.canViewPrintRequests(caller)) {
    return { namesById: new Map(), requestsById: new Map() };
  }

  const relatedRequests = await printRequestService.getPrintRequestsByIds(caller, [...relatedIds]);
  return {
    namesById: new Map(relatedRequests.map((request) => [request.id, request.name])),
    requestsById: new Map(relatedRequests.map((request) => [request.id, request])),
  };
}

async function loadCustomerPrintRequestHistoryContext(
  caller: User,
  customer: Customer,
): Promise<CustomerPrintRequestHistoryContext> {
  const logicalCustomerIds = resolveLogicalCustomerIds(customer);
  const requests = await listPrintRequestsForLogicalCustomerIds(caller, logicalCustomerIds);
  const allocations = await listAllocationsForPrintRequests(
    caller,
    requests.map((request) => request.id),
  );

  const showIds = allocations.map((allocation) => allocation.upcomingShowId);
  const related = await loadRelatedRequests(caller, requests);
  const [showsById] = await Promise.all([loadShowsById(caller, showIds)]);

  return {
    requests,
    allocations,
    showsById,
    relatedRequestNamesById: related.namesById,
    relatedRequestsById: related.requestsById,
    queuedPrintRequestCount: countDistinctQueuedPrintRequests(allocations),
  };
}

export const customerPrintRequestHistoryService = {
  async loadPrintRequestHistoryPage(
    caller: User,
    customer: Customer,
    visibleCount = PRINT_REQUEST_HISTORY_PAGE_SIZE,
  ): Promise<PrintRequestHistoryPage> {
    const context = await loadCustomerPrintRequestHistoryContext(caller, customer);
    const summaries = sortPrintRequestHistorySummaries(
      context.requests.map((request) =>
        buildPrintRequestHistoryCardSummary({
          request,
          customer,
          allocations: context.allocations,
          showsById: context.showsById,
          relatedRequestNamesById: context.relatedRequestNamesById,
          relatedRequestsById: context.relatedRequestsById,
        }),
      ),
    );

    const boundedVisibleCount = Math.max(PRINT_REQUEST_HISTORY_PAGE_SIZE, visibleCount);

    return {
      summaries: summaries.slice(0, boundedVisibleCount),
      totalCount: summaries.length,
      visibleCount: Math.min(boundedVisibleCount, summaries.length),
      hasMore: summaries.length > boundedVisibleCount,
    };
  },

  async loadPrintRequestHistoryDetail(
    caller: User,
    customer: Customer,
    printRequestId: string,
  ): Promise<PrintRequestHistoryDetail | null> {
    const context = await loadCustomerPrintRequestHistoryContext(caller, customer);
    const request = context.requests.find((entry) => entry.id === printRequestId);

    if (!request) {
      return null;
    }

    const summary = buildPrintRequestHistoryCardSummary({
      request,
      customer,
      allocations: context.allocations,
      showsById: context.showsById,
      relatedRequestNamesById: context.relatedRequestNamesById,
      relatedRequestsById: context.relatedRequestsById,
    });

    const detailEvents = buildPrintRequestHistoryDetailEvents({
      summary,
      request,
      allocations: context.allocations,
      showsById: context.showsById,
    });

    return {
      summary,
      events: detailEvents.events,
      hasMoreEvents: detailEvents.hasMoreEvents,
      totalEventCount: detailEvents.totalEventCount,
    };
  },

  async loadQueuedPrintRequestCount(caller: User, customer: Customer): Promise<number> {
    const logicalCustomerIds = resolveLogicalCustomerIds(customer);
    const requests = await listPrintRequestsForLogicalCustomerIds(caller, logicalCustomerIds);
    const allocations = await listAllocationsForPrintRequests(
      caller,
      requests.map((request) => request.id),
    );
    return countDistinctQueuedPrintRequests(allocations);
  },

  async loadTotalPrintRequestCount(caller: User, customer: Customer): Promise<number> {
    const logicalCustomerIds = resolveLogicalCustomerIds(customer);
    const requests = await listPrintRequestsForLogicalCustomerIds(caller, logicalCustomerIds);
    return requests.length;
  },
};
