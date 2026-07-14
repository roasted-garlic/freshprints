import { PortalLogo } from '../../features/brand/components/PortalLogo';
import { LoginForm } from '../../features/auth/components/LoginForm';

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
