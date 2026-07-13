'use client';

import type { ReactNode } from 'react';

import { CurrentRequestDrawer } from '../../print-requests/components/CurrentRequestDrawer';
import { PortalPrintRequestProvider } from '../../print-requests/context/PortalPrintRequestContext';
import { PortalToastProvider } from '../../shared/context/PortalToastContext';
import { PortalDrawerProvider, usePortalDrawer } from '../context/PortalDrawerContext';
import { PortalAppHeader } from './PortalAppHeader';
import { PortalBottomNav } from './PortalBottomNav';
import { PortalScrollReset } from './PortalScrollReset';
import { PortalSidebar } from './PortalSidebar';

interface PortalAppShellProps {
  children: ReactNode;
}

function PortalAppShellContent({ children }: PortalAppShellProps) {
  const { close: closeDrawer, isOpen: isDrawerOpen } = usePortalDrawer();

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
        <PortalAppHeader />
        <div className="portal-app-content">{children}</div>
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
          <PortalAppShellContent>{children}</PortalAppShellContent>
        </PortalPrintRequestProvider>
      </PortalToastProvider>
    </PortalDrawerProvider>
  );
}
