export type PortalNavItemId = 'home' | 'designs' | 'requests';

export interface PortalNavItem {
  id: PortalNavItemId;
  href: string;
  label: string;
}

export const portalNavItems: PortalNavItem[] = [
  { id: 'home', href: '/dashboard', label: 'Home' },
  { id: 'designs', href: '/catalog', label: 'Designs' },
  { id: 'requests', href: '/requests', label: 'Requests' },
];

export function resolveActivePortalNavItem(pathname: string): PortalNavItemId | null {
  if (pathname.startsWith('/dashboard')) {
    return 'home';
  }

  if (pathname.startsWith('/catalog')) {
    return 'designs';
  }

  if (pathname.startsWith('/requests')) {
    return 'requests';
  }

  return null;
}
