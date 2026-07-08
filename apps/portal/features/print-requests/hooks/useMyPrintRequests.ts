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

export function useMyPrintRequests() {
  const { customer, firebaseUser, refreshCustomer } = useAuth();
  const [requests, setRequests] = useState<PrintRequest[]>([]);
  const [summariesByRequestId, setSummariesByRequestId] = useState<Record<string, PrintRequestItemSummary>>({});
  const [allocationTotalsByRequestId, setAllocationTotalsByRequestId] = useState<
    Record<string, PrintRequestAllocationTotals>
  >({});
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(async (options?: { silent?: boolean }) => {
    if (!customer?.id) {
      setRequests([]);
      setSummariesByRequestId({});
      setAllocationTotalsByRequestId({});
      setIsLoading(false);
      return;
    }

    if (!options?.silent) {
      setIsLoading(true);
    }
    setError(null);

    try {
      const nextRequests = await portalPrintRequestService.listMyPrintRequests(customer.id);
      const printRequestIds = nextRequests.map((request) => request.id);
      const [items, allocations] = await Promise.all([
        portalPrintRequestService.listPrintRequestItemsForRequests(printRequestIds),
        portalPrintRequestService.listShowAllocationsForPrintRequests(printRequestIds).catch(() => []),
      ]);

      setRequests(nextRequests);
      setSummariesByRequestId(buildPrintRequestItemSummaries(items));
      setAllocationTotalsByRequestId(buildPrintRequestAllocationTotalsByRequestId(allocations));
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Unable to load print requests.');
    } finally {
      if (!options?.silent) {
        setIsLoading(false);
      }
    }
  }, [customer?.id]);

  useEffect(() => {
    void reload();
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
        void reload({ silent: true });
      }

      if (isDashboard && !wasDashboard) {
        void reload({ silent: true });
        void refreshCustomer();
      }
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
        void reload({ silent: true });
      }

      void refreshCustomer();
      return created;
    },
    [firebaseUser, refreshCustomer, reload],
  );

  return {
    requests,
    requestsByTab,
    summariesByRequestId,
    allocationTotalsByRequestId,
    continuableRequests,
    isLoading,
    error,
    reload,
    createPrintRequest,
  };
}

export type { PortalPrintRequestListTab };
