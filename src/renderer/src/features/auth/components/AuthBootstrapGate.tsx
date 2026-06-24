import type { ReactNode } from "react";

import { Button } from "../../../shared/components/Button";
import { LoadingSpinner } from "../../../shared/components/LoadingSpinner";
import { useAuth } from "../hooks/useAuth";
import { shouldShowBootstrapScreen } from "../types/auth.types";

interface AuthBootstrapGateProps {
  children: ReactNode;
}

function getBootstrapErrorContent(bootstrapStatus: "missing-profile" | "inactive" | "error", error: string | null) {
  if (bootstrapStatus === "inactive") {
    return {
      title: "Account inactive",
      message: error ?? "This account is inactive. Contact an administrator.",
    };
  }

  if (bootstrapStatus === "missing-profile") {
    return {
      title: "Profile not found",
      message: error ?? "No Fresh Prints user profile exists for this account.",
    };
  }

  return {
    title: "Unable to verify access",
    message: error ?? "Fresh Prints could not load your user profile.",
  };
}

export function AuthBootstrapGate({ children }: AuthBootstrapGateProps) {
  const { bootstrapStatus, error, isInitialBootstrap, logout } = useAuth();

  if (!shouldShowBootstrapScreen(bootstrapStatus, isInitialBootstrap)) {
    return <>{children}</>;
  }

  if (bootstrapStatus === "missing-profile" || bootstrapStatus === "inactive" || bootstrapStatus === "error") {
    const errorContent = getBootstrapErrorContent(bootstrapStatus, error);

    return (
      <main className="status-page">
        <section className="status-panel" role="alert">
          <p className="eyebrow">Access unavailable</p>
          <h1>{errorContent.title}</h1>
          <p>{errorContent.message}</p>
          <Button className="status-action" variant="secondary" onClick={logout}>
            Sign out
          </Button>
        </section>
      </main>
    );
  }

  return (
    <main className="status-page" aria-live="polite">
      <section className="status-panel">
        <p className="eyebrow">Loading</p>
        <h1>Checking your session</h1>
        <p>Fresh Prints is verifying your account access.</p>
        <LoadingSpinner label="Checking session" />
      </section>
    </main>
  );
}
