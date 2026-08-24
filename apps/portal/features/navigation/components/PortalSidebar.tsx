'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import {
  ChevronLeft,
  ChevronRight,
  CircleHelp,
  ExternalLink,
  LogIn,
  LogOut,
  User,
} from 'lucide-react';

import { FRESH_PRINTS_WHATNOT_PROFILE_URL } from '@fresh-prints/shared/constants/portal/portalExternalLinks.constants';
import { resolvePortalDisplayName, getProfileInitials } from '../../account/utils/profileDisplay';
import { useAuth } from '../../auth/context/AuthContext';
import { buildPortalLoginHrefForPath } from '../../auth/utils/requirePortalLogin';
import { PortalLogo } from '../../brand/components/PortalLogo';
import { usePortalBrandLogoSettings } from '../../brand/hooks/usePortalBrandLogoSettings';
import { CATALOG_HOME_PATH } from '../../print-requests/utils/catalogSelectionNavigation';
import { PortalConfirmModal } from '../../shared/components/PortalConfirmModal';
import { ThemeToggle } from '../../theme/components/ThemeToggle';
import {
  PORTAL_ACCOUNT_HREF,
  isPortalAccountRoute,
  portalNavItems,
  resolveActivePortalNavItem,
  resolvePortalNavHref,
  resolvePortalNavHrefForGuest,
} from '../constants/portalNavItems';
import { usePortalDrawer } from '../context/PortalDrawerContext';
import { PortalNavIcon } from './PortalNavIcon';

function isNavItemActive(itemId: (typeof portalNavItems)[number]['id'], pathname: string): boolean {
  return itemId === resolveActivePortalNavItem(pathname);
}

export function PortalSidebar() {
  const pathname = usePathname();
  const { customer, isAuthActionLoading, isAuthenticated, logout, user } = useAuth();
  const { closeDrawer, closeNav, isCollapsed, isDrawerOpen, openNav } = usePortalDrawer();
  const brandLogoSettings = usePortalBrandLogoSettings();
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
    setIsLogoutConfirmOpen(false);
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
                  heightPx={brandLogoSettings.portalSidebarCollapsed.heightPx}
                  variant="collapsed"
                />
              ) : (
                <PortalLogo
                  alt=""
                  className="portal-sidebar-brand-logo"
                  heightPx={brandLogoSettings.portalSidebar.heightPx}
                />
              )}
            </Link>
          </div>

          <nav className="portal-sidebar-nav">
            {portalNavItems.map((item) => {
              const isActive = isNavItemActive(item.id, pathname);
              const href = isAuthenticated
                ? resolvePortalNavHref(item, pathname)
                : resolvePortalNavHrefForGuest(item, pathname);

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
              aria-current={pathname === '/help' || pathname.startsWith('/help/') ? 'page' : undefined}
              className={`portal-sidebar-help-link${
                pathname === '/help' || pathname.startsWith('/help/') ? ' is-active' : ''
              }`}
              href="/help"
              onClick={closeDrawer}
              title="Help"
            >
              <span className="portal-sidebar-help-link-main">
                <CircleHelp
                  aria-hidden
                  className="portal-sidebar-help-icon"
                  size={18}
                  strokeWidth={1.75}
                />
                <span className="portal-sidebar-help-link-label">Help</span>
              </span>
            </Link>

            <a
              className="portal-sidebar-whatnot-link"
              href={FRESH_PRINTS_WHATNOT_PROFILE_URL}
              onClick={closeDrawer}
              rel="noopener noreferrer"
              target="_blank"
              title="Follow on Whatnot"
            >
              <span className="portal-sidebar-whatnot-link-main">
                <ExternalLink
                  aria-hidden
                  className="portal-sidebar-whatnot-icon"
                  size={18}
                  strokeWidth={1.75}
                />
                <span className="portal-sidebar-whatnot-link-label">Follow on Whatnot</span>
              </span>
            </a>

            {isAuthenticated ? (
              showCollapsed ? (
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
              )
            ) : null}

            <div className="portal-sidebar-footer-actions">
              <ThemeToggle compact />
              {isAuthenticated ? (
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
              ) : (
                <Link
                  aria-label="Login / Signup"
                  className="portal-sidebar-sign-out"
                  href={buildPortalLoginHrefForPath(pathname)}
                  onClick={closeDrawer}
                  title="Login / Signup"
                >
                  <LogIn aria-hidden size={16} strokeWidth={2} />
                  <span className="portal-sidebar-sign-out-label">Login / Signup</span>
                </Link>
              )}
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
          You can still browse designs while signed out. Sign in again to manage print requests and
          account actions.
        </p>
      </PortalConfirmModal>
    </>
  );
}
