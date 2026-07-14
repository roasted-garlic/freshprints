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

const BOTTOM_NAV_ITEM_IDS: PortalNavItemId[] = ['library', 'upload'];

const BOTTOM_NAV_LABELS: Record<(typeof BOTTOM_NAV_ITEM_IDS)[number], string> = {
  library: 'Library',
  upload: 'Upload',
};

export function PortalBottomNav() {
  const pathname = usePathname();
  const activeItemId = resolveActivePortalNavItem(pathname);
  const { currentRequestAggregates, openCurrentRequestDrawer } = usePortalPrintRequests();

  const totalPrints = currentRequestAggregates.totalPrintQuantity;
  const bottomNavItems = BOTTOM_NAV_ITEM_IDS.map(
    (id) => portalNavItems.find((item) => item.id === id)!,
  );

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
                <span>{BOTTOM_NAV_LABELS[item.id]}</span>
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
        <span className="portal-bottom-nav-fab-badge" data-empty={totalPrints === 0 ? 'true' : 'false'}>
          {totalPrints}
        </span>
      </button>
    </nav>
  );
}
