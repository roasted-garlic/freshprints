'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { User } from 'lucide-react';

import { usePortalPrintRequests } from '../../print-requests/context/PortalPrintRequestContext';
import { ShoppingBagIcon } from '../../shared/components/PortalIcons';
import {
  PORTAL_ACCOUNT_HREF,
  isPortalAccountRoute,
  portalNavItems,
  resolveActivePortalNavItem,
  resolvePortalNavHref,
  type PortalNavItemId,
} from '../constants/portalNavItems';
import { PortalNavIcon } from './PortalNavIcon';

const BOTTOM_NAV_LEFT_ITEMS = [
  { id: 'library' as const, label: 'Browse' },
] satisfies ReadonlyArray<{ id: PortalNavItemId; label: string }>;

const BOTTOM_NAV_RIGHT_ITEMS = [
  { id: 'upload' as const, label: 'Upload' },
  { id: 'customDesigns' as const, label: 'Custom' },
] satisfies ReadonlyArray<{ id: PortalNavItemId; label: string }>;

function resolveBottomNavItem(entry: { id: PortalNavItemId; label: string }) {
  const item = portalNavItems.find((navItem) => navItem.id === entry.id);
  if (!item) {
    throw new Error(`Missing portal nav item: ${entry.id}`);
  }
  return { ...item, label: entry.label };
}

export function PortalBottomNav() {
  const pathname = usePathname();
  const activeItemId = resolveActivePortalNavItem(pathname);
  const { currentRequestAggregates, openCurrentRequestDrawer } = usePortalPrintRequests();

  const totalPrints = currentRequestAggregates.totalPrintQuantity;
  const isAccountActive = isPortalAccountRoute(pathname);
  const leftItems = BOTTOM_NAV_LEFT_ITEMS.map(resolveBottomNavItem);
  const rightItems = BOTTOM_NAV_RIGHT_ITEMS.map(resolveBottomNavItem);

  function renderLink(item: ReturnType<typeof resolveBottomNavItem>) {
    const isActive = activeItemId === item.id;
    return (
      <Link
        aria-current={isActive ? 'page' : undefined}
        className={`portal-bottom-nav-link${isActive ? ' portal-bottom-nav-link-active' : ''}`}
        href={resolvePortalNavHref(item, pathname)}
        key={item.id}
      >
        <PortalNavIcon itemId={item.id} size={20} />
        <span>{item.label}</span>
      </Link>
    );
  }

  return (
    <nav aria-label="Portal navigation" className="portal-bottom-nav">
      <div className="portal-bottom-nav-bar">
        <div className="portal-bottom-nav-links">
          <div className="portal-bottom-nav-side">
            <Link
              aria-current={isAccountActive ? 'page' : undefined}
              className={`portal-bottom-nav-link${isAccountActive ? ' portal-bottom-nav-link-active' : ''}`}
              href={PORTAL_ACCOUNT_HREF}
            >
              <User aria-hidden size={20} strokeWidth={1.75} />
              <span>Account</span>
            </Link>
            {leftItems.map(renderLink)}
          </div>
          <div aria-hidden className="portal-bottom-nav-fab-spacer" />
          <div className="portal-bottom-nav-side">{rightItems.map(renderLink)}</div>
        </div>
      </div>

      <button
        aria-label={`Open Current Request, ${totalPrints} total prints`}
        className="portal-bottom-nav-fab"
        onClick={openCurrentRequestDrawer}
        type="button"
      >
        <ShoppingBagIcon size={22} />
      </button>
    </nav>
  );
}
