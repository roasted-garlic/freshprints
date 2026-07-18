'use client';

import Link from 'next/link';
import { Menu } from 'lucide-react';

import { PortalLogo } from '../../brand/components/PortalLogo';
import { ShoppingBagIcon } from '../../shared/components/PortalIcons';
import { PortalNotificationsBell } from '../../notifications/components/PortalNotificationsBell';
import { CATALOG_HOME_PATH } from '../../print-requests/utils/catalogSelectionNavigation';
import { usePortalPrintRequests } from '../../print-requests/context/PortalPrintRequestContext';
import { usePortalDrawer } from '../context/PortalDrawerContext';

export function PortalAppHeader() {
  const { openNav } = usePortalDrawer();
  const { currentRequestAggregates, openCurrentRequestDrawer } = usePortalPrintRequests();

  const totalPrints = currentRequestAggregates.totalPrintQuantity;
  const attentionCount = currentRequestAggregates.attentionCount;

  return (
    <header className="portal-app-header">
      <div className="portal-app-header-start">
        <button
          aria-label="Open navigation menu"
          className="portal-app-header-menu-button"
          onClick={openNav}
          type="button"
        >
          <Menu aria-hidden size={20} strokeWidth={2} />
        </button>
        <div className="portal-app-header-brand">
          <Link
            aria-label="Go to Fresh Prints home"
            className="portal-app-header-brand-link"
            href={CATALOG_HOME_PATH}
          >
            <PortalLogo alt="Fresh Prints Request Portal" className="portal-app-header-logo" size={52} />
          </Link>
        </div>
      </div>

      <div className="portal-app-header-actions">
        <PortalNotificationsBell />
        <button
          aria-label={`Your Stash, ${totalPrints} total prints${
            attentionCount > 0 ? `, ${attentionCount} need attention` : ''
          }`}
          className="portal-app-header-action portal-app-header-basket"
          onClick={openCurrentRequestDrawer}
          type="button"
        >
          <ShoppingBagIcon size={18} />
          <span className="portal-app-header-action-label">Your Stash</span>
          <span className="portal-app-header-basket-badge" data-empty={totalPrints === 0 ? 'true' : 'false'}>
            {totalPrints}
          </span>
        </button>
      </div>
    </header>
  );
}
