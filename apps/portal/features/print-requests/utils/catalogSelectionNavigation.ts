import type { CatalogDiscoveryMode } from '@fresh-prints/shared/utils/catalogDiscoveryRanking';

import type { PortalRequestDetailFrom } from './portalRequestDetailReturn';

export const CATALOG_HOME_PATH = '/catalog';
export const CATALOG_LIBRARY_PATH = '/catalog/library';

/** Dedicated Portal page for artwork intended for the Current Request / printing. */
export const REQUEST_ARTWORK_PATH = '/requests/artwork';

/** Safe in-app return path for Back from Upload Designs (rejects absolute / protocol-relative URLs). */
export function sanitizePortalReturnTo(raw: string | null | undefined): string | null {
  if (!raw?.trim()) {
    return null;
  }
  const value = raw.trim();
  if (!value.startsWith('/') || value.startsWith('//') || value.includes('://')) {
    return null;
  }
  if (value === REQUEST_ARTWORK_PATH || value.startsWith(`${REQUEST_ARTWORK_PATH}?`)) {
    return null;
  }
  return value;
}

/** Request detail with the customer upload panel opened (legacy). Prefer REQUEST_ARTWORK_PATH. */
export function buildRequestUploadHref(
  printRequestId: string,
  options?: { from?: PortalRequestDetailFrom | null; returnTo?: string | null },
): string {
  // Prefer dedicated artwork page; keep requestId for deep-link continuity when needed.
  const params = new URLSearchParams();
  if (options?.from) {
    params.set('from', options.from);
  }
  params.set('requestId', printRequestId);
  const returnTo = sanitizePortalReturnTo(options?.returnTo);
  if (returnTo) {
    params.set('returnTo', returnTo);
  }
  const query = params.toString();
  return query ? `${REQUEST_ARTWORK_PATH}?${query}` : REQUEST_ARTWORK_PATH;
}

export function buildRequestArtworkHref(options?: {
  from?: PortalRequestDetailFrom | null;
  requestId?: string | null;
  returnTo?: string | null;
}): string {
  const params = new URLSearchParams();
  if (options?.requestId?.trim()) {
    params.set('requestId', options.requestId.trim());
  }
  if (options?.from) {
    params.set('from', options.from);
  }
  const returnTo = sanitizePortalReturnTo(options?.returnTo);
  if (returnTo) {
    params.set('returnTo', returnTo);
  }
  const query = params.toString();
  return query ? `${REQUEST_ARTWORK_PATH}?${query}` : REQUEST_ARTWORK_PATH;
}

export function buildCatalogSelectionHref(
  printRequestId: string,
  options?: {
    seedDesignId?: string;
    discover?: CatalogDiscoveryMode | null;
    from?: PortalRequestDetailFrom | null;
  },
): string {
  const params = new URLSearchParams({
    mode: 'request-selection',
    requestId: printRequestId,
  });

  if (options?.seedDesignId?.trim()) {
    params.set('seedDesignId', options.seedDesignId.trim());
  }

  if (options?.discover) {
    params.set('discover', options.discover);
  }

  if (options?.from) {
    params.set('from', options.from);
  }

  return `${CATALOG_LIBRARY_PATH}?${params.toString()}`;
}

/** Design Library browse URL (search / discovery filters / selection). */
export function buildCatalogLibraryHref(options?: {
  requestId?: string | null;
  selectionMode?: boolean;
  discover?: CatalogDiscoveryMode | null;
  search?: string | null;
  categoryId?: string | null;
}): string {
  const params = new URLSearchParams();

  if (options?.selectionMode && options.requestId) {
    params.set('mode', 'request-selection');
    params.set('requestId', options.requestId);
  }

  if (options?.discover) {
    params.set('discover', options.discover);
  }

  if (options?.search?.trim()) {
    params.set('q', options.search.trim());
  }

  if (options?.categoryId?.trim()) {
    params.set('category', options.categoryId.trim());
  }

  const query = params.toString();
  return query ? `${CATALOG_LIBRARY_PATH}?${query}` : CATALOG_LIBRARY_PATH;
}

/** @deprecated Use buildCatalogLibraryHref — kept for call-site clarity during migration. */
export function buildCatalogHref(options?: {
  requestId?: string | null;
  selectionMode?: boolean;
  discover?: CatalogDiscoveryMode | null;
  search?: string | null;
  categoryId?: string | null;
}): string {
  return buildCatalogLibraryHref(options);
}
