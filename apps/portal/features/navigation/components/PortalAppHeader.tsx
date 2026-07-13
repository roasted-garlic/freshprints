'use client';

import Link from 'next/link';
import { Menu } from 'lucide-react';

import { PORTAL_SUBTITLE } from '../../brand/portalBrand';
import { ImageUpIcon, ShoppingBagIcon } from '../../shared/components/PortalIcons';
import { usePortalDrawer } from '../context/PortalDrawerContext';
import { usePortalPrintRequests } from '../../print-requests/context/PortalPrintRequestContext';

export function PortalAppHeader() {
  const { open: openDrawer } = usePortalDrawer();
  const {
    currentRequestAggregates,
    openCurrentRequestDrawer,
  } = usePortalPrintRequests();

  const totalPrints = currentRequestAggregates.totalPrintQuantity;
  const attentionCount = currentRequestAggregates.attentionCount;

  return (
    <header className="portal-app-header">
      <div className="portal-app-header-start">
        <button
          aria-label="Open navigation menu"
          className="portal-app-header-menu-button"
          onClick={openDrawer}
          type="button"
        >
          <Menu aria-hidden size={20} strokeWidth={2} />
        </button>
        <div className="portal-app-header-brand">
          <p className="portal-app-header-title">Fresh Prints</p>
          <p className="portal-app-header-subtitle">{PORTAL_SUBTITLE}</p>
        </div>
      </div>

      <div className="portal-app-header-actions">
        <Link
          aria-label="Upload Designs"
          className="portal-app-header-action"
          href="/requests/artwork"
          title="Upload Designs"
        >
          <ImageUpIcon size={18} />
          <span className="portal-app-header-action-label">Upload Designs</span>
        </Link>
        <button
          aria-label={`Current Request, ${totalPrints} total prints${
            attentionCount > 0 ? `, ${attentionCount} need attention` : ''
          }`}
          className="portal-app-header-action portal-app-header-basket"
          onClick={openCurrentRequestDrawer}
          type="button"
        >
          <ShoppingBagIcon size={18} />
          <span className="portal-app-header-action-label">Current Request</span>
          <span className="portal-app-header-basket-badge" data-empty={totalPrints === 0 ? 'true' : 'false'}>
            {totalPrints}
          </span>
        </button>
      </div>
    </header>
  );
}
