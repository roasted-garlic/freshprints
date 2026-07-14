'use client';

import Link from 'next/link';
import { usePathname, useSearchParams } from 'next/navigation';
import { Menu } from 'lucide-react';

import { PortalLogo } from '../../brand/components/PortalLogo';
import { ImageUpIcon, ShoppingBagIcon } from '../../shared/components/PortalIcons';
import {
  buildRequestArtworkHref,
  CATALOG_HOME_PATH,
  REQUEST_ARTWORK_PATH,
} from '../../print-requests/utils/catalogSelectionNavigation';
import { usePortalDrawer } from '../context/PortalDrawerContext';
import { usePortalPrintRequests } from '../../print-requests/context/PortalPrintRequestContext';

export function PortalAppHeader() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { openNav } = usePortalDrawer();
  const {
    currentRequestAggregates,
    openCurrentRequestDrawer,
  } = usePortalPrintRequests();

  const totalPrints = currentRequestAggregates.totalPrintQuantity;
  const attentionCount = currentRequestAggregates.attentionCount;

  const query = searchParams.toString();
  const currentLocation = `${pathname}${query ? `?${query}` : ''}`;
  const returnTo =
    pathname === REQUEST_ARTWORK_PATH || pathname.startsWith(`${REQUEST_ARTWORK_PATH}/`)
      ? CATALOG_HOME_PATH
      : currentLocation;
  const uploadHref = buildRequestArtworkHref({ returnTo });

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
        <Link
          aria-label="Upload Designs"
          className="portal-app-header-action portal-app-header-upload"
          href={uploadHref}
          title="Upload Designs"
        >
          <ImageUpIcon size={18} />
          <span className="portal-app-header-action-label portal-app-header-upload-label-full">
            Upload Designs
          </span>
          <span className="portal-app-header-action-label portal-app-header-upload-label-short">
            Upload
          </span>
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
