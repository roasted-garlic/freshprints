import type { Metadata } from 'next';
import Link from 'next/link';

import { PortalAuthBrandLogo } from '../../features/brand/components/PortalAuthBrandLogo';
import { loadPortalGlobalSocialMeta } from '../../features/brand/portalGlobalSocialMetaService';
import { buildPortalPageMetadata } from '../../features/brand/portalSiteMeta';
import { LoginForm } from '../../features/auth/components/LoginForm';
import { RedirectAuthenticatedFromAuthPages } from '../../features/auth/components/RedirectAuthenticatedFromAuthPages';
import { CATALOG_HOME_PATH } from '../../features/print-requests/utils/catalogSelectionNavigation';

export const revalidate = 3600;

export async function generateMetadata(): Promise<Metadata> {
  const social = await loadPortalGlobalSocialMeta();
  return buildPortalPageMetadata({
    title: 'Login',
    description: 'Login to Fresh Prints Request Portal to browse designs and manage print requests.',
    path: '/login',
    social: {
      ogTitle: social.ogTitle,
      ogDescription: social.ogDescription,
      ogImageUrl: social.imageUrl,
    },
  });
}

export default function LoginPage() {
  return (
    <main className="portal-shell portal-shell-narrow portal-shell-auth portal-login-required">
      <RedirectAuthenticatedFromAuthPages />
      <div className="portal-auth-card portal-login-required-card">
        <div className="portal-auth-brand portal-auth-card-brand portal-login-required-brand">
          <PortalAuthBrandLogo />
          <p className="portal-eyebrow">Fresh Prints Portal</p>
          <h1>Login</h1>
        </div>
        <div className="portal-auth-card-body">
          <LoginForm />
        </div>
        <div className="portal-auth-card-actions portal-login-required-actions">
          <Link className="portal-button portal-button-secondary" href={CATALOG_HOME_PATH}>
            Browse designs
          </Link>
        </div>
      </div>
    </main>
  );
}
