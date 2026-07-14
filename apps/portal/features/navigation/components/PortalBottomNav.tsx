'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

import { usePortalPrintRequests } from '../../print-requests/context/PortalPrintRequestContext';
import { ShoppingBagIcon } from '../../shared/components/PortalIcons';
import {
  portalNavItems,
  resolveActivePortalNavItem,
  resolvePortalNavHref,
  type PortalNavItemId,
} from '../constants/portalNavItems';
import { PortalNavIcon } from './PortalNavIcon';

const BOTTOM_NAV_ITEMS = [
  { id: 'library' as const, label: 'Library' },
  { id: 'upload' as const, label: 'Upload' },
] satisfies ReadonlyArray<{ id: PortalNavItemId; label: string }>;

export function PortalBottomNav() {
  const pathname = usePathname();
  const activeItemId = resolveActivePortalNavItem(pathname);
  const { currentRequestAggregates, openCurrentRequestDrawer } = usePortalPrintRequests();

  const totalPrints = currentRequestAggregates.totalPrintQuantity;
  const bottomNavItems = BOTTOM_NAV_ITEMS.map((entry) => {
    const item = portalNavItems.find((navItem) => navItem.id === entry.id);
    if (!item) {
      throw new Error(`Missing portal nav item: ${entry.id}`);
    }
    return { ...item, label: entry.label };
  });

  return (
    <nav aria-label="Portal navigation" className="portal-bottom-nav">
      <div className="portal-bottom-nav-bar">
        <div className="portal-bottom-nav-links">
          {bottomNavItems.map((item) => {
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
          })}
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
