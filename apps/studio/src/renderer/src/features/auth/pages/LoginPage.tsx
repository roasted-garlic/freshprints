import { AppLogo } from "../../../shared/components/AppLogo";
import { useStudioBrandLogoSettings } from "../../settings/hooks/useStudioBrandLogoSettings";
import { ThemeToggle } from "../../theme/components/ThemeToggle";
import { LoginForm } from "../components/LoginForm";

export function LoginPage() {
  const brandLogoSettings = useStudioBrandLogoSettings();

  return (
    <main className="login-page">
      <section className="login-panel" aria-labelledby="login-title">
        <div className="login-toolbar">
          <ThemeToggle />
        </div>
        <div className="login-header">
          <AppLogo
            alt="Fresh Prints Studio"
            className="login-logo"
            heightPx={brandLogoSettings.studioLogin.heightPx}
            size="lg"
            widthPx={brandLogoSettings.studioLogin.widthPx}
          />
          <p className="eyebrow">Fresh Prints Studio</p>
          <h1 id="login-title">Sign in</h1>
        </div>

        <LoginForm />
      </section>
    </main>
  );
}
