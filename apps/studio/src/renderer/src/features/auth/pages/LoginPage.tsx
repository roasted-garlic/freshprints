import { AppLogo } from "../../../shared/components/AppLogo";
import { ThemeToggle } from "../../theme/components/ThemeToggle";
import { LoginForm } from "../components/LoginForm";

export function LoginPage() {
  return (
    <main className="login-page">
      <section className="login-panel" aria-labelledby="login-title">
        <div className="login-toolbar">
          <ThemeToggle />
        </div>
        <div className="login-header">
          <AppLogo alt="Fresh Prints Studio" className="login-logo" size="lg" />
          <p className="eyebrow">Fresh Prints Studio</p>
          <h1 id="login-title">Sign in</h1>
        </div>

        <LoginForm />
      </section>
    </main>
  );
}
