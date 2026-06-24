import { Navigate, Outlet } from "react-router-dom";

import { useAuth } from "../features/auth/hooks/useAuth";
import { AppShell } from "../shared/components/AppShell";

export function AuthenticatedLayout() {
  const { isAuthenticated } = useAuth();

  if (!isAuthenticated) {
    return <Navigate replace to="/login" />;
  }

  return (
    <AppShell>
      <Outlet />
    </AppShell>
  );
}
