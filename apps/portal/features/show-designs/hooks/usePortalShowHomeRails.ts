'use client';

import { useEffect, useState } from 'react';

import type { PortalShowHomeRail } from '../services/portalShowDiscoveryContent';
import {
  loadPortalNextShowRail,
  loadPortalShowsThisWeekRail,
} from '../services/portalShowDiscoveryContent';

export interface PortalShowHomeRailSlot {
  error: string | null;
  isLoading: boolean;
  rail: PortalShowHomeRail | null;
}

const EMPTY_SLOT: PortalShowHomeRailSlot = {
  error: null,
  isLoading: true,
  rail: null,
};

export function usePortalShowHomeRails(): {
  nextShow: PortalShowHomeRailSlot;
  thisWeek: PortalShowHomeRailSlot;
} {
  const [nextShow, setNextShow] = useState<PortalShowHomeRailSlot>(EMPTY_SLOT);
  const [thisWeek, setThisWeek] = useState<PortalShowHomeRailSlot>(EMPTY_SLOT);

  useEffect(() => {
    let cancelled = false;

    void (async () => {
      setNextShow({ error: null, isLoading: true, rail: null });
      try {
        const rail = await loadPortalNextShowRail();
        if (!cancelled) {
          setNextShow({ error: null, isLoading: false, rail });
        }
      } catch (loadError) {
        if (!cancelled) {
          setNextShow({
            error: loadError instanceof Error ? loadError.message : 'Unable to load Next Show designs.',
            isLoading: false,
            rail: null,
          });
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;

    void (async () => {
      setThisWeek({ error: null, isLoading: true, rail: null });
      try {
        const rail = await loadPortalShowsThisWeekRail();
        if (!cancelled) {
          setThisWeek({ error: null, isLoading: false, rail });
        }
      } catch (loadError) {
        if (!cancelled) {
          setThisWeek({
            error: loadError instanceof Error ? loadError.message : 'Unable to load this week\'s designs.',
            isLoading: false,
            rail: null,
          });
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  return { nextShow, thisWeek };
}
