'use client';

import Link from 'next/link';
import { usePathname, useSearchParams } from 'next/navigation';
import { Suspense } from 'react';

import { PortalAuthBrandLogo } from '../../brand/components/PortalAuthBrandLogo';
import { resolveGuestAuthGateLead } from '../utils/guestAuthGateCopy';
import { buildPortalLoginHref } from '../utils/requirePortalLogin';
import { getSafePortalReturnTo } from '../utils/portalReturnUrl';

function GuestAuthGateOverlayContent() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const query = searchParams.toString();
  const rawReturnTo = query ? `${pathname}?${query}` : pathname || '/';
  const returnTo = getSafePortalReturnTo(rawReturnTo);
  const loginHref = buildPortalLoginHref(returnTo);
  const registerHref =
    returnTo === '/'
      ? '/register'
      : `/register?returnTo=${encodeURIComponent(returnTo)}`;
  const leadCopy = resolveGuestAuthGateLead(pathname);

  return (
    <div
      aria-describedby="portal-guest-auth-copy"
      aria-labelledby="portal-guest-auth-title"
      aria-modal="true"
      className="portal-guest-auth-overlay"
      role="dialog"
    >
      <div className="portal-auth-card portal-login-required-card">
        <div className="portal-auth-brand portal-auth-card-brand portal-login-required-brand">
          <PortalAuthBrandLogo />
          <p className="portal-eyebrow">Fresh Prints Portal</p>
          <h2 id="portal-guest-auth-title">Login required</h2>
        </div>

        <div className="portal-auth-card-copy portal-login-required-copy" id="portal-guest-auth-copy">
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
    </div>
  );
}

/**
 * Dimmed overlay over shell main content for guests on gated routes.
 * Sidebar / bottom nav stay interactive; CTAs go to login / register.
 */
export function GuestAuthGateOverlay() {
  return (
    <Suspense fallback={null}>
      <GuestAuthGateOverlayContent />
    </Suspense>
  );
}
