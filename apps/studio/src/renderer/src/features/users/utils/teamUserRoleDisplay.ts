import type { BadgeVariant } from "../../../shared/components/Badge";
import type { UserRole } from "../types/user.types";

export function getTeamUserRoleBadgeVariant(role: UserRole): BadgeVariant {
  if (role === "owner") {
    return "info";
  }

  if (role === "admin") {
    return "success";
  }

  return "default";
}

export function formatTeamUserRoleLabel(role: UserRole): string {
  if (role === "owner") {
    return "Owner";
  }

  if (role === "admin") {
    return "Admin";
  }

  if (role === "helper") {
    return "Helper";
  }

  return role.charAt(0).toUpperCase() + role.slice(1);
}
