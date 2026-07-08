import { PORTAL_APP_NAME } from '../../features/brand/portalBrand';
import { RegisterForm } from '../../features/auth/components/RegisterForm';

export default function RegisterPage() {
  return (
    <main className="portal-shell portal-shell-narrow">
      <p className="portal-eyebrow">{PORTAL_APP_NAME}</p>
      <h1>Create account</h1>
      <p className="portal-lead">Register to request prints from the Fresh Prints catalog.</p>
      <RegisterForm />
    </main>
  );
}
