'use client';

import Link from 'next/link';

import { usePortalMaintenance } from '../../maintenance/context/PortalMaintenanceContext';
import { CATALOG_HOME_PATH } from '../../print-requests/utils/catalogSelectionNavigation';

/**
 * Yellow maintenance notice on the login card while Portal maintenance is ON.
 */
export function PortalLoginMaintenanceBanner() {
  const { enabled, status } = usePortalMaintenance();
  if (status !== 'ready' || !enabled) {
    return null;
  }

  return (
    <div aria-live="polite" className="portal-maintenance-login-banner" role="status">
      Maintenance mode is on. Design browsing is paused. Please check back later.
    </div>
  );
}

/**
 * Hide browse while maintenance is ON/unknown so signed-out visitors are not
 * sent from login straight into the full-screen maintenance wall.
 */
export function PortalLoginBrowseDesignsAction() {
  const { enabled, status } = usePortalMaintenance();
  if (status !== 'ready' || enabled) {
    return null;
  }

  return (
    <div className="portal-auth-card-actions portal-login-required-actions">
      <Link className="portal-button portal-button-secondary" href={CATALOG_HOME_PATH}>
        Browse designs
      </Link>
    </div>
  );
}
