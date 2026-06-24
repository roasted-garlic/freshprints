import { useState, type FormEvent } from "react";

import { Eye, EyeOff } from "lucide-react";

import { Button } from "../../../shared/components/Button";
import { Checkbox } from "../../../shared/components/Checkbox";
import { TextInput } from "../../../shared/components/TextInput";
import { authPreferencesService } from "../services/authPreferencesService";
import { useAuth } from "../hooks/useAuth";

export function LoginForm() {
  const { error, isAuthActionLoading, login } = useAuth();
  const [email, setEmail] = useState(() => authPreferencesService.getStoredEmail());
  const [password, setPassword] = useState("");
  const [rememberMe, setRememberMe] = useState(() => authPreferencesService.getRememberMe());
  const [isPasswordVisible, setIsPasswordVisible] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    await login({ email, password, rememberMe });
  }

  return (
    <form className="login-form" onSubmit={handleSubmit}>
      <TextInput
        label="Email"
        name="email"
        type="email"
        value={email}
        onChange={(event) => setEmail(event.target.value)}
        autoComplete="email"
        required
      />

      <TextInput
        label="Password"
        name="password"
        type={isPasswordVisible ? "text" : "password"}
        value={password}
        onChange={(event) => setPassword(event.target.value)}
        autoComplete="current-password"
        required
        trailingControl={
          <button
            aria-label={isPasswordVisible ? "Hide password" : "Show password"}
            className="password-visibility-toggle"
            onClick={() => setIsPasswordVisible((currentValue) => !currentValue)}
            title={isPasswordVisible ? "Hide password" : "Show password"}
            type="button"
          >
            {isPasswordVisible ? (
              <EyeOff aria-hidden="true" size={18} strokeWidth={2.1} />
            ) : (
              <Eye aria-hidden="true" size={18} strokeWidth={2.1} />
            )}
          </button>
        }
      />

      <Checkbox
        checked={rememberMe}
        label="Remember me"
        name="rememberMe"
        onChange={(event) => setRememberMe(event.target.checked)}
      />

      {error ? (
        <p className="auth-message auth-message-error" role="alert">
          {error}
        </p>
      ) : null}

      <Button type="submit" disabled={isAuthActionLoading}>
        {isAuthActionLoading ? "Signing in..." : "Sign in"}
      </Button>
    </form>
  );
}
