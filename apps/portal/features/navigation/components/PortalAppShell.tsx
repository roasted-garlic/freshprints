'use client';

import { usePathname } from 'next/navigation';
import type { ReactNode } from 'react';

import { GuestAuthGateOverlay } from '../../auth/components/GuestAuthGateOverlay';
import { useAuth } from '../../auth/context/AuthContext';
import { isPortalPublicBrowsePath } from '../../auth/utils/portalPublicBrowsePath';
import { CurrentRequestDrawer } from '../../print-requests/components/CurrentRequestDrawer';
import { PortalWorkingRequestLimitBanner } from '../../print-requests/components/PortalWorkingRequestLimitBanner';
import { PortalPrintRequestProvider } from '../../print-requests/context/PortalPrintRequestContext';
import { FavoritesProvider } from '../../favorites/context/FavoritesProvider';
import { PortalToastProvider } from '../../shared/context/PortalToastContext';
import { PortalNotificationsProvider } from '../../notifications/context/PortalNotificationsProvider';
import { PortalDrawerProvider, usePortalDrawer } from '../context/PortalDrawerContext';
import { PortalAppHeader } from './PortalAppHeader';
import { PortalBottomNav } from './PortalBottomNav';
import { PortalScrollReset } from './PortalScrollReset';
import { PortalSidebar } from './PortalSidebar';

interface PortalAppShellProps {
  children: ReactNode;
}

function isGuestBrowseSession(bootstrapStatus: string): boolean {
  return bootstrapStatus === 'unauthenticated' || bootstrapStatus === 'anonymous-guest';
}

function PortalAppShellContent({ children }: PortalAppShellProps) {
  const pathname = usePathname();
  const { bootstrapStatus, isAuthenticated } = useAuth();
  const { closeDrawer, isDrawerOpen } = usePortalDrawer();
  const showGuestAuthOverlay =
    !isAuthenticated &&
    isGuestBrowseSession(bootstrapStatus) &&
    !isPortalPublicBrowsePath(pathname);

  return (
    <div className="portal-app-shell">
      <PortalSidebar />

      {isDrawerOpen ? (
        <div
          aria-hidden="true"
          className="portal-drawer-scrim"
          onClick={closeDrawer}
        />
      ) : null}

      <div className="portal-app-main">
        <PortalScrollReset />
        <div className="portal-app-top">
          <PortalAppHeader />
          <PortalWorkingRequestLimitBanner />
        </div>
        <div className={`portal-app-content${showGuestAuthOverlay ? ' has-guest-auth-overlay' : ''}`}>
          <div
            aria-hidden={showGuestAuthOverlay || undefined}
            className={showGuestAuthOverlay ? 'portal-app-content-inert' : undefined}
          >
            {children}
          </div>
          {showGuestAuthOverlay ? <GuestAuthGateOverlay /> : null}
        </div>
        <PortalBottomNav />
      </div>

      {/* Mounted here (not inside the context module) to avoid Context↔Drawer circular import. */}
      <CurrentRequestDrawer />
    </div>
  );
}

export function PortalAppShell({ children }: PortalAppShellProps) {
  return (
    <PortalDrawerProvider>
      <PortalToastProvider>
        <PortalPrintRequestProvider>
          <FavoritesProvider>
            <PortalNotificationsProvider>
              <PortalAppShellContent>{children}</PortalAppShellContent>
            </PortalNotificationsProvider>
          </FavoritesProvider>
        </PortalPrintRequestProvider>
      </PortalToastProvider>
    </PortalDrawerProvider>
  );
}
