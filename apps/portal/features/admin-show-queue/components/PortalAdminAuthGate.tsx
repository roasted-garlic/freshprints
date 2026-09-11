'use client';

import { useRouter } from 'next/navigation';
import { useEffect, type ReactNode } from 'react';

import { PORTAL_APP_NAME } from '../../brand/portalBrand';
import { useAuth } from '../../auth/context/AuthContext';
import { buildPortalAuthHref } from '../../auth/utils/portalReturnUrl';

export function PortalAdminAuthGate({ children }: { children: ReactNode }) {
  const router = useRouter();
  const { bootstrapStatus, isInitialBootstrap, isAuthenticated, logout } = useAuth();

  useEffect(() => {
    if (isInitialBootstrap || bootstrapStatus === 'loading-profile' || bootstrapStatus === 'initializing') {
      return;
    }
    if (bootstrapStatus === 'unauthenticated' || bootstrapStatus === 'anonymous-guest') {
      router.replace(buildPortalAuthHref('/login', '/admin/show-queue'));
    }
  }, [bootstrapStatus, isInitialBootstrap, router]);

  if (isInitialBootstrap || bootstrapStatus === 'initializing' || bootstrapStatus === 'loading-profile') {
    return <main className="portal-admin-state"><p className="portal-muted">Checking staff access…</p></main>;
  }

  if (bootstrapStatus === 'portal-admin' && isAuthenticated) {
    return <>{children}</>;
  }

  if (bootstrapStatus === 'unauthenticated' || bootstrapStatus === 'anonymous-guest') {
    return <main className="portal-admin-state"><p className="portal-muted">Redirecting to staff sign-in…</p></main>;
  }

  return (
    <main className="portal-admin-state" role="alert">
      <div className="portal-admin-state-card">
        <p className="portal-eyebrow">{PORTAL_APP_NAME}</p>
        <h1>Access denied</h1>
        <p className="portal-lead">
          You don’t have permission to view the Show Queue. If you need access, contact a Fresh Prints administrator.
        </p>
        <button className="portal-button portal-button-secondary" onClick={() => void logout()} type="button">
          Sign out
        </button>
      </div>
    </main>
  );
}
