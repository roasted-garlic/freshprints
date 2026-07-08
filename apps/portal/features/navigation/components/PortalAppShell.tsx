'use client';

import type { ReactNode } from 'react';

import { PortalDrawerProvider, usePortalDrawer } from '../context/PortalDrawerContext';
import { PortalAppHeader } from './PortalAppHeader';
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
      </div>
    </div>
  );
}

export function PortalAppShell({ children }: PortalAppShellProps) {
  return (
    <PortalDrawerProvider>
      <PortalAppShellContent>{children}</PortalAppShellContent>
    </PortalDrawerProvider>
  );
}
