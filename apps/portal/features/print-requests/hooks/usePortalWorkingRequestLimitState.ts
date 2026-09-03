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
import { portalPrintRequestLimitService } from '../services/portalPrintRequestLimitService';
import { resolveEffectivePrintRequestLimits } from '@fresh-prints/shared/utils/printRequestQuotaOverride';
import {
  DEFAULT_PRINT_REQUEST_LIMIT_SETTINGS,
  type PrintRequestLimitSettings,
} from '@fresh-prints/shared/constants/printRequest/printRequestLimitSettings.constants';

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
  /** Max prints on one working request (`maxQuantityPerPrintRequest`). */
  limit: number | null;
  /** Max prints per customer per show (`maxQuantityPerShowPerCustomer`). */
  customerShowLimit: number | null;
  workingPrintCount: number;
  roomRemaining: number;
  isRequestFull: boolean;
  /**
   * False until request limit and working print count are both known.
   * Do not show "N prints left" / open upload UI as available while false.
   */
  isReady: boolean;
  exhaustedMessage: string | null;
  exhaustedStatusText: string | null;
  exhaustedHelperText: string | null;
  /** True when the Current Request has room below the request limit (false while unknown). */
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
  const { firebaseUser, customer } = useAuth();
  const [settings, setSettings] = useState<PrintRequestLimitSettings>(
    DEFAULT_PRINT_REQUEST_LIMIT_SETTINGS,
  );
  const [isLimitReady, setIsLimitReady] = useState(false);

  useEffect(() => {
    if (!firebaseUser) {
      setSettings(DEFAULT_PRINT_REQUEST_LIMIT_SETTINGS);
      setIsLimitReady(true);
      return;
    }

    setIsLimitReady(false);
    const unsubscribe = portalPrintRequestLimitService.subscribeSettings((next) => {
      setSettings(next);
      setIsLimitReady(true);
    });

    return unsubscribe;
  }, [firebaseUser]);

  const { requestLimit, customerShowLimit } = useMemo(() => {
    const effective = resolveEffectivePrintRequestLimits({
      settings,
      override: customer?.printRequestQuotaOverride,
      nowMs: Date.now(),
    });
    return {
      requestLimit: effective.effectiveMaxQuantityPerPrintRequest,
      customerShowLimit: effective.effectiveMaxQuantityPerShowPerCustomer,
    };
  }, [customer?.printRequestQuotaOverride, settings]);

  const workingPrintCount = useMemo(
    () => sumPrintRequestItemQuantities(workingItems),
    [workingItems],
  );

  const isPrintCountKnown = isWorkingPrintCountKnown(hydration);
  const isReady = isLimitReady && isPrintCountKnown;

  return useMemo(() => {
    const isRequestFull =
      isReady && requestLimit != null && isWorkingRequestPrintFull(workingPrintCount, requestLimit);
    const roomRemaining =
      isReady && requestLimit != null
        ? workingRequestPrintRoomRemaining(workingPrintCount, requestLimit)
        : 0;
    // Guests: keep Add CTAs enabled so clicks can redirect to login (#13).
    // Signed-in: conservative while unknown — do not treat missing data as "full room".
    const canAddPrints = !firebaseUser
      ? true
      : isReady && requestLimit != null && roomRemaining > 0;

    let exhaustedMessage: string | null = null;
    let exhaustedStatusText: string | null = null;
    let exhaustedHelperText: string | null = null;

    if (isRequestFull && requestLimit != null) {
      exhaustedMessage = formatWorkingRequestFullUserMessage(requestLimit);
      exhaustedStatusText = formatWorkingRequestFullStatusLine(requestLimit);
      exhaustedHelperText = formatWorkingRequestFullHelperText();
    }

    return {
      limit: requestLimit,
      customerShowLimit,
      workingPrintCount,
      roomRemaining,
      isRequestFull,
      isReady,
      exhaustedMessage,
      exhaustedStatusText,
      exhaustedHelperText,
      canAddPrints,
    };
  }, [customerShowLimit, firebaseUser, isReady, requestLimit, workingPrintCount]);
}
