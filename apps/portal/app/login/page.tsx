import type { Metadata } from 'next';

import { PortalLogo } from '../../features/brand/components/PortalLogo';
import { loadPortalGlobalSocialMeta } from '../../features/brand/portalGlobalSocialMetaService';
import { buildPortalPageMetadata } from '../../features/brand/portalSiteMeta';
import { LoginForm } from '../../features/auth/components/LoginForm';

export const revalidate = 3600;

export async function generateMetadata(): Promise<Metadata> {
  const social = await loadPortalGlobalSocialMeta();
  return buildPortalPageMetadata({
    title: 'Sign in',
    description: 'Sign in to Fresh Prints Request Portal to browse designs and manage print requests.',
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
    <main className="portal-shell portal-shell-narrow portal-shell-auth">
      <div className="portal-auth-brand">
        <PortalLogo
          alt="Fresh Prints Request Portal"
          className="portal-auth-logo"
          size={56}
        />
        <h1>Sign in</h1>
      </div>
      <LoginForm />
    </main>
  );
}
