'use client';

import { usePathname, useSearchParams } from 'next/navigation';
import { useLayoutEffect } from 'react';

function resetPortalScroll() {
  window.scrollTo(0, 0);
  document.documentElement.scrollTop = 0;
  document.body.scrollTop = 0;

  const main = document.querySelector('.portal-app-main');
  if (main instanceof HTMLElement) {
    main.scrollTop = 0;
  }

  const content = document.querySelector('.portal-app-content');
  if (content instanceof HTMLElement) {
    content.scrollTop = 0;
  }
}

/**
 * Shared app shell keeps the document scrollport across soft navigations.
 * Next.js window scroll restore can race layout/content paint on mobile, so
 * reset synchronously and again after paint when the route (or catalog query) changes.
 */
export function PortalScrollReset() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const search = searchParams.toString();

  useLayoutEffect(() => {
    if (typeof window !== 'undefined') {
      window.history.scrollRestoration = 'manual';
    }

    resetPortalScroll();

    const frame = window.requestAnimationFrame(() => {
      resetPortalScroll();
      window.requestAnimationFrame(resetPortalScroll);
    });
    const immediate = window.setTimeout(resetPortalScroll, 0);
    const delayed = window.setTimeout(resetPortalScroll, 50);

    return () => {
      window.cancelAnimationFrame(frame);
      window.clearTimeout(immediate);
      window.clearTimeout(delayed);
    };
  }, [pathname, search]);

  return null;
}
