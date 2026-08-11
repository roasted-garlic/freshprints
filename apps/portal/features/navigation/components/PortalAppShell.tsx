'use client';

import { usePathname } from 'next/navigation';
import { useLayoutEffect, useRef, type ReactNode, type RefObject } from 'react';

import { GuestAuthGateOverlay } from '../../auth/components/GuestAuthGateOverlay';
import { useAuth } from '../../auth/context/AuthContext';
import { isPortalPublicBrowsePath } from '../../auth/utils/portalPublicBrowsePath';
import { PortalAboutFirstVisitModal } from '../../help/components/PortalAboutFirstVisitModal';
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

const STICKY_TOP_OFFSET_VAR = '--portal-sticky-top-offset';

function isGuestBrowseSession(bootstrapStatus: string): boolean {
  return bootstrapStatus === 'unauthenticated' || bootstrapStatus === 'anonymous-guest';
}

/**
 * Keep fixed toasts below the sticky header stack (header + optional prints-left banner).
 * When the banner is absent, offset is header-only.
 */
function useSyncPortalStickyTopOffset(topRef: RefObject<HTMLDivElement | null>) {
  useLayoutEffect(() => {
    const el = topRef.current;
    if (!el || typeof window === 'undefined') {
      return;
    }

    const sync = () => {
      const height = Math.ceil(el.getBoundingClientRect().height);
      document.documentElement.style.setProperty(STICKY_TOP_OFFSET_VAR, `${height}px`);
    };

    sync();
    const resizeObserver = new ResizeObserver(sync);
    resizeObserver.observe(el);
    window.addEventListener('resize', sync);

    return () => {
      resizeObserver.disconnect();
      window.removeEventListener('resize', sync);
      document.documentElement.style.removeProperty(STICKY_TOP_OFFSET_VAR);
    };
  }, [topRef]);
}

function PortalAppShellContent({ children }: PortalAppShellProps) {
  const pathname = usePathname();
  const { bootstrapStatus, isAuthenticated } = useAuth();
  const { closeDrawer, isDrawerOpen } = usePortalDrawer();
  const stickyTopRef = useRef<HTMLDivElement>(null);
  useSyncPortalStickyTopOffset(stickyTopRef);
  const showGuestAuthOverlay =
    !isAuthenticated &&
    isGuestBrowseSession(bootstrapStatus) &&
    !isPortalPublicBrowsePath(pathname);
  const aboutModalEligible =
    (bootstrapStatus === 'ready' ||
      bootstrapStatus === 'unauthenticated' ||
      bootstrapStatus === 'anonymous-guest') &&
    isPortalPublicBrowsePath(pathname) &&
    !showGuestAuthOverlay;

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
        <div className="portal-app-top" ref={stickyTopRef}>
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

      <PortalAboutFirstVisitModal isEligible={aboutModalEligible} />

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
