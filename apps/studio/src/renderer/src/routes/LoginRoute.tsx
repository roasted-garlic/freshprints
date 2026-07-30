import { Navigate } from "react-router-dom";

import { useAuth } from "../features/auth/hooks/useAuth";
import { LoginPage } from "../features/auth/pages/LoginPage";

export function LoginRoute() {
  const { bootstrapStatus, isAuthenticated } = useAuth();

  if (bootstrapStatus === "ready" && isAuthenticated) {
    return <Navigate replace to="/inbox" />;
  }

  return <LoginPage />;
}
