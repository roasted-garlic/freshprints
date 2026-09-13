'use client';

import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

import { useAuth } from '../context/AuthContext';
import { needsPortalCustomerProfileCompletion } from '../types/auth.types';
import {
  buildPortalAuthHref,
  getPortalReturnToFromSearch,
  resolvePortalPostAuthPathForSession,
} from '../utils/portalReturnUrl';
import { CATALOG_HOME_PATH } from '../../print-requests/utils/catalogSelectionNavigation';

/**
 * When an already-signed-in user hits `/login` or `/login-required`, send them
 * to their returnTo (share → catalog deep link) or Discover (`/`).
 */
export function RedirectAuthenticatedFromAuthPages() {
  const router = useRouter();
  const { bootstrapStatus, isAuthenticated, isInitialBootstrap } = useAuth();

  useEffect(() => {
    if (isInitialBootstrap) {
      return;
    }

    const returnTo = getPortalReturnToFromSearch(window.location.search);
    const destination = resolvePortalPostAuthPathForSession(
      returnTo === '/' ? CATALOG_HOME_PATH : returnTo,
      bootstrapStatus === 'portal-admin' ? 'admin' : 'customer',
    );

    if (isAuthenticated) {
      router.replace(destination);
      return;
    }

    if (needsPortalCustomerProfileCompletion(bootstrapStatus)) {
      router.replace(buildPortalAuthHref('/complete-profile', destination));
    }
  }, [bootstrapStatus, isAuthenticated, isInitialBootstrap, router]);

  return null;
}
