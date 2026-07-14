import { PortalLogo } from '../../features/brand/components/PortalLogo';
import { CompleteProfileForm } from '../../features/auth/components/CompleteProfileForm';

export default function CompleteProfilePage() {
  return (
    <main className="portal-shell portal-shell-narrow portal-shell-auth">
      <div className="portal-auth-brand">
        <PortalLogo
          alt="Fresh Prints Request Portal"
          className="portal-auth-logo"
          size={56}
        />
        <h1>Finish your account</h1>
        <p className="portal-lead portal-auth-brand-lead">Choose a username to finish setup.</p>
      </div>
      <CompleteProfileForm />
    </main>
  );
}
