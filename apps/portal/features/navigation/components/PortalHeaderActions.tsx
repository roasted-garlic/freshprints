'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState } from 'react';

import { useAuth } from '../../auth/context/AuthContext';
import { PortalConfirmModal } from '../../shared/components/PortalConfirmModal';
import { ThemeToggle } from '../../theme/components/ThemeToggle';
import { PORTAL_ACCOUNT_HREF, isPortalAccountRoute } from '../constants/portalNavItems';

export function PortalHeaderActions() {
  const pathname = usePathname();
  const { isAuthActionLoading, logout } = useAuth();
  const [isLogoutConfirmOpen, setIsLogoutConfirmOpen] = useState(false);
  const isAccountActive = isPortalAccountRoute(pathname);

  const handleLogoutConfirm = () => {
    void logout();
  };

  return (
    <>
      <div className="portal-app-header-actions">
        <Link
          aria-current={isAccountActive ? 'page' : undefined}
          className={`portal-header-action-button portal-header-account-link${isAccountActive ? ' is-active' : ''}`}
          href={PORTAL_ACCOUNT_HREF}
        >
          Account
        </Link>
        <button
          className="portal-header-action-button portal-header-logout-button"
          disabled={isAuthActionLoading}
          onClick={() => setIsLogoutConfirmOpen(true)}
          type="button"
        >
          Log out
        </button>
        <ThemeToggle />
      </div>

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
