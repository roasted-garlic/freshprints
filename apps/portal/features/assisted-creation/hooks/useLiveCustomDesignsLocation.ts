'use client';

import { useLayoutEffect, useRef, useState } from 'react';
import { usePathname, useSearchParams } from 'next/navigation';

import {
  readLiveCustomDesignsLocation,
  resolveHydrationSearchParams,
} from '../utils/resolveClientSearchParams';

/**
 * Custom Designs location that:
 * - On first client paint, bridges hard-refresh deep links from window.location
 * - After that, trusts Next so Back / "Custom Designs" nav can reach choose path
 */
export function useLiveCustomDesignsLocation(): {
  ready: boolean;
  pathname: string;
  searchParams: URLSearchParams;
} {
  const nextPathname = usePathname();
  const nextSearchParams = useSearchParams();
  const hydratedRef = useRef(false);
  const [ready, setReady] = useState(false);
  const [pathname, setPathname] = useState(nextPathname);
  const [searchParams, setSearchParams] = useState<URLSearchParams>(
    () => new URLSearchParams(nextSearchParams.toString()),
  );

  useLayoutEffect(() => {
    if (!hydratedRef.current) {
      const live = readLiveCustomDesignsLocation();
      setPathname(live.pathname || nextPathname);
      setSearchParams(resolveHydrationSearchParams(nextSearchParams, live.searchParams));
      hydratedRef.current = true;
      setReady(true);
      return;
    }

    setPathname(nextPathname);
    setSearchParams(new URLSearchParams(nextSearchParams.toString()));
  }, [nextPathname, nextSearchParams]);

  return { ready, pathname, searchParams };
}
