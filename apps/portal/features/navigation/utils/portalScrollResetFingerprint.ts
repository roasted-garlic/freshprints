import { PORTAL_DESIGN_DEEP_LINK_PARAM } from '../../catalog/utils/portalDesignShareUrls';

/**
 * Catalog filter / library query fingerprint that ignores design-details deep links.
 * Used so `?designId=` open/close does not look like a route change for scroll reset.
 */
export function portalSearchFingerprintIgnoringDesignId(search: string): string {
  const params = new URLSearchParams(search.startsWith('?') ? search.slice(1) : search);
  params.delete(PORTAL_DESIGN_DEEP_LINK_PARAM);
  return params.toString();
}

/**
 * True when pathname is unchanged and the only search difference is `designId`
 * (add, remove, or swap). Other query or path changes are not design-modal-only.
 */
export function isDesignIdOnlySearchChange(
  previousPathname: string,
  previousSearch: string,
  nextPathname: string,
  nextSearch: string,
): boolean {
  if (previousPathname !== nextPathname) {
    return false;
  }
  return (
    portalSearchFingerprintIgnoringDesignId(previousSearch) ===
    portalSearchFingerprintIgnoringDesignId(nextSearch)
  );
}
