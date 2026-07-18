'use client';

import { useRouter } from 'next/navigation';
import { useEffect, type ReactNode } from 'react';

import { PORTAL_APP_NAME } from '../../brand/portalBrand';
import { useAuth } from '../context/AuthContext';
import { needsPortalCustomerProfileCompletion } from '../types/auth.types';
import { buildPortalAuthHref, getCurrentPortalPath } from '../utils/portalReturnUrl';

interface AuthGateProps {
  children: ReactNode;
}

export function AuthGate({ children }: AuthGateProps) {
  const router = useRouter();
  const { bootstrapStatus, error, isInitialBootstrap, isAuthenticated, logout } = useAuth();

  useEffect(() => {
    if (isInitialBootstrap) {
      return;
    }

    const returnTo = getCurrentPortalPath(window.location);

    if (bootstrapStatus === 'unauthenticated') {
      router.replace(buildPortalAuthHref('/login', returnTo));
      return;
    }

    if (needsPortalCustomerProfileCompletion(bootstrapStatus)) {
      router.replace(buildPortalAuthHref('/complete-profile', returnTo));
    }
  }, [bootstrapStatus, isInitialBootstrap, router]);

  if (isInitialBootstrap || bootstrapStatus === 'initializing' || bootstrapStatus === 'loading-profile') {
    return (
      <main className="portal-shell">
        <p className="portal-muted">Loading your account…</p>
      </main>
    );
  }

  if (needsPortalCustomerProfileCompletion(bootstrapStatus)) {
    return (
      <main className="portal-shell">
        <p className="portal-muted">Finishing account setup…</p>
      </main>
    );
  }

  if (!isAuthenticated) {
    if (bootstrapStatus === 'unauthenticated') {
      return (
        <main className="portal-shell">
          <p className="portal-muted">Redirecting to sign in…</p>
        </main>
      );
    }

    return (
      <main className="portal-shell portal-shell-narrow">
        <p className="portal-eyebrow">{PORTAL_APP_NAME}</p>
        <h1>Account unavailable</h1>
        <p className="portal-lead">{error ?? 'This account cannot access the Request Portal.'}</p>
        <button
          className="portal-button portal-button-secondary"
          onClick={() => {
            void logout();
          }}
          type="button"
        >
          Sign out
        </button>
      </main>
    );
  }

  return <>{children}</>;
}
