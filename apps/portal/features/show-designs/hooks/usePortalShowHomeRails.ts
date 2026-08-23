'use client';

import { useEffect, useState } from 'react';

import type { PortalShowHomeRail } from '../services/portalShowDiscoveryContent';
import { loadPortalShowHomeRails } from '../services/portalShowDiscoveryContent';

export function usePortalShowHomeRails() {
  const [rails, setRails] = useState<PortalShowHomeRail[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    void (async () => {
      setIsLoading(true);
      setError(null);
      try {
        const nextRails = await loadPortalShowHomeRails();
        if (!cancelled) {
          setRails(nextRails);
        }
      } catch (loadError) {
        if (!cancelled) {
          setError(loadError instanceof Error ? loadError.message : 'Unable to load show designs.');
          setRails([]);
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  return { error, isLoading, rails };
}
