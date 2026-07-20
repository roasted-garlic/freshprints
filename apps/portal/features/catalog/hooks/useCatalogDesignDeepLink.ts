'use client';

import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useCallback, useEffect, useRef, useState } from 'react';

import { catalogService } from '../services/catalogService';
import type { CatalogDesign } from '../types/catalog.types';
import {
  PORTAL_DESIGN_DEEP_LINK_PARAM,
  readPortalDesignDeepLinkId,
} from '../utils/portalDesignShareUrls';

interface UseCatalogDesignDeepLinkOptions {
  selectedDesign: CatalogDesign | null;
  setSelectedDesign: (design: CatalogDesign | null) => void;
}

/**
 * Opens the design details modal when `?designId=` is present, and keeps the
 * query param in sync with open/close. Fetches by id (not from the current
 * catalog page) so shared / cold-load deep links work even when the design is
 * not in the visible list.
 *
 * Close clears `designId` immediately via `history.replaceState` + `router.replace`
 * and sets a dismiss guard so a still-stale searchParams snapshot cannot reopen
 * the modal.
 *
 * The open effect clears its in-flight id on cleanup so React Strict Mode /
 * AuthGate remounts can retry instead of leaving `designId` in the URL with
 * the modal closed.
 */
export function useCatalogDesignDeepLink({
  selectedDesign,
  setSelectedDesign,
}: UseCatalogDesignDeepLinkOptions): {
  closeDesignDetails: () => void;
  deepLinkError: string | null;
  openDesignDetails: (design: CatalogDesign) => void;
} {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const deepLinkId = readPortalDesignDeepLinkId(searchParams);
  const loadingIdRef = useRef<string | null>(null);
  const dismissedDeepLinkIdRef = useRef<string | null>(null);
  const [deepLinkError, setDeepLinkError] = useState<string | null>(null);

  const buildUrlWithoutDesignId = useCallback(() => {
    const next = new URLSearchParams(searchParams.toString());
    next.delete(PORTAL_DESIGN_DEEP_LINK_PARAM);
    const query = next.toString();
    return query ? `${pathname}?${query}` : pathname;
  }, [pathname, searchParams]);

  const buildUrlWithDesignId = useCallback(
    (designId: string) => {
      const next = new URLSearchParams(searchParams.toString());
      next.set(PORTAL_DESIGN_DEEP_LINK_PARAM, designId);
      return `${pathname}?${next.toString()}`;
    },
    [pathname, searchParams],
  );

  const openDesignDetails = useCallback(
    (design: CatalogDesign) => {
      dismissedDeepLinkIdRef.current = null;
      setDeepLinkError(null);
      setSelectedDesign(design);
      const href = buildUrlWithDesignId(design.id);
      window.history.replaceState(window.history.state, '', href);
      router.replace(href, { scroll: false });
    },
    [buildUrlWithDesignId, router, setSelectedDesign],
  );

  const closeDesignDetails = useCallback(() => {
    const closingId = selectedDesign?.id ?? deepLinkId;
    if (closingId) {
      dismissedDeepLinkIdRef.current = closingId;
    }
    loadingIdRef.current = null;
    setDeepLinkError(null);
    setSelectedDesign(null);

    if (
      searchParams.has(PORTAL_DESIGN_DEEP_LINK_PARAM) ||
      (typeof window !== 'undefined' &&
        new URLSearchParams(window.location.search).has(PORTAL_DESIGN_DEEP_LINK_PARAM))
    ) {
      const href = buildUrlWithoutDesignId();
      // Immediate URL update so reopen effect cannot see a stale designId.
      window.history.replaceState(window.history.state, '', href);
      router.replace(href, { scroll: false });
    }
  }, [
    buildUrlWithoutDesignId,
    deepLinkId,
    router,
    searchParams,
    selectedDesign?.id,
    setSelectedDesign,
  ]);

  useEffect(() => {
    if (!deepLinkId) {
      dismissedDeepLinkIdRef.current = null;
      loadingIdRef.current = null;
      return;
    }

    if (dismissedDeepLinkIdRef.current === deepLinkId) {
      return;
    }

    if (selectedDesign?.id === deepLinkId) {
      return;
    }

    // In-flight guard only while this effect instance owns the fetch.
    // Cleanup must clear loadingIdRef — otherwise React Strict Mode remount
    // (and AuthGate mount after bootstrap) leaves designId in the URL with
    // the modal permanently closed.
    if (loadingIdRef.current === deepLinkId) {
      return;
    }

    let cancelled = false;
    loadingIdRef.current = deepLinkId;
    setDeepLinkError(null);

    void (async () => {
      try {
        const designs = await catalogService.getReadyDesignsByIds([deepLinkId]);
        if (cancelled || dismissedDeepLinkIdRef.current === deepLinkId) {
          return;
        }

        const design = designs[0] ?? null;
        if (design) {
          setSelectedDesign(design);
          return;
        }

        setDeepLinkError('That design is unavailable or no longer in the library.');
        const href = buildUrlWithoutDesignId();
        window.history.replaceState(window.history.state, '', href);
        router.replace(href, { scroll: false });
      } finally {
        if (!cancelled && loadingIdRef.current === deepLinkId) {
          loadingIdRef.current = null;
        }
      }
    })();

    return () => {
      cancelled = true;
      if (loadingIdRef.current === deepLinkId) {
        loadingIdRef.current = null;
      }
    };
  }, [buildUrlWithoutDesignId, deepLinkId, router, selectedDesign?.id, setSelectedDesign]);

  return { closeDesignDetails, deepLinkError, openDesignDetails };
}
