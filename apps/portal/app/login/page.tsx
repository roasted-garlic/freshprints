import type { Metadata } from 'next';

import { PortalAuthBrandLogo } from '../../features/brand/components/PortalAuthBrandLogo';
import { loadPortalGlobalSocialMeta } from '../../features/brand/portalGlobalSocialMetaService';
import { buildPortalPageMetadata } from '../../features/brand/portalSiteMeta';
import { LoginForm } from '../../features/auth/components/LoginForm';
import {
  PortalLoginBrowseDesignsAction,
  PortalLoginMaintenanceBanner,
} from '../../features/auth/components/PortalLoginMaintenanceNotice';
import { RedirectAuthenticatedFromAuthPages } from '../../features/auth/components/RedirectAuthenticatedFromAuthPages';

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
        <PortalLoginMaintenanceBanner />
        <div className="portal-auth-card-body">
          <LoginForm />
        </div>
        <PortalLoginBrowseDesignsAction />
      </div>
    </main>
  );
}
