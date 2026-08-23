import { REQUEST_ARTWORK_PATH, buildRequestArtworkHref, CATALOG_HOME_PATH } from '../../print-requests/utils/catalogSelectionNavigation';

export type PortalNavItemId = 'library' | 'showDesigns' | 'customDesigns' | 'upload' | 'donate';

export interface PortalNavItem {
  id: PortalNavItemId;
  href: string;
  label: string;
}

export const PORTAL_ACCOUNT_HREF = '/dashboard';
/** Favorites live on Account; kept for dashboard / deep links. */
export const PORTAL_FAVORITES_HREF = '/favorites';

/** Primary sidebar order: Browse → Upload → Custom → Donate → Upcoming Shows. Favorites live on Account. */
export const portalNavItems: PortalNavItem[] = [
  { id: 'library', href: '/catalog', label: 'Browse Designs' },
  { id: 'upload', href: REQUEST_ARTWORK_PATH, label: 'Upload Designs' },
  { id: 'customDesigns', href: '/custom-designs', label: 'Custom Designs' },
  { id: 'donate', href: '/donate', label: 'Donate Designs' },
  { id: 'showDesigns', href: '/shows', label: 'Upcoming Shows' },
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

  if (pathname === '/shows' || pathname.startsWith('/shows/')) {
    return 'showDesigns';
  }

  if (pathname === '/custom-designs' || pathname.startsWith('/custom-designs/')) {
    return 'customDesigns';
  }

  if (pathname === REQUEST_ARTWORK_PATH || pathname.startsWith(`${REQUEST_ARTWORK_PATH}/`)) {
    return 'upload';
  }

  if (pathname === '/donate' || pathname.startsWith('/donate/')) {
    return 'donate';
  }

  return null;
}

export function resolvePortalNavHref(item: PortalNavItem, pathname: string): string {
  if (item.id === 'donate') {
    if (pathname === '/donate' || pathname.startsWith('/donate/')) {
      return '/donate';
    }
    return `/donate?returnTo=${encodeURIComponent(pathname)}`;
  }

  if (item.id !== 'upload') {
    return item.href;
  }

  const returnTo =
    pathname === REQUEST_ARTWORK_PATH || pathname.startsWith(`${REQUEST_ARTWORK_PATH}/`)
      ? CATALOG_HOME_PATH
      : pathname;

  return buildRequestArtworkHref({ returnTo });
}

/**
 * Guest menu links stay on the real soft-auth routes inside the app shell.
 * AuthGate no longer redirects away; PortalAppShell shows a content overlay.
 */
export function resolvePortalNavHrefForGuest(item: PortalNavItem, pathname: string): string {
  return resolvePortalNavHref(item, pathname);
}
