'use client';

import { useCallback, useState } from 'react';

import type { QueuePortalPrintRequestToShowRequest } from '@fresh-prints/shared/types/portal/queuePortalPrintRequestToShow.types';

import { portalShowSelectionService } from '../services/portalShowSelectionService';

export function useQueuePrintRequestToShow() {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const queueToShow = useCallback(async (input: QueuePortalPrintRequestToShowRequest) => {
    setIsSubmitting(true);
    setError(null);

    try {
      return await portalShowSelectionService.queuePrintRequestToShow(input);
    } catch (queueError) {
      const message =
        queueError instanceof Error ? queueError.message : 'Unable to add request to a show\'s print run.';
      setError(message);
      throw queueError;
    } finally {
      setIsSubmitting(false);
    }
  }, []);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  return {
    queueToShow,
    isSubmitting,
    error,
    clearError,
  };
}
