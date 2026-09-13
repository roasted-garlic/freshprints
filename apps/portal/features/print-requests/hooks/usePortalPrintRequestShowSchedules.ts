'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

import type { PortalCustomerShowSchedule } from '@fresh-prints/shared/utils/portalCustomerShowSchedule';

import { portalShowSelectionService } from '../services/portalShowSelectionService';

export function usePortalPrintRequestShowSchedules(printRequestId: string | undefined) {
  const [schedules, setSchedules] = useState<PortalCustomerShowSchedule[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const activeRequestIdRef = useRef(printRequestId);
  activeRequestIdRef.current = printRequestId;

  const reload = useCallback(async () => {
    if (!printRequestId) {
      setSchedules([]);
      setIsLoading(false);
      return;
    }
    setIsLoading(true);
    try {
      const byRequestId = await portalShowSelectionService.getPrintRequestShowSchedules([printRequestId]);
      if (activeRequestIdRef.current === printRequestId) {
        setSchedules(byRequestId[printRequestId] ?? []);
      }
    } catch {
      if (activeRequestIdRef.current === printRequestId) setSchedules([]);
    } finally {
      if (activeRequestIdRef.current === printRequestId) setIsLoading(false);
    }
  }, [printRequestId]);

  const clearSchedules = useCallback(() => {
    setSchedules([]);
  }, []);

  useEffect(() => {
    void reload();
  }, [reload]);

  return { clearSchedules, isLoading, reload, schedules };
}
