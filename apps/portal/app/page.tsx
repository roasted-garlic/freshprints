'use client';

import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

import { useAuth } from '../features/auth/context/AuthContext';
import { PORTAL_APP_NAME } from '../features/brand/portalBrand';

export default function HomePage() {
  const router = useRouter();
  const { bootstrapStatus, isAuthenticated, isInitialBootstrap } = useAuth();

  useEffect(() => {
    if (isInitialBootstrap) {
      return;
    }

    router.replace(isAuthenticated ? '/dashboard' : '/login');
  }, [bootstrapStatus, isAuthenticated, isInitialBootstrap, router]);

  return (
    <main className="portal-shell">
      <p className="portal-muted">Loading {PORTAL_APP_NAME}…</p>
    </main>
  );
}
