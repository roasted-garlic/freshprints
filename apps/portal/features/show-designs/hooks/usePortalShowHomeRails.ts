'use client';

import { useEffect, useState } from 'react';

import type { PortalShowHomeRail } from '../services/portalShowDiscoveryContent';
import {
  buildPortalNextShowRailFromShows,
  buildPortalShowsThisWeekRailFromShows,
} from '../services/portalShowDiscoveryContent';
import { portalShowDesignsService } from '../services/portalShowDesignsService';

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

    setNextShow({ error: null, isLoading: true, rail: null });
    setThisWeek({ error: null, isLoading: true, rail: null });

    void (async () => {
      try {
        const { shows } = await portalShowDesignsService.listPublicShows();
        if (cancelled) {
          return;
        }

        void buildPortalNextShowRailFromShows(shows)
          .then((rail) => {
            if (!cancelled) {
              setNextShow({ error: null, isLoading: false, rail });
            }
          })
          .catch((loadError) => {
            if (!cancelled) {
              const message =
                loadError instanceof Error
                  ? loadError.message
                  : 'Unable to load Next Show designs.';
              setNextShow({ error: message, isLoading: false, rail: null });
            }
          });

        void buildPortalShowsThisWeekRailFromShows(shows)
          .then((rail) => {
            if (!cancelled) {
              setThisWeek({ error: null, isLoading: false, rail });
            }
          })
          .catch((loadError) => {
            if (!cancelled) {
              const message =
                loadError instanceof Error
                  ? loadError.message
                  : "Unable to load this week's designs.";
              setThisWeek({ error: message, isLoading: false, rail: null });
            }
          });
      } catch (loadError) {
        if (!cancelled) {
          const message =
            loadError instanceof Error ? loadError.message : 'Unable to load show designs.';
          setNextShow({ error: message, isLoading: false, rail: null });
          setThisWeek({ error: message, isLoading: false, rail: null });
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  return { nextShow, thisWeek };
}
