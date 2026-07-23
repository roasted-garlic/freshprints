'use client';

import Link from 'next/link';
import { Menu } from 'lucide-react';

import { useAuth } from '../../auth/context/AuthContext';
import { buildPortalLoginHref } from '../../auth/utils/requirePortalLogin';
import { PortalLogo } from '../../brand/components/PortalLogo';
import { usePortalBrandLogoSettings } from '../../brand/hooks/usePortalBrandLogoSettings';
import { LogInIcon, ShoppingBagIcon } from '../../shared/components/PortalIcons';
import { PortalNotificationsBell } from '../../notifications/components/PortalNotificationsBell';
import { CATALOG_HOME_PATH } from '../../print-requests/utils/catalogSelectionNavigation';
import { usePortalPrintRequests } from '../../print-requests/context/PortalPrintRequestContext';
import { usePortalDrawer } from '../context/PortalDrawerContext';

export function PortalAppHeader() {
  const { isAuthenticated } = useAuth();
  const { openNav } = usePortalDrawer();
  const { currentRequestAggregates, openCurrentRequestDrawer } = usePortalPrintRequests();
  const brandLogoSettings = usePortalBrandLogoSettings();

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
      </div>

      <div className="portal-app-header-brand">
        <Link
          aria-label="Go to Fresh Prints home"
          className="portal-app-header-brand-link"
          href={CATALOG_HOME_PATH}
        >
          <PortalLogo
            alt="Fresh Prints Request Portal"
            className="portal-app-header-logo"
            heightPx={brandLogoSettings.portalHeader.heightPx}
          />
        </Link>
      </div>

      <div className="portal-app-header-actions">
        {isAuthenticated ? <PortalNotificationsBell /> : null}
        {!isAuthenticated ? (
          <Link
            className="portal-button portal-button-secondary portal-button-sm portal-button-leading-icon portal-app-header-guest-login"
            href={buildPortalLoginHref()}
          >
            <LogInIcon size={14} />
            Login / Signup
          </Link>
        ) : null}
        {isAuthenticated ? (
          <button
            aria-label={`Request, ${totalPrints} total prints${
              attentionCount > 0 ? `, ${attentionCount} need attention` : ''
            }`}
            className="portal-app-header-action portal-app-header-basket"
            onClick={() => {
              openCurrentRequestDrawer();
            }}
            type="button"
          >
            <span className="portal-app-header-action-icon">
              <ShoppingBagIcon size={18} />
              <span
                aria-hidden
                className="portal-app-header-basket-badge"
                data-empty={totalPrints === 0 ? 'true' : 'false'}
              >
                {totalPrints > 99 ? '99+' : totalPrints}
              </span>
            </span>
            <span className="portal-app-header-action-label">Request</span>
          </button>
        ) : null}
      </div>
    </header>
  );
}
