'use client';

import type { ReactNode } from 'react';

import { PortalPrintRequestProvider } from '../../print-requests/context/PortalPrintRequestContext';
import { PortalDrawerProvider, usePortalDrawer } from '../context/PortalDrawerContext';
import { PortalAppHeader } from './PortalAppHeader';
import { PortalBottomNav } from './PortalBottomNav';
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
        <PortalAppHeader />
        <div className="portal-app-content">{children}</div>
        <PortalBottomNav />
      </div>
    </div>
  );
}

export function PortalAppShell({ children }: PortalAppShellProps) {
  return (
    <PortalDrawerProvider>
      <PortalPrintRequestProvider>
        <PortalAppShellContent>{children}</PortalAppShellContent>
      </PortalPrintRequestProvider>
    </PortalDrawerProvider>
  );
}
