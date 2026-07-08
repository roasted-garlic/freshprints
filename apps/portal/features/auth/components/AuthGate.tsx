'use client';

import { useRouter } from 'next/navigation';
import { useEffect, type ReactNode } from 'react';

import { PORTAL_APP_NAME } from '../../brand/portalBrand';
import { useAuth } from '../context/AuthContext';

interface AuthGateProps {
  children: ReactNode;
}

export function AuthGate({ children }: AuthGateProps) {
  const router = useRouter();
  const { bootstrapStatus, error, isInitialBootstrap, isAuthenticated } = useAuth();

  useEffect(() => {
    if (!isInitialBootstrap && bootstrapStatus === 'unauthenticated') {
      router.replace('/login');
    }
  }, [bootstrapStatus, isInitialBootstrap, router]);

  if (isInitialBootstrap || bootstrapStatus === 'initializing' || bootstrapStatus === 'loading-profile') {
    return (
      <main className="portal-shell">
        <p className="portal-muted">Loading your account…</p>
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
        <p className="portal-lead">{error ?? 'This account cannot access the customer portal.'}</p>
      </main>
    );
  }

  return <>{children}</>;
}
