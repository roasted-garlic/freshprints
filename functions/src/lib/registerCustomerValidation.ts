import { validateCustomerUsername } from "../../../packages/shared/src/utils/customerUsername";
import { PORTAL_BIDDING_ACKNOWLEDGMENT_VERSION } from "../../../packages/shared/src/constants/portal/portalBiddingAcknowledgment.constants";
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

  if (payload.biddingAcknowledgmentAccepted !== true) {
    throw new Error("Confirm that you understand show designs are available for public bidding.");
  }

  if (
    typeof payload.biddingAcknowledgmentVersion !== "string" ||
    payload.biddingAcknowledgmentVersion.trim() !== PORTAL_BIDDING_ACKNOWLEDGMENT_VERSION
  ) {
    throw new Error("Bidding acknowledgment is out of date. Refresh the page and try again.");
  }

  return {
    displayName,
    username: usernameResult.username,
    email,
    biddingAcknowledgmentAccepted: true,
    biddingAcknowledgmentVersion: PORTAL_BIDDING_ACKNOWLEDGMENT_VERSION,
  };
}
