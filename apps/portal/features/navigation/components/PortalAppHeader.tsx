'use client';

import { Menu } from 'lucide-react';

import { PORTAL_SUBTITLE } from '../../brand/portalBrand';
import { usePortalDrawer } from '../context/PortalDrawerContext';

export function PortalAppHeader() {
  const { open: openDrawer } = usePortalDrawer();

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
    </header>
  );
}
