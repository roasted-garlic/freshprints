import type { Metadata } from 'next';

import { PortalLogo } from '../../features/brand/components/PortalLogo';
import { loadPortalGlobalSocialMeta } from '../../features/brand/portalGlobalSocialMetaService';
import { buildPortalPageMetadata } from '../../features/brand/portalSiteMeta';
import { RegisterForm } from '../../features/auth/components/RegisterForm';

export const revalidate = 3600;

export async function generateMetadata(): Promise<Metadata> {
  const social = await loadPortalGlobalSocialMeta();
  return buildPortalPageMetadata({
    title: 'Create account',
    description:
      'Create a Fresh Prints Request Portal account to browse the design library and submit print requests.',
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
    <main className="portal-shell portal-shell-narrow portal-shell-auth">
      <div className="portal-auth-brand">
        <PortalLogo
          alt="Fresh Prints Request Portal"
          className="portal-auth-logo"
          size={56}
        />
        <h1>Create account</h1>
      </div>
      <RegisterForm />
    </main>
  );
}
