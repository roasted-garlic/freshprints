'use client';

import { usePathname } from 'next/navigation';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import type { PrintRequest } from '@fresh-prints/shared/types/printRequest/printRequest.types';
import { buildPrintRequestItemSummaries } from '@fresh-prints/shared/utils/printRequestItemSummaries';
import {
  groupPortalPrintRequestsByListTab,
  isPortalContinuablePrintRequestStatus,
  type PortalPrintRequestListTab,
} from '@fresh-prints/shared/utils/portalPrintRequestListTabs';
import {
  buildPrintRequestAllocationTotalsByRequestId,
  type PrintRequestAllocationTotals,
} from '@fresh-prints/shared/utils/showAllocationTotals';
import type { PrintRequestItemSummary } from '@fresh-prints/shared/utils/printRequestItemSummaries';

import { useAuth } from '../../auth/context/AuthContext';
import { portalPrintRequestService } from '../services/portalPrintRequestService';

export type MyPrintRequestsLoadScope = 'chrome' | 'full';

/**
 * Pure merge used by reconcileQueuedRequest (item 7): patches one request's allocation totals
 * from the queue-to-show callable's own authoritative response, preserving any already-known
 * in-progress/printed totals for that request. Exported/pure for direct testing per this repo's
 * hook-testing convention (docs/standards/TESTING.md) — useMyPrintRequests itself is a stateful
 * React hook and is not DOM-rendered in tests.
 */
export function mergeQueuedAllocationTotal(
  current: Record<string, PrintRequestAllocationTotals>,
  printRequestId: string,
  allocationResult: { totalAllocatedQuantity: number },
): Record<string, PrintRequestAllocationTotals> {
  const existing = current[printRequestId];
  return {
    ...current,
    [printRequestId]: {
      totalAllocatedQuantity: allocationResult.totalAllocatedQuantity,
      totalInProgressQuantity: existing?.totalInProgressQuantity ?? 0,
      totalPrintedQuantity: existing?.totalPrintedQuantity ?? 0,
    },
  };
}

export function useMyPrintRequests() {
  const { customer, firebaseUser, refreshCustomer } = useAuth();
  const [requests, setRequests] = useState<PrintRequest[]>([]);
  const [summariesByRequestId, setSummariesByRequestId] = useState<Record<string, PrintRequestItemSummary>>({});
  const [allocationTotalsByRequestId, setAllocationTotalsByRequestId] = useState<
    Record<string, PrintRequestAllocationTotals>
  >({});
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [listScope, setListScope] = useState<MyPrintRequestsLoadScope>('chrome');
  const listScopeRef = useRef<MyPrintRequestsLoadScope>('chrome');

  const reload = useCallback(async (options?: { silent?: boolean; scope?: MyPrintRequestsLoadScope }) => {
    if (!customer?.id) {
      setRequests([]);
      setSummariesByRequestId({});
      setAllocationTotalsByRequestId({});
      setIsLoading(false);
      return;
    }

    const scope = options?.scope ?? listScopeRef.current;
    listScopeRef.current = scope;
    setListScope(scope);

    if (!options?.silent) {
      setIsLoading(true);
    }
    setError(null);

    try {
      if (scope === 'chrome') {
        const nextRequests = await portalPrintRequestService.listMyContinuablePrintRequests(
          customer.id,
        );
        const printRequestIds = nextRequests.map((request) => request.id);
        const items =
          printRequestIds.length === 1
            ? await portalPrintRequestService.listPrintRequestItems(printRequestIds[0]!)
            : printRequestIds.length > 0
            ? await portalPrintRequestService.listPrintRequestItemsForRequests(printRequestIds)
            : [];

        setRequests(nextRequests);
        setSummariesByRequestId(buildPrintRequestItemSummaries(items));
        setAllocationTotalsByRequestId({});
      } else {
        const nextRequests = await portalPrintRequestService.listMyPrintRequests(customer.id);
        const printRequestIds = nextRequests.map((request) => request.id);
        const [items, allocations] = await Promise.all([
          portalPrintRequestService.listPrintRequestItemsForRequests(printRequestIds),
          portalPrintRequestService.listShowAllocationsForPrintRequests(printRequestIds).catch(() => []),
        ]);

        setRequests(nextRequests);
        setSummariesByRequestId(buildPrintRequestItemSummaries(items));
        setAllocationTotalsByRequestId(buildPrintRequestAllocationTotalsByRequestId(allocations));
      }
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Unable to load print requests.');
    } finally {
      if (!options?.silent) {
        setIsLoading(false);
      }
    }
  }, [customer?.id]);

  useEffect(() => {
    void reload({ scope: 'chrome' });
  }, [reload]);

  const pathname = usePathname();
  const previousPathnameRef = useRef<string | null>(null);

  useEffect(() => {
    const isRequestsList = pathname === '/requests';
    const isDashboard = pathname === '/dashboard';
    const wasRequestsList = previousPathnameRef.current === '/requests';
    const wasDashboard = previousPathnameRef.current === '/dashboard';

    if (previousPathnameRef.current !== null) {
      if (isRequestsList && !wasRequestsList) {
        void reload({ silent: true, scope: 'full' });
      }

      if (isDashboard && !wasDashboard) {
        void reload({ silent: true, scope: 'full' });
        void refreshCustomer();
      }
    } else if (isRequestsList || isDashboard) {
      // Cold open directly on list/dashboard — need full history for tabs.
      void reload({ silent: true, scope: 'full' });
    }

    previousPathnameRef.current = pathname;
  }, [pathname, refreshCustomer, reload]);

  const continuableRequests = useMemo(
    () => requests.filter((request) => isPortalContinuablePrintRequestStatus(request.status)),
    [requests],
  );

  const requestsByTab = useMemo(
    () =>
      groupPortalPrintRequestsByListTab({
        requests,
        summariesByRequestId,
        allocationTotalsByRequestId,
      }),
    [allocationTotalsByRequestId, requests, summariesByRequestId],
  );

  const createPrintRequest = useCallback(
    async (notes?: string, options?: { skipListReload?: boolean }) => {
      if (!firebaseUser) {
        throw new Error('You must be signed in to create a print request.');
      }

      const created = await portalPrintRequestService.createPrintRequest(notes ? { notes } : {});

      if (!options?.skipListReload) {
        void reload({ silent: true, scope: listScopeRef.current });
      }

      // Do not reread the customer profile here: the callable's transaction only bumps
      // `customers.nextPrintRequestSequence`/`totalPrintRequests`, and the one UI reader of
      // `totalPrintRequests` (the dashboard request-count tile) only uses it as a loading-state
      // fallback before `requests.length` (from the reload above) takes over — see the Wave C
      // comprehensive-audit amendment, 2026-07-24.
      return created;
    },
    [firebaseUser, reload],
  );

  /**
   * Queue-to-show success is fully known from the callable's own authoritative response
   * (`queuePortalPrintRequestToShow` already returns `totalAllocatedQuantity`, etc.) — patch both
   * the request status and its allocation totals locally instead of waiting for the `'full'`-scope
   * reload (gated on a `/requests` or `/dashboard` pathname transition) to populate
   * `allocationTotalsByRequestId`. This lets `derivePrintRequestListTab` render the Queued tracker
   * immediately on the still-open detail route, with zero new reads and zero full reload.
   */
  const reconcileQueuedRequest = useCallback(
    (
      printRequestId: string,
      allocationResult?: {
        totalAllocatedQuantity: number;
      },
    ) => {
      setRequests((current) =>
        current.map((request) =>
          request.id === printRequestId ? { ...request, status: 'active' } : request,
        ),
      );

      if (!allocationResult) {
        return;
      }

      setAllocationTotalsByRequestId((current) =>
        mergeQueuedAllocationTotal(current, printRequestId, allocationResult),
      );
    },
    [],
  );

  // Clear Request success is fully known from the callable response — patch the list entry and
  // zero its item summary locally instead of refetching (owner live-test remediation, 2026-07-25).
  const reconcileClearedRequest = useCallback(
    (printRequestId: string, status: 'draft' | 'editing') => {
      setRequests((current) =>
        current.map((request) =>
          request.id === printRequestId ? { ...request, status, itemCount: 0 } : request,
        ),
      );
      setSummariesByRequestId((current) => {
        if (!(printRequestId in current)) {
          return current;
        }
        const next = { ...current };
        delete next[printRequestId];
        return next;
      });
    },
    [],
  );

  return {
    requests,
    requestsByTab,
    summariesByRequestId,
    allocationTotalsByRequestId,
    continuableRequests,
    isLoading,
    error,
    listScope,
    reload,
    createPrintRequest,
    reconcileQueuedRequest,
    reconcileClearedRequest,
  };
}

export type { PortalPrintRequestListTab };
