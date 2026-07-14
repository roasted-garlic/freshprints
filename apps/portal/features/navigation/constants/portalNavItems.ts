import { REQUEST_ARTWORK_PATH, buildRequestArtworkHref, CATALOG_HOME_PATH } from '../../print-requests/utils/catalogSelectionNavigation';

export type PortalNavItemId = 'library' | 'favorites' | 'upload';

export interface PortalNavItem {
  id: PortalNavItemId;
  href: string;
  label: string;
}

export const PORTAL_ACCOUNT_HREF = '/dashboard';
export const PORTAL_FAVORITES_HREF = '/favorites';

export const portalNavItems: PortalNavItem[] = [
  { id: 'library', href: '/catalog', label: 'Design Library' },
  { id: 'upload', href: REQUEST_ARTWORK_PATH, label: 'Upload Designs' },
  { id: 'favorites', href: PORTAL_FAVORITES_HREF, label: 'My Favorites' },
];

export function isPortalAccountRoute(pathname: string): boolean {
  return pathname.startsWith('/dashboard');
}

export function resolveActivePortalNavItem(pathname: string): PortalNavItemId | null {
  if (pathname === '/' || pathname.startsWith('/?')) {
    return null;
  }

  if (pathname === PORTAL_FAVORITES_HREF || pathname.startsWith(`${PORTAL_FAVORITES_HREF}/`)) {
    return 'favorites';
  }

  if (pathname.startsWith('/catalog')) {
    return 'library';
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
