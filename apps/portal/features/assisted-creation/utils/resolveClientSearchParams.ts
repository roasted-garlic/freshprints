/**
 * One-shot hard-refresh bridge: when Next has not hydrated the query string yet,
 * keep the live browser search. After the first client location commit, callers
 * must trust Next so Back / sidebar navigations to `/custom-designs` are not
 * overwritten by a stale `window.location.search`.
 */
export function resolveHydrationSearchParams(
  nextSearchParams: URLSearchParams,
  windowSearchParams: URLSearchParams,
): URLSearchParams {
  const nextQuery = nextSearchParams.toString();
  if (nextQuery) {
    return nextSearchParams;
  }
  if (windowSearchParams.toString()) {
    return windowSearchParams;
  }
  return nextSearchParams;
}

/** @deprecated Prefer resolveHydrationSearchParams + post-hydration Next trust. */
export function resolveClientSearchParams(
  nextSearchParams: URLSearchParams,
): URLSearchParams {
  if (typeof window === 'undefined') {
    return nextSearchParams;
  }
  return resolveHydrationSearchParams(
    nextSearchParams,
    new URLSearchParams(window.location.search),
  );
}

export function resolveClientPathname(nextPathname: string): string {
  if (typeof window === 'undefined') {
    return nextPathname;
  }
  return nextPathname || window.location.pathname;
}

/** Snapshot of the live browser location (client only). */
export function readLiveCustomDesignsLocation(): {
  pathname: string;
  searchParams: URLSearchParams;
} {
  if (typeof window === 'undefined') {
    return { pathname: '/custom-designs', searchParams: new URLSearchParams() };
  }
  return {
    pathname: window.location.pathname,
    searchParams: new URLSearchParams(window.location.search),
  };
}
