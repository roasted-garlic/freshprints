import { PORTAL_APP_NAME } from '../../features/brand/portalBrand';
import { LoginForm } from '../../features/auth/components/LoginForm';

export default function LoginPage() {
  return (
    <main className="portal-shell portal-shell-narrow">
      <p className="portal-eyebrow">{PORTAL_APP_NAME}</p>
      <h1>Sign in</h1>
      <p className="portal-lead">Browse the catalog and manage your print requests.</p>
      <LoginForm />
    </main>
  );
}
