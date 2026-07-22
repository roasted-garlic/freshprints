import { PortalAuthBrandLogo } from '../../features/brand/components/PortalAuthBrandLogo';
import { CompleteProfileForm } from '../../features/auth/components/CompleteProfileForm';

export default function CompleteProfilePage() {
  return (
    <main className="portal-shell portal-shell-narrow portal-shell-auth">
      <div className="portal-auth-brand">
        <PortalAuthBrandLogo />
        <h1>Finish your account</h1>
        <p className="portal-lead portal-auth-brand-lead">Choose a username to finish setup.</p>
      </div>
      <CompleteProfileForm />
    </main>
  );
}
