'use client';

import { useCallback, useRef, useState } from 'react';

import type { UnqueuePortalPrintRequestFromShowRequest } from '@fresh-prints/shared/types/portal/unqueuePortalPrintRequestFromShow.types';

import { portalShowSelectionService } from '../services/portalShowSelectionService';

export function useUnqueuePrintRequestFromShow() {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const activeRef = useRef<Promise<unknown> | null>(null);

  const unqueueFromShow = useCallback(async (input: UnqueuePortalPrintRequestFromShowRequest) => {
    if (activeRef.current) {
      return activeRef.current as ReturnType<
        typeof portalShowSelectionService.unqueuePrintRequestFromShow
      >;
    }

    setIsSubmitting(true);
    setError(null);

    const pending = portalShowSelectionService.unqueuePrintRequestFromShow(input);
    activeRef.current = pending;
    try {
      return await pending;
    } catch (unqueueError) {
      const message =
        unqueueError instanceof Error
          ? unqueueError.message
          : 'Unable to remove this request from the show right now.';
      setError(message);
      throw unqueueError;
    } finally {
      if (activeRef.current === pending) {
        activeRef.current = null;
      }
      setIsSubmitting(false);
    }
  }, []);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  return {
    unqueueFromShow,
    isSubmitting,
    error,
    clearError,
  };
}
