'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

import { usePortalPrintRequests } from '../../print-requests/context/PortalPrintRequestContext';
import { PlusIcon } from '../../shared/components/PortalIcons';
import { portalNavItems, resolveActivePortalNavItem } from '../constants/portalNavItems';
import { PortalNavIcon } from './PortalNavIcon';

const BOTTOM_NAV_LABELS: Record<string, string> = {
  designs: 'Designs',
  requests: 'Requests',
};

export function PortalBottomNav() {
  const pathname = usePathname();
  const activeItemId = resolveActivePortalNavItem(pathname);
  const { handleStartRequestClick, isCreating } = usePortalPrintRequests();

  const designsItem = portalNavItems.find((item) => item.id === 'designs')!;
  const requestsItem = portalNavItems.find((item) => item.id === 'requests')!;

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
        aria-label={isCreating ? 'Starting print request' : 'Start print request'}
        className="portal-bottom-nav-fab"
        disabled={isCreating}
        onClick={handleStartRequestClick}
        type="button"
      >
        <PlusIcon size={24} />
      </button>
    </nav>
  );
}
