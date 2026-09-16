import { NextResponse } from 'next/server'

import {
  isPortalSearchIndexingEnabled,
  PORTAL_DISABLED_INDEXING_X_ROBOTS_TAG,
} from './features/brand/portalSearchIndexing'

/**
 * Attach X-Robots-Tag on non-indexable environments so crawlers that fetch the
 * page (including non-HTML) observe explicit noindex. Production indexing hosts
 * leave the header unset.
 */
export function middleware() {
  const response = NextResponse.next()
  if (!isPortalSearchIndexingEnabled()) {
    response.headers.set('X-Robots-Tag', PORTAL_DISABLED_INDEXING_X_ROBOTS_TAG)
  }
  return response
}

export const config = {
  // Skip Next internals and static assets; still cover HTML routes + robots/sitemap.
  matcher: ['/((?!_next/static|_next/image|favicon.ico|brand/|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)'],
}
