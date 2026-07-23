'use client';

import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { Suspense } from 'react';

import { PortalAuthBrandLogo } from '../../features/brand/components/PortalAuthBrandLogo';
import { RedirectAuthenticatedFromAuthPages } from '../../features/auth/components/RedirectAuthenticatedFromAuthPages';
import { resolveGuestAuthGateLead } from '../../features/auth/utils/guestAuthGateCopy';
import { buildPortalLoginHref } from '../../features/auth/utils/requirePortalLogin';
import { getPortalReturnToFromSearch } from '../../features/auth/utils/portalReturnUrl';

function LoginRequiredContent() {
  const searchParams = useSearchParams();
  const returnTo = getPortalReturnToFromSearch(searchParams.toString());
  const loginHref = buildPortalLoginHref(returnTo);
  const registerHref =
    returnTo === '/'
      ? '/register'
      : `/register?returnTo=${encodeURIComponent(returnTo)}`;
  const leadCopy = resolveGuestAuthGateLead(returnTo);

  return (
    <main className="portal-shell portal-shell-narrow portal-shell-auth portal-login-required">
      <RedirectAuthenticatedFromAuthPages />
      <div className="portal-auth-card portal-login-required-card">
        <div className="portal-auth-brand portal-auth-card-brand portal-login-required-brand">
          <PortalAuthBrandLogo />
          <p className="portal-eyebrow">Fresh Prints Portal</p>
          <h1>Login required</h1>
        </div>

        <div className="portal-auth-card-copy portal-login-required-copy">
          <p className="portal-lead portal-login-required-lead">{leadCopy}</p>
        </div>

        <div className="portal-auth-card-actions portal-login-required-actions">
          <Link className="portal-button portal-button-primary" href={loginHref}>
            Login
          </Link>
          <Link className="portal-button portal-button-secondary" href={registerHref}>
            Signup
          </Link>
        </div>
      </div>
    </main>
  );
}

export default function LoginRequiredPage() {
  return (
    <Suspense
      fallback={
        <main className="portal-shell portal-shell-narrow portal-shell-auth">
          <p className="portal-muted">Loading…</p>
        </main>
      }
    >
      <LoginRequiredContent />
    </Suspense>
  );
}
