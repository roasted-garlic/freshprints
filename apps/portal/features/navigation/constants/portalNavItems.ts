export type PortalNavItemId = 'designs' | 'requests';

export interface PortalNavItem {
  id: PortalNavItemId;
  href: string;
  label: string;
}

export const PORTAL_ACCOUNT_HREF = '/dashboard';

export const portalNavItems: PortalNavItem[] = [
  { id: 'designs', href: '/catalog', label: 'Designs' },
  { id: 'requests', href: '/requests?tab=working', label: 'Requests' },
];

export function isPortalAccountRoute(pathname: string): boolean {
  return pathname.startsWith('/dashboard');
}

export function resolveActivePortalNavItem(pathname: string): PortalNavItemId | null {
  if (pathname.startsWith('/catalog')) {
    return 'designs';
  }

  if (pathname.startsWith('/requests')) {
    return 'requests';
  }

  return null;
}
