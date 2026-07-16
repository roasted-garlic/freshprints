import { FieldValue } from "firebase-admin/firestore";

import { adminAuth, adminDb } from "./admin";
import type { TeamUserProfile, TeamUserRole } from "./types";

interface ApplyTeamUserUpdatesInput {
  caller: TeamUserProfile;
  target: TeamUserProfile;
  isActive: boolean;
  role?: TeamUserRole;
}

export async function applyTeamUserUpdates(
  input: ApplyTeamUserUpdatesInput,
): Promise<TeamUserProfile> {
  const previousDisabled = !input.target.isActive;
  const nextDisabled = !input.isActive;

  if (previousDisabled !== nextDisabled) {
    await adminAuth.updateUser(input.target.id, { disabled: nextDisabled });
  }

  const updatePayload: Record<string, unknown> = {
    isActive: input.isActive,
    updatedAt: FieldValue.serverTimestamp(),
    updatedBy: input.caller.id,
  };

  if (input.role) {
    updatePayload.role = input.role;
  }

  try {
    await adminDb.collection("users").doc(input.target.id).update(updatePayload);
  } catch (error) {
    if (previousDisabled !== nextDisabled) {
      await adminAuth.updateUser(input.target.id, { disabled: previousDisabled }).catch(() => undefined);
    }

    throw error;
  }

  return {
    ...input.target,
    isActive: input.isActive,
    role: input.role ?? input.target.role,
  };
}
