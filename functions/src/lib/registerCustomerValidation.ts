import { validateCustomerUsername } from "../../../packages/shared/src/utils/customerUsername";
import type { RegisterCustomerRequest } from "../../../packages/shared/src/types/auth/registerCustomer.types";

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function normalizeRegisterCustomerEmail(email: string): string {
  return email.trim().toLowerCase();
}

export function normalizeRegisterCustomerDisplayName(displayName: string): string {
  return displayName.trim();
}

export function validateRegisterCustomerRequest(
  data: unknown,
  authEmail: string | undefined,
): RegisterCustomerRequest & { email: string } {
  if (!data || typeof data !== "object") {
    throw new Error("Request data is required.");
  }

  const payload = data as RegisterCustomerRequest;
  const displayName = typeof payload.displayName === "string" ? normalizeRegisterCustomerDisplayName(payload.displayName) : "";
  const usernameResult = validateCustomerUsername(
    typeof payload.username === "string" ? payload.username : "",
  );

  if (!displayName || displayName.length < 2) {
    throw new Error("Display name must be at least 2 characters.");
  }

  if (displayName.length > 80) {
    throw new Error("Display name must be 80 characters or fewer.");
  }

  if (!usernameResult.isValid) {
    throw new Error(usernameResult.error ?? "Enter a valid customer username.");
  }

  const email = typeof authEmail === "string" ? normalizeRegisterCustomerEmail(authEmail) : "";

  if (!email || !emailPattern.test(email)) {
    throw new Error("A verified email address is required.");
  }

  return {
    displayName,
    username: usernameResult.username,
    email,
  };
}
