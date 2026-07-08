import type { ReactNode } from "react";
import { Navigate } from "react-router-dom";

import { useAuth } from "../hooks/useAuth";

interface AuthenticatedRouteGateProps {
  children: ReactNode;
}

/**
 * Same authentication redirect as `AuthenticatedLayout`, without the shared `AppShell`
 * (sidebar/header) chrome. Use for routes that need a distraction-free, full-screen layout.
 */
export function AuthenticatedRouteGate({ children }: AuthenticatedRouteGateProps) {
  const { isAuthenticated } = useAuth();

  if (!isAuthenticated) {
    return <Navigate replace to="/login" />;
  }

  return <>{children}</>;
}
