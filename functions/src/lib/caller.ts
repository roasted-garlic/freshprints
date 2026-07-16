import { adminDb } from "./admin";
import type { TeamUserProfile, TeamUserRole } from "./types";
import { invalidArgument } from "./errors";

export async function loadCallerProfile(uid: string): Promise<TeamUserProfile> {
  const snapshot = await adminDb.collection("users").doc(uid).get();

  if (!snapshot.exists) {
    throw invalidArgument("Your user profile could not be found.");
  }

  const data = snapshot.data();

  if (!data || typeof data.role !== "string" || typeof data.isActive !== "boolean") {
    throw invalidArgument("Your user profile is incomplete.");
  }

  return {
    id: uid,
    email: typeof data.email === "string" ? data.email : "",
    displayName: typeof data.displayName === "string" ? data.displayName : "User",
    role: data.role as TeamUserRole,
    isActive: data.isActive,
  };
}

export async function loadTargetUserProfile(userId: string): Promise<TeamUserProfile> {
  const snapshot = await adminDb.collection("users").doc(userId).get();

  if (!snapshot.exists) {
    throw invalidArgument("The target user could not be found.");
  }

  const data = snapshot.data();

  if (!data || typeof data.role !== "string" || typeof data.isActive !== "boolean") {
    throw invalidArgument("The target user profile is incomplete.");
  }

  return {
    id: userId,
    email: typeof data.email === "string" ? data.email : "",
    displayName: typeof data.displayName === "string" ? data.displayName : "User",
    role: data.role as TeamUserRole,
    isActive: data.isActive,
  };
}

export function assertStaffCaller(caller: TeamUserProfile): void {
  if (!caller.isActive) {
    throw invalidArgument("Inactive accounts cannot perform this action.");
  }

  if (!["owner", "admin", "helper"].includes(caller.role)) {
    throw invalidArgument("Only staff accounts can perform this action.");
  }
}
