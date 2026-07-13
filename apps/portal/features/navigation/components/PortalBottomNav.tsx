'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

import { usePortalPrintRequests } from '../../print-requests/context/PortalPrintRequestContext';
import { ShoppingBagIcon } from '../../shared/components/PortalIcons';
import { portalNavItems, resolveActivePortalNavItem } from '../constants/portalNavItems';
import { PortalNavIcon } from './PortalNavIcon';

const BOTTOM_NAV_LABELS: Record<string, string> = {
  designs: 'Home',
  requests: 'Requests',
};

export function PortalBottomNav() {
  const pathname = usePathname();
  const activeItemId = resolveActivePortalNavItem(pathname);
  const { currentRequestAggregates, openCurrentRequestDrawer } = usePortalPrintRequests();

  const designsItem = portalNavItems.find((item) => item.id === 'designs')!;
  const requestsItem = portalNavItems.find((item) => item.id === 'requests')!;
  const totalPrints = currentRequestAggregates.totalPrintQuantity;

  return (
    <nav aria-label="Portal navigation" className="portal-bottom-nav">
      <div className="portal-bottom-nav-bar">
        <div className="portal-bottom-nav-links">
          <Link
            aria-current={activeItemId === 'designs' ? 'page' : undefined}
            className={`portal-bottom-nav-link${activeItemId === 'designs' ? ' portal-bottom-nav-link-active' : ''}`}
            href={designsItem.href}
          >
            <PortalNavIcon itemId="designs" size={20} />
            <span>{BOTTOM_NAV_LABELS.designs}</span>
          </Link>

          <Link
            aria-current={activeItemId === 'requests' ? 'page' : undefined}
            className={`portal-bottom-nav-link${activeItemId === 'requests' ? ' portal-bottom-nav-link-active' : ''}`}
            href={requestsItem.href}
          >
            <PortalNavIcon itemId="requests" size={20} />
            <span>{BOTTOM_NAV_LABELS.requests}</span>
          </Link>
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
