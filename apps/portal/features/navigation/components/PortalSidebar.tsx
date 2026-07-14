'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import { ChevronLeft, ChevronRight, HeartHandshake, LogOut, User } from 'lucide-react';

import { resolvePortalDisplayName, getProfileInitials } from '../../account/utils/profileDisplay';
import { useAuth } from '../../auth/context/AuthContext';
import { PortalLogo } from '../../brand/components/PortalLogo';
import { CATALOG_HOME_PATH } from '../../print-requests/utils/catalogSelectionNavigation';
import { PortalConfirmModal } from '../../shared/components/PortalConfirmModal';
import { ThemeToggle } from '../../theme/components/ThemeToggle';
import { PORTAL_ACCOUNT_HREF, isPortalAccountRoute, portalNavItems, resolveActivePortalNavItem, resolvePortalNavHref } from '../constants/portalNavItems';
import { usePortalDrawer } from '../context/PortalDrawerContext';
import { PortalNavIcon } from './PortalNavIcon';

function isNavItemActive(itemId: (typeof portalNavItems)[number]['id'], pathname: string): boolean {
  return itemId === resolveActivePortalNavItem(pathname);
}

export function PortalSidebar() {
  const pathname = usePathname();
  const { customer, isAuthActionLoading, logout, user } = useAuth();
  const { closeDrawer, closeNav, isCollapsed, isDrawerOpen, openNav } = usePortalDrawer();
  const [isDesktop, setIsDesktop] = useState(false);
  const [isLogoutConfirmOpen, setIsLogoutConfirmOpen] = useState(false);

  const displayName = resolvePortalDisplayName(customer?.displayName, user?.displayName);
  const username = customer?.username;
  const isAccountActive = isPortalAccountRoute(pathname);
  const showCollapsed = isCollapsed && isDesktop;
  // Desktop: always show mid-line edge tab. Mobile: only while drawer is open.
  const showEdgeTab = isDesktop || isDrawerOpen;
  const edgeTabExpands = isDesktop && isCollapsed;

  const handleEdgeTabClick = () => {
    if (edgeTabExpands) {
      openNav();
      return;
    }
    closeNav();
  };

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
        {showEdgeTab ? (
          <button
            aria-label={
              edgeTabExpands
                ? 'Expand sidebar'
                : isDesktop
                  ? 'Collapse sidebar'
                  : 'Close navigation menu'
            }
            className="portal-sidebar-edge-tab"
            onClick={handleEdgeTabClick}
            type="button"
          >
            {edgeTabExpands ? (
              <ChevronRight aria-hidden size={18} strokeWidth={2.25} />
            ) : (
              <ChevronLeft aria-hidden size={18} strokeWidth={2.25} />
            )}
          </button>
        ) : null}
        <div className="portal-sidebar-body">
          <div className="portal-sidebar-brand">
            <Link
              aria-label="Go to Fresh Prints home"
              className="portal-sidebar-brand-link"
              href={CATALOG_HOME_PATH}
              onClick={closeDrawer}
              title="Home"
            >
              {showCollapsed ? (
                <PortalLogo
                  alt=""
                  className="portal-sidebar-brand-logo portal-sidebar-brand-logo-collapsed"
                  size={36}
                  variant="collapsed"
                />
              ) : (
                <PortalLogo alt="" className="portal-sidebar-brand-logo" size={56} />
              )}
            </Link>
          </div>

          <nav className="portal-sidebar-nav">
            {portalNavItems.map((item) => {
              const isActive = isNavItemActive(item.id, pathname);
              const href = resolvePortalNavHref(item, pathname);

              return (
                <Link
                  key={item.id}
                  aria-current={isActive ? 'page' : undefined}
                  className={`portal-sidebar-link${isActive ? ' portal-sidebar-link-active' : ''}`}
                  href={href}
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
            <Link
              aria-current={pathname === '/donate' || pathname.startsWith('/donate/') ? 'page' : undefined}
              className={`portal-sidebar-donate-link${
                pathname === '/donate' || pathname.startsWith('/donate/')
                  ? ' is-active'
                  : ''
              }`}
              href={
                pathname === '/donate' || pathname.startsWith('/donate/')
                  ? '/donate'
                  : `/donate?returnTo=${encodeURIComponent(pathname)}`
              }
              onClick={closeDrawer}
              title="Donate Designs"
            >
              <span className="portal-sidebar-donate-link-main">
                <HeartHandshake aria-hidden className="portal-sidebar-donate-icon" size={18} strokeWidth={1.75} />
                <span className="portal-sidebar-donate-link-label">Donate Designs</span>
              </span>
            </Link>

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
          </div>
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
