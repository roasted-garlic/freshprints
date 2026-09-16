'use client';

import type { ReactNode } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

import { PortalLogo } from '../../brand/components/PortalLogo';
import { ThemeToggle } from '../../theme/components/ThemeToggle';
import { useAuth } from '../../auth/context/AuthContext';
import {
  PortalAdminShowPickerProvider,
  usePortalAdminShowPicker,
} from '../context/PortalAdminShowPickerContext';

function ShowPickerMenuButton({ className }: { className?: string }) {
  const { isShowPickerOpen, openShowPicker, closeShowPicker } = usePortalAdminShowPicker();
  return (
    <button
      aria-controls="portal-admin-show-picker-title"
      aria-expanded={isShowPickerOpen}
      aria-label={isShowPickerOpen ? 'Close show list' : 'Open show list'}
      className={`portal-admin-menu-button${className ? ` ${className}` : ''}`}
      onClick={() => (isShowPickerOpen ? closeShowPicker() : openShowPicker())}
      type="button"
    >
      <svg aria-hidden="true" className="portal-admin-menu-icon" viewBox="0 0 24 24">
        <path d="M4 6h16M4 12h16M4 18h16" />
      </svg>
    </button>
  );
}

function PortalAdminShellChrome({ children }: { children: ReactNode }) {
  const { user, logout, isAuthActionLoading } = useAuth();
  const pathname = usePathname();
  const isStaffArtworkUpload = pathname === '/admin/staff-artwork';
  const isShowQueue = !isStaffArtworkUpload;

  return (
    <div className="portal-admin-shell">
      <header className="portal-admin-header">
        <div className="portal-admin-header-side portal-admin-header-start">
          {isShowQueue ? <ShowPickerMenuButton className="portal-admin-menu-button-start" /> : null}
          <h1 className="portal-admin-header-title">
            {isStaffArtworkUpload ? 'Admin · Staff Artwork Upload' : 'Admin · Show Queue'}
          </h1>
        </div>

        <div className="portal-admin-header-brand">
          <PortalLogo alt="Fresh Prints" className="portal-admin-logo" heightPx={52} />
        </div>

        <div className="portal-admin-header-side portal-admin-header-end">
          {isShowQueue ? <ShowPickerMenuButton className="portal-admin-menu-button-toolbar" /> : null}
          <div className="portal-admin-header-actions">
            <ThemeToggle compact />
            <span className="portal-admin-identity">{user?.displayName ?? 'Staff'}</span>
            <button
              className="portal-button portal-button-secondary portal-admin-signout"
              disabled={isAuthActionLoading}
              onClick={() => void logout()}
              type="button"
            >
              Sign out
            </button>
          </div>
        </div>
      </header>
      <nav aria-label="Admin destinations" className="portal-admin-nav">
        <Link
          aria-current={isShowQueue ? 'page' : undefined}
          className={`portal-admin-nav-link${isShowQueue ? ' is-active' : ''}`}
          href="/admin/show-queue"
        >
          Show Queue
        </Link>
        <Link
          aria-current={isStaffArtworkUpload ? 'page' : undefined}
          className={`portal-admin-nav-link${isStaffArtworkUpload ? ' is-active' : ''}`}
          href="/admin/staff-artwork"
        >
          Staff Artwork Upload
        </Link>
      </nav>
      <div className="portal-admin-body">{children}</div>
    </div>
  );
}

export function PortalAdminShell({ children }: { children: ReactNode }) {
  return (
    <PortalAdminShowPickerProvider>
      <PortalAdminShellChrome>{children}</PortalAdminShellChrome>
    </PortalAdminShowPickerProvider>
  );
}
