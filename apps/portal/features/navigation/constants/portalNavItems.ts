import { REQUEST_ARTWORK_PATH, buildRequestArtworkHref, CATALOG_HOME_PATH } from '../../print-requests/utils/catalogSelectionNavigation';

export type PortalNavItemId = 'library' | 'customDesigns' | 'upload';

export interface PortalNavItem {
  id: PortalNavItemId;
  href: string;
  label: string;
}

export const PORTAL_ACCOUNT_HREF = '/dashboard';
/** Favorites live on Account; kept for dashboard / deep links. */
export const PORTAL_FAVORITES_HREF = '/favorites';

/** Primary sidebar order: Browse Designs → Upload Designs → Custom Designs. Favorites live on Account. */
export const portalNavItems: PortalNavItem[] = [
  { id: 'library', href: '/catalog', label: 'Browse Designs' },
  { id: 'upload', href: REQUEST_ARTWORK_PATH, label: 'Upload Designs' },
  { id: 'customDesigns', href: '/custom-designs', label: 'Custom Designs' },
];

export function isPortalAccountRoute(pathname: string): boolean {
  return pathname.startsWith('/dashboard');
}

export function resolveActivePortalNavItem(pathname: string): PortalNavItemId | null {
  if (pathname === '/' || pathname.startsWith('/?')) {
    return null;
  }

  if (pathname.startsWith('/catalog')) {
    return 'library';
  }

  if (pathname === '/custom-designs' || pathname.startsWith('/custom-designs/')) {
    return 'customDesigns';
  }

  if (pathname === REQUEST_ARTWORK_PATH || pathname.startsWith(`${REQUEST_ARTWORK_PATH}/`)) {
    return 'upload';
  }

  return null;
}

export function resolvePortalNavHref(item: PortalNavItem, pathname: string): string {
  if (item.id !== 'upload') {
    return item.href;
  }

  const returnTo =
    pathname === REQUEST_ARTWORK_PATH || pathname.startsWith(`${REQUEST_ARTWORK_PATH}/`)
      ? CATALOG_HOME_PATH
      : pathname;

  return buildRequestArtworkHref({ returnTo });
}
