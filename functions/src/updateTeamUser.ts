import { onCall } from "firebase-functions/v2/https";

import { loadCallerProfile, loadTargetUserProfile } from "./lib/caller";
import { invalidArgument, permissionDenied, unauthenticated } from "./lib/errors";
import {
  assertCanEditTeamUser,
  assertTeamUserRole,
} from "./lib/permissions";
import { mapServiceError } from "./lib/serviceErrorMapper";
import { applyTeamUserUpdates } from "./lib/teamUserUpdateService";
import type { TeamUserRole, UpdateTeamUserRequest, UpdateTeamUserResponse } from "./lib/types";

function validateRequest(data: UpdateTeamUserRequest): UpdateTeamUserRequest {
  if (!data || typeof data !== "object") {
    throw invalidArgument("Request data is required.");
  }

  const targetUserId = typeof data.targetUserId === "string" ? data.targetUserId.trim() : "";

  if (!targetUserId) {
    throw invalidArgument("A target user ID is required.");
  }

  if (typeof data.isActive !== "boolean") {
    throw invalidArgument("isActive must be true or false.");
  }

  if (data.role !== undefined && data.role !== null) {
    assertTeamUserRole(data.role);
  } else if (data.role === null) {
    throw invalidArgument("Role must be admin or helper.");
  }

  return {
    targetUserId,
    isActive: data.isActive,
    role: data.role === null ? undefined : data.role,
  };
}

export const updateTeamUser = onCall(async (request): Promise<UpdateTeamUserResponse> => {
  try {
    if (!request.auth?.uid) {
      throw unauthenticated("You must be signed in to update users.");
    }

    const caller = await loadCallerProfile(request.auth.uid);

    if (!caller.isActive) {
      throw permissionDenied("Inactive accounts cannot update users.");
    }

    const payload = validateRequest(request.data as UpdateTeamUserRequest);
    const target = await loadTargetUserProfile(payload.targetUserId);
    const statusChanged = target.isActive !== payload.isActive;
    const roleChanged = payload.role !== undefined && payload.role !== target.role;

    if (!statusChanged && !roleChanged) {
      return {
        userId: target.id,
        displayName: target.displayName,
        role: target.role,
        isActive: target.isActive,
        authDisabled: !target.isActive,
      };
    }

    assertCanEditTeamUser(caller, target, {
      roleChanged,
      statusChanged,
      nextRole: roleChanged ? (payload.role as TeamUserRole) : undefined,
    });

    const updatedTarget = await applyTeamUserUpdates({
      caller,
      target,
      isActive: payload.isActive,
      role: roleChanged ? payload.role : undefined,
    });

    return {
      userId: updatedTarget.id,
      displayName: updatedTarget.displayName,
      role: updatedTarget.role,
      isActive: updatedTarget.isActive,
      authDisabled: !updatedTarget.isActive,
    };
  } catch (error) {
    throw mapServiceError(error, "Unable to update the user right now.");
  }
});
