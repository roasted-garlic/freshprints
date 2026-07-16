import { validateCustomerUsername } from "../../../packages/shared/src/utils/customerUsername";
import type { UpdateCustomerRequest } from "../../../packages/shared/src/types/customer/updateCustomer.types";

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function normalizeCustomerEmail(email: string): string {
  return email.trim().toLowerCase();
}

export function normalizeCustomerDisplayName(displayName: string): string {
  return displayName.trim();
}

export function validateUpdateCustomerRequest(data: unknown): UpdateCustomerRequest {
  if (!data || typeof data !== "object") {
    throw new Error("Request data is required.");
  }

  const payload = data as UpdateCustomerRequest;
  const customerId = typeof payload.customerId === "string" ? payload.customerId.trim() : "";
  const displayName =
    typeof payload.displayName === "string" ? normalizeCustomerDisplayName(payload.displayName) : "";
  const email = typeof payload.email === "string" ? normalizeCustomerEmail(payload.email) : "";
  const usernameResult = validateCustomerUsername(
    typeof payload.username === "string" ? payload.username : "",
  );
  const notes = typeof payload.notes === "string" ? payload.notes.trim() : "";

  if (!customerId) {
    throw new Error("A customer ID is required.");
  }

  if (!displayName || displayName.length < 2) {
    throw new Error("Display name must be at least 2 characters.");
  }

  if (displayName.length > 80) {
    throw new Error("Display name must be 80 characters or fewer.");
  }

  if (!usernameResult.isValid) {
    throw new Error(usernameResult.error ?? "Enter a valid customer username.");
  }

  if (email && !emailPattern.test(email)) {
    throw new Error("Enter a valid email address.");
  }

  if (notes.length > 2000) {
    throw new Error("Notes must be 2000 characters or fewer.");
  }

  return {
    customerId,
    displayName,
    username: usernameResult.username,
    email: email || undefined,
    notes: notes || undefined,
  };
}
