import type { ReactNode } from "react";

import { ErrorState } from "../../../shared/components/ErrorState";
import { permissionService } from "../../permissions/services/permissionService";
import type { PermissionContext, PermissionKey } from "../../permissions/types/permission.types";
import { useAuth } from "../hooks/useAuth";

interface ProtectedRouteProps {
  children: ReactNode;
  permission?: PermissionKey;
  permissionContext?: PermissionContext;
}

export function ProtectedRoute({ children, permission, permissionContext }: ProtectedRouteProps) {
  const { user } = useAuth();

  if (permission && !permissionService.hasPermission(user, permission, permissionContext)) {
    return (
      <main className="page-layout">
        <ErrorState
          eyebrow="Unauthorized"
          title="You do not have access"
          message="Your role does not include permission to view this page."
        />
      </main>
    );
  }

  return <>{children}</>;
}
