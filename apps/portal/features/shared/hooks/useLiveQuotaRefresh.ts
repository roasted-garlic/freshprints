'use client';

import { useEffect, useRef } from 'react';

import { traceFirestoreCacheEvent } from '@fresh-prints/shared/utils/firestoreUsageTrace';

const DEFAULT_POLL_INTERVAL_MS = 45_000;

/**
 * Re-runs a soft quota refresh when the tab becomes visible / window gains focus,
 * and on a short poll while enabled — so Studio Settings limit changes show up
 * without redeploying Portal.
 */
export function useLiveQuotaRefresh(
  refresh: () => void | Promise<void>,
  options?: {
    enabled?: boolean;
    /** Default 45s. Pass 0 to disable polling. */
    intervalMs?: number;
  },
): void {
  const enabled = options?.enabled ?? true;
  const intervalMs = options?.intervalMs ?? DEFAULT_POLL_INTERVAL_MS;
  const refreshRef = useRef(refresh);
  refreshRef.current = refresh;

  useEffect(() => {
    if (!enabled) {
      return;
    }

    let cancelled = false;

    const run = (triggerReason: 'initial-mount' | 'focus' | 'visibility' | 'timer') => {
      if (cancelled) {
        return;
      }
      traceFirestoreCacheEvent('retry', {
        app: 'portal',
        collection: 'settings',
        source: 'useLiveQuotaRefresh',
        triggerReason,
      });
      void refreshRef.current();
    };

    run('initial-mount');

    const onVisibility = () => {
      if (document.visibilityState === 'visible') {
        run('visibility');
      }
    };
    const onFocus = () => {
      run('focus');
    };

    document.addEventListener('visibilitychange', onVisibility);
    window.addEventListener('focus', onFocus);

    const pollId =
      intervalMs > 0
        ? window.setInterval(() => {
            if (document.visibilityState === 'visible') {
              run('timer');
            }
          }, intervalMs)
        : null;

    return () => {
      cancelled = true;
      document.removeEventListener('visibilitychange', onVisibility);
      window.removeEventListener('focus', onFocus);
      if (pollId !== null) {
        window.clearInterval(pollId);
      }
    };
  }, [enabled, intervalMs]);
}
