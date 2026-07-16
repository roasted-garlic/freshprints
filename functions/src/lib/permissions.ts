import type { TeamUserProfile, TeamUserRole } from "./types";
import { assertStaffCaller } from "./caller";
import { permissionDenied } from "./errors";

export function assertCanManageCustomers(caller: TeamUserProfile): void {
  assertStaffCaller(caller);

  if (caller.role !== "owner" && caller.role !== "admin") {
    throw permissionDenied("Only owners and admins can manage customers.");
  }
}

export function assertTeamUserRole(role: unknown): asserts role is TeamUserRole {
  if (role !== "owner" && role !== "admin" && role !== "helper") {
    throw permissionDenied("Role must be owner, admin, or helper.");
  }
}

export function assertCanCreateTeamRole(callerRole: TeamUserRole, targetRole: TeamUserRole): void {
  if (callerRole === "owner") {
    return;
  }

  if (callerRole === "admin" && (targetRole === "admin" || targetRole === "helper")) {
    return;
  }

  throw permissionDenied("You do not have permission to create this role.");
}

export function assertCanEditTeamUser(
  caller: TeamUserProfile,
  target: TeamUserProfile,
  changes: { roleChanged: boolean; statusChanged: boolean; nextRole?: TeamUserRole },
): void {
  if (caller.role === "owner") {
    return;
  }

  if (caller.role === "admin") {
    if (target.role === "owner") {
      throw permissionDenied("Admins cannot edit owner accounts.");
    }

    if (changes.roleChanged && changes.nextRole === "owner") {
      throw permissionDenied("Admins cannot promote users to owner.");
    }

    return;
  }

  throw permissionDenied("You do not have permission to edit team users.");
}
