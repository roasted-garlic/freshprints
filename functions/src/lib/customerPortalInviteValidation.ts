import { validateCustomerUsername } from "../../../packages/shared/src/utils/customerUsername";
import type { CreateCustomerWithPortalInviteRequest } from "../../../packages/shared/src/types/customer/createCustomerWithPortalInvite.types";

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function normalizeInviteEmail(email: string): string {
  return email.trim().toLowerCase();
}

export function normalizeInviteDisplayName(displayName: string): string {
  return displayName.trim();
}

export function validateCreateCustomerWithPortalInviteRequest(
  data: unknown,
): CreateCustomerWithPortalInviteRequest {
  if (!data || typeof data !== "object") {
    throw new Error("Request data is required.");
  }

  const payload = data as CreateCustomerWithPortalInviteRequest;
  const displayName =
    typeof payload.displayName === "string" ? normalizeInviteDisplayName(payload.displayName) : "";
  const email = typeof payload.email === "string" ? normalizeInviteEmail(payload.email) : "";
  const usernameResult = validateCustomerUsername(
    typeof payload.username === "string" ? payload.username : "",
  );
  const notes = typeof payload.notes === "string" ? payload.notes.trim() : "";

  if (!displayName || displayName.length < 2) {
    throw new Error("Display name must be at least 2 characters.");
  }

  if (displayName.length > 80) {
    throw new Error("Display name must be 80 characters or fewer.");
  }

  if (!email || !emailPattern.test(email)) {
    throw new Error("Enter a valid email address.");
  }

  if (!usernameResult.isValid) {
    throw new Error(usernameResult.error ?? "Enter a valid customer username.");
  }

  if (notes.length > 2000) {
    throw new Error("Notes must be 2000 characters or fewer.");
  }

  return {
    displayName,
    email,
    username: usernameResult.username,
    notes: notes || undefined,
  };
}
