'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import type { ReactNode } from 'react';

import { PORTAL_APP_NAME } from '../../brand/portalBrand';
import { portalNavItems, resolveActivePortalNavItem } from '../constants/portalNavItems';
import { PortalBottomNav } from './PortalBottomNav';
import { PortalHeaderActions } from './PortalHeaderActions';
import { PortalNavIcon } from './PortalNavIcon';

interface PortalAppShellProps {
  children: ReactNode;
}

export function PortalAppShell({ children }: PortalAppShellProps) {
  const pathname = usePathname();
  const activeItemId = resolveActivePortalNavItem(pathname);

  return (
    <div className="portal-app-shell">
      <header className="portal-app-header">
        <div className="portal-app-header-brand">
          <span className="portal-eyebrow">{PORTAL_APP_NAME}</span>
        </div>

        <nav aria-label="Portal navigation" className="portal-desktop-nav">
          <ul className="portal-desktop-nav-list">
            {portalNavItems.map((item) => {
              const isActive = item.id === activeItemId;

              return (
                <li key={item.id}>
                  <Link
                    aria-current={isActive ? 'page' : undefined}
                    className={`portal-desktop-nav-link portal-button-leading-icon${isActive ? ' portal-desktop-nav-link-active' : ''}`}
                    href={item.href}
                  >
                    <PortalNavIcon itemId={item.id} size={16} />
                    {item.label}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>

        <PortalHeaderActions />
      </header>

      <div className="portal-app-content">{children}</div>

      <PortalBottomNav />
    </div>
  );
}
