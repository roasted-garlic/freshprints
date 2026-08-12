import type { TeamUserProfile } from "./types";
import { permissionDenied } from "./errors";

/** Staff who can view intake and exclude/restore catalog eligibility. */
export function assertCanManageCustomerUploadIntake(caller: TeamUserProfile): void {
  if (!caller.isActive || !["owner", "admin", "helper"].includes(caller.role)) {
    throw permissionDenied("Only active staff can manage customer upload intake.");
  }
}

/** Active staff (owner/admin/helper) — promote to AI Review and retry technical processing. */
export function assertCanPromoteOrRetryCustomerUpload(caller: TeamUserProfile): void {
  if (!caller.isActive || !["owner", "admin", "helper"].includes(caller.role)) {
    throw permissionDenied("Only active staff can promote or retry customer uploads.");
  }
}

/** Permanent upload cleanup is restricted to active owners and admins. */
export function assertCanDeleteCustomerUpload(caller: TeamUserProfile): void {
  if (!caller.isActive || !["owner", "admin"].includes(caller.role)) {
    throw permissionDenied("You do not have permission to delete uploads.");
  }
}

export function parseUploadId(data: unknown): string {
  if (!data || typeof data !== "object") {
    throw new Error("Request data is required.");
  }

  const uploadId =
    "uploadId" in data && typeof data.uploadId === "string" ? data.uploadId.trim() : "";

  if (!uploadId) {
    throw new Error("An upload ID is required.");
  }

  return uploadId;
}
