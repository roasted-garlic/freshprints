'use client';

import { useCallback, useRef, useState } from 'react';

import type { QueuePortalPrintRequestToShowRequest } from '@fresh-prints/shared/types/portal/queuePortalPrintRequestToShow.types';

import { portalShowSelectionService } from '../services/portalShowSelectionService';

/**
 * Scopes a submit error to the show id it actually happened for (Plan Section 23, Amendment 5) —
 * previously `error` was a single global string with no notion of which show it belonged to, so a
 * capacity/submit error surfaced for Show A stayed visible after the customer selected Show B,
 * making the stale error appear to apply to the newly selected show. A monotonic generation counter
 * discards a late-arriving error/result if the caller has since moved on to evaluating a different
 * show (mirrors this repo's existing stale-completion pattern, e.g. `itemMutationGeneration.ts`).
 */
export function useQueuePrintRequestToShow() {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<{ showId: string; message: string } | null>(null);
  const activeRef = useRef<Promise<unknown> | null>(null);
  const generationRef = useRef(0);

  const queueToShow = useCallback(async (input: QueuePortalPrintRequestToShowRequest) => {
    if (activeRef.current) {
      return activeRef.current as ReturnType<typeof portalShowSelectionService.queuePrintRequestToShow>;
    }
    const generation = ++generationRef.current;
    setIsSubmitting(true);
    setError(null);

    const pending = portalShowSelectionService.queuePrintRequestToShow(input);
    activeRef.current = pending;
    try {
      return await pending;
    } catch (queueError) {
      const message =
        queueError instanceof Error ? queueError.message : 'Unable to add request to a show\'s print run.';
      // Only the still-latest attempt (i.e., the caller has not since selected a different show,
      // which bumps the generation via `clearError`/a fresh `queueToShow` call) may set the error —
      // a stale rejection for a show the customer has since navigated away from must not resurface.
      if (generationRef.current === generation) {
        setError({ showId: input.upcomingShowId, message });
      }
      throw queueError;
    } finally {
      if (activeRef.current === pending) {
        activeRef.current = null;
      }
      if (generationRef.current === generation) {
        setIsSubmitting(false);
      }
    }
  }, []);

  /**
   * Clears the current error and invalidates any in-flight attempt's ability to set a new one —
   * call this whenever the selected show changes, not only on modal close.
   */
  const clearError = useCallback(() => {
    generationRef.current += 1;
    setError(null);
  }, []);

  return {
    queueToShow,
    isSubmitting,
    /** The submit error's user-facing message, or null. Already scoped to the show it occurred for. */
    error: error?.message ?? null,
    /** The show id the current error belongs to, or null if there is no error. */
    errorShowId: error?.showId ?? null,
    clearError,
  };
}
