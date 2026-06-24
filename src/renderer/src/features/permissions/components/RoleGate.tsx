import type { ReactNode } from "react";

import { ErrorState } from "../../../shared/components/ErrorState";
import { useAuth } from "../../auth/hooks/useAuth";
import { permissionService } from "../services/permissionService";
import type { PermissionContext, PermissionKey } from "../types/permission.types";

interface RoleGateProps {
  permission: PermissionKey | PermissionKey[];
  children: ReactNode;
  fallback?: ReactNode;
  context?: PermissionContext;
  showUnauthorized?: boolean;
}

export function RoleGate({
  permission,
  children,
  context,
  fallback,
  showUnauthorized = false,
}: RoleGateProps) {
  const { user } = useAuth();
  const permissions = Array.isArray(permission) ? permission : [permission];

  if (!permissionService.hasAnyPermission(user, permissions, context)) {
    if (fallback) {
      return <>{fallback}</>;
    }

    if (showUnauthorized) {
      return (
        <ErrorState
          eyebrow="Unauthorized"
          title="You do not have access"
          message="Your role does not include permission to view this area."
        />
      );
    }

    return <>{fallback}</>;
  }

  return <>{children}</>;
}
