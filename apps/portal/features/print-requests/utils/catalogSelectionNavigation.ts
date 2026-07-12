import type { CatalogDiscoveryMode } from '@fresh-prints/shared/utils/catalogDiscoveryRanking';

import type { PortalRequestDetailFrom } from './portalRequestDetailReturn';
import { buildRequestDetailHref } from './portalRequestDetailReturn';

export const CATALOG_HOME_PATH = '/catalog';
export const CATALOG_LIBRARY_PATH = '/catalog/library';

/** Request detail with the customer upload panel opened. */
export function buildRequestUploadHref(
  printRequestId: string,
  options?: { from?: PortalRequestDetailFrom | null },
): string {
  return buildRequestDetailHref(printRequestId, {
    from: options?.from ?? null,
    upload: true,
  });
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
