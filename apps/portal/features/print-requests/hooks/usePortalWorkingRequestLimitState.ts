'use client';

import { useEffect, useMemo, useState } from 'react';

import type { PrintRequestItem } from '@fresh-prints/shared/types/printRequest/printRequest.types';
import { sumPrintRequestItemQuantities } from '@fresh-prints/shared/utils/portalShowQueueCapacity';
import {
  formatWorkingRequestFullHelperText,
  formatWorkingRequestFullStatusLine,
  formatWorkingRequestFullUserMessage,
  isWorkingRequestPrintFull,
  workingRequestPrintRoomRemaining,
} from '@fresh-prints/shared/utils/printRequestWorkingRequestMax';

import { useAuth } from '../../auth/context/AuthContext';
import { useLiveQuotaRefresh } from '../../shared/hooks/useLiveQuotaRefresh';
import { portalPrintRequestLimitService } from '../services/portalPrintRequestLimitService';

export interface PortalWorkingRequestLimitHydration {
  /** True while the customer's print-request list is still loading. */
  isRequestsLoading: boolean;
  /** True while Current Request items are fetching (non-silent). */
  isItemsLoading: boolean;
  /** Current working request id, or null when virtual-empty. */
  workingRequestId: string | null;
  /**
   * Working-request id whose items have been fetched at least once.
   * `undefined` = never hydrated; `null` = hydrated empty cart.
   */
  hydratedWorkingRequestId: string | null | undefined;
}

export interface PortalWorkingRequestLimitState {
  /** Sole limit L = maxQuantityPerShowPerCustomer. */
  limit: number | null;
  workingPrintCount: number;
  roomRemaining: number;
  isRequestFull: boolean;
  /**
   * False until limit L and working print count are both known.
   * Do not show "L prints left" / open upload UI as available while false.
   */
  isReady: boolean;
  exhaustedMessage: string | null;
  exhaustedStatusText: string | null;
  exhaustedHelperText: string | null;
  /** True when the Current Request has room below L (false while unknown). */
  canAddPrints: boolean;
}

function isWorkingPrintCountKnown(hydration: PortalWorkingRequestLimitHydration): boolean {
  if (hydration.isRequestsLoading || hydration.isItemsLoading) {
    return false;
  }
  if (hydration.hydratedWorkingRequestId === undefined) {
    return false;
  }
  return hydration.hydratedWorkingRequestId === hydration.workingRequestId;
}

export function usePortalWorkingRequestLimitState(
  workingItems: PrintRequestItem[],
  hydration: PortalWorkingRequestLimitHydration,
): PortalWorkingRequestLimitState {
  const { firebaseUser } = useAuth();
  const [limit, setLimit] = useState<number | null>(null);
  const [isLimitReady, setIsLimitReady] = useState(false);

  const refreshLimit = useMemo(
    () => async () => {
      if (!firebaseUser) {
        setLimit(null);
        setIsLimitReady(true);
        return;
      }

      const nextLimit = await portalPrintRequestLimitService.readLimit();
      setLimit(nextLimit);
      setIsLimitReady(true);
    },
    [firebaseUser],
  );

  useLiveQuotaRefresh(refreshLimit, { enabled: Boolean(firebaseUser) });

  useEffect(() => {
    if (!firebaseUser) {
      setLimit(null);
      setIsLimitReady(true);
      return;
    }

    setIsLimitReady(false);
    const unsubscribe = portalPrintRequestLimitService.subscribe((nextLimit) => {
      setLimit(nextLimit);
      setIsLimitReady(true);
    });

    return unsubscribe;
  }, [firebaseUser]);

  const workingPrintCount = useMemo(
    () => sumPrintRequestItemQuantities(workingItems),
    [workingItems],
  );

  const isPrintCountKnown = isWorkingPrintCountKnown(hydration);
  const isReady = isLimitReady && isPrintCountKnown;

  return useMemo(() => {
    const isRequestFull =
      isReady && limit != null && isWorkingRequestPrintFull(workingPrintCount, limit);
    const roomRemaining =
      isReady && limit != null
        ? workingRequestPrintRoomRemaining(workingPrintCount, limit)
        : 0;
    // Conservative while unknown: do not treat missing data as "full room".
    const canAddPrints = isReady && limit != null && roomRemaining > 0;

    let exhaustedMessage: string | null = null;
    let exhaustedStatusText: string | null = null;
    let exhaustedHelperText: string | null = null;

    if (isRequestFull && limit != null) {
      exhaustedMessage = formatWorkingRequestFullUserMessage(limit);
      exhaustedStatusText = formatWorkingRequestFullStatusLine(limit);
      exhaustedHelperText = formatWorkingRequestFullHelperText();
    }

    return {
      limit,
      workingPrintCount,
      roomRemaining,
      isRequestFull,
      isReady,
      exhaustedMessage,
      exhaustedStatusText,
      exhaustedHelperText,
      canAddPrints,
    };
  }, [isReady, limit, workingPrintCount]);
}
