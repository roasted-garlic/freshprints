'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight, LogOut, User } from 'lucide-react';

import { resolvePortalDisplayName, getProfileInitials } from '../../account/utils/profileDisplay';
import { useAuth } from '../../auth/context/AuthContext';
import { PORTAL_SUBTITLE } from '../../brand/portalBrand';
import { PortalLogo } from '../../brand/components/PortalLogo';
import { PortalConfirmModal } from '../../shared/components/PortalConfirmModal';
import { ThemeToggle } from '../../theme/components/ThemeToggle';
import { PORTAL_ACCOUNT_HREF, isPortalAccountRoute, portalNavItems, resolveActivePortalNavItem } from '../constants/portalNavItems';
import { usePortalDrawer } from '../context/PortalDrawerContext';
import { PortalNavIcon } from './PortalNavIcon';

const portalSidebarCollapsedStorageKey = 'fresh-prints-portal-sidebar-collapsed';

function getStoredSidebarCollapsed(): boolean {
  try {
    return localStorage.getItem(portalSidebarCollapsedStorageKey) === 'true';
  } catch {
    return false;
  }
}

function isNavItemActive(itemId: (typeof portalNavItems)[number]['id'], pathname: string): boolean {
  return itemId === resolveActivePortalNavItem(pathname);
}

export function PortalSidebar() {
  const pathname = usePathname();
  const { customer, isAuthActionLoading, logout, user } = useAuth();
  const { close: closeDrawer, isOpen: isDrawerOpen } = usePortalDrawer();
  const [isCollapsed, setIsCollapsed] = useState(() => getStoredSidebarCollapsed());
  const [isDesktop, setIsDesktop] = useState(false);
  const [isLogoutConfirmOpen, setIsLogoutConfirmOpen] = useState(false);

  const displayName = resolvePortalDisplayName(customer?.displayName, user?.displayName);
  const username = customer?.username;
  const isAccountActive = isPortalAccountRoute(pathname);
  const showCollapsed = isCollapsed && isDesktop && !isDrawerOpen;

  useEffect(() => {
    closeDrawer();
  }, [closeDrawer, pathname]);

  useEffect(() => {
    const mediaQuery = window.matchMedia('(min-width: 48rem)');

    const updateViewport = () => {
      setIsDesktop(mediaQuery.matches);
    };

    updateViewport();
    mediaQuery.addEventListener('change', updateViewport);

    return () => {
      mediaQuery.removeEventListener('change', updateViewport);
    };
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem(portalSidebarCollapsedStorageKey, String(isCollapsed));
    } catch {
      // Ignore storage failures.
    }
  }, [isCollapsed]);

  const toggleCollapsed = useCallback(() => {
    setIsCollapsed((currentValue) => !currentValue);
  }, []);

  const handleLogoutConfirm = () => {
    void logout();
  };

  const sidebarClassName = [
    'portal-sidebar',
    showCollapsed ? 'portal-sidebar-collapsed' : '',
    isDrawerOpen ? 'portal-sidebar-drawer-open' : '',
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <>
      <aside aria-label="Portal navigation" className={sidebarClassName}>
        <span aria-hidden className="portal-sidebar-edge" />
        <div className="portal-sidebar-brand">
          <PortalLogo size={showCollapsed ? 32 : 36} />
          {!showCollapsed ? (
            <div className="portal-sidebar-brand-copy">
              <p className="portal-sidebar-brand-title">Fresh Prints</p>
              <p className="portal-sidebar-brand-subtitle">{PORTAL_SUBTITLE}</p>
            </div>
          ) : null}
          <button
            aria-label="Close navigation menu"
            className="portal-sidebar-drawer-close"
            onClick={closeDrawer}
            type="button"
          >
            <ChevronLeft aria-hidden size={22} strokeWidth={2} />
          </button>
        </div>

        <nav className="portal-sidebar-nav">
          {portalNavItems.map((item) => {
            const isActive = isNavItemActive(item.id, pathname);

            return (
              <Link
                key={item.id}
                aria-current={isActive ? 'page' : undefined}
                className={`portal-sidebar-link${isActive ? ' portal-sidebar-link-active' : ''}`}
                href={item.href}
                onClick={closeDrawer}
                title={showCollapsed ? item.label : undefined}
              >
                <span className="portal-sidebar-link-main">
                  <PortalNavIcon itemId={item.id} size={18} />
                  <span className="portal-sidebar-link-label">{item.label}</span>
                </span>
              </Link>
            );
          })}
        </nav>

        <div className="portal-sidebar-spacer" />

        <div className="portal-sidebar-footer">
          {showCollapsed ? (
            <Link
              aria-current={isAccountActive ? 'page' : undefined}
              className={`portal-sidebar-link portal-sidebar-account-link${isAccountActive ? ' portal-sidebar-link-active' : ''}`}
              href={PORTAL_ACCOUNT_HREF}
              onClick={closeDrawer}
              title={displayName}
            >
              <span className="portal-sidebar-link-main">
                <User aria-hidden size={18} strokeWidth={1.75} />
                <span className="portal-sidebar-link-label">Account</span>
              </span>
            </Link>
          ) : (
            <Link
              aria-current={isAccountActive ? 'page' : undefined}
              aria-label={`Open your account, ${displayName}`}
              className={`portal-sidebar-user-card${isAccountActive ? ' portal-sidebar-user-card-active' : ''}`}
              href={PORTAL_ACCOUNT_HREF}
              onClick={closeDrawer}
              title="Open your account"
            >
              <div aria-hidden className="portal-sidebar-user-avatar">
                {getProfileInitials(displayName)}
              </div>
              <div className="portal-sidebar-user-meta">
                <p className="portal-sidebar-user-name">{displayName}</p>
                {username ? <p className="portal-sidebar-user-handle">@{username}</p> : null}
              </div>
              <ChevronRight
                aria-hidden
                className="portal-sidebar-user-card-chevron"
                size={16}
                strokeWidth={2}
              />
            </Link>
          )}

          <div className="portal-sidebar-footer-actions">
            <ThemeToggle compact />
            <button
              aria-label="Sign out"
              className="portal-sidebar-sign-out"
              disabled={isAuthActionLoading}
              onClick={() => setIsLogoutConfirmOpen(true)}
              title="Sign out"
              type="button"
            >
              <LogOut aria-hidden size={16} strokeWidth={2} />
              <span className="portal-sidebar-sign-out-label">
                {isAuthActionLoading ? 'Signing out…' : 'Sign out'}
              </span>
            </button>
          </div>

          <button
            aria-label={showCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            className="portal-sidebar-collapse-button"
            onClick={toggleCollapsed}
            type="button"
          >
            {showCollapsed ? (
              <ChevronsRight aria-hidden size={16} strokeWidth={2} />
            ) : (
              <ChevronsLeft aria-hidden size={16} strokeWidth={2} />
            )}
          </button>
        </div>
      </aside>

      <PortalConfirmModal
        cancelLabel="Stay signed in"
        confirmLabel="Log out"
        confirmVariant="danger"
        isConfirmLoading={isAuthActionLoading}
        isOpen={isLogoutConfirmOpen}
        onCancel={() => {
          if (!isAuthActionLoading) {
            setIsLogoutConfirmOpen(false);
          }
        }}
        onConfirm={handleLogoutConfirm}
        title="Log out?"
      >
        <p className="portal-muted portal-confirm-modal-message">
          You will need to sign in again to browse designs and manage your print requests.
        </p>
      </PortalConfirmModal>
    </>
  );
}
