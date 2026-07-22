import type { Metadata } from 'next';
import Link from 'next/link';

import { PortalAuthBrandLogo } from '../../features/brand/components/PortalAuthBrandLogo';
import { loadPortalGlobalSocialMeta } from '../../features/brand/portalGlobalSocialMetaService';
import { buildPortalPageMetadata } from '../../features/brand/portalSiteMeta';
import { RegisterForm } from '../../features/auth/components/RegisterForm';
import { CATALOG_HOME_PATH } from '../../features/print-requests/utils/catalogSelectionNavigation';

export const revalidate = 3600;

export async function generateMetadata(): Promise<Metadata> {
  const social = await loadPortalGlobalSocialMeta();
  return buildPortalPageMetadata({
    title: 'Signup',
    description:
      'Signup for a Fresh Prints Request Portal account to browse the design library and submit print requests.',
    path: '/register',
    social: {
      ogTitle: social.ogTitle,
      ogDescription: social.ogDescription,
      ogImageUrl: social.imageUrl,
    },
  });
}

export default function RegisterPage() {
  return (
    <main className="portal-shell portal-shell-narrow portal-shell-auth portal-login-required">
      <div className="portal-auth-card portal-login-required-card">
        <div className="portal-auth-brand portal-auth-card-brand portal-login-required-brand">
          <PortalAuthBrandLogo />
          <p className="portal-eyebrow">Fresh Prints Portal</p>
          <h1>Signup</h1>
        </div>
        <div className="portal-auth-card-body">
          <RegisterForm />
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
