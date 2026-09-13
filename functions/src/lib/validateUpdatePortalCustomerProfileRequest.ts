import {
  normalizeCustomerDisplayName,
} from "./customerUpdateValidation";
import { validateCustomerUsername } from "../../../packages/shared/src/utils/customerUsername";
import type { UpdatePortalCustomerProfileRequest } from "../../../packages/shared/src/types/customer/updatePortalCustomerProfile.types";

export function validateUpdatePortalCustomerProfileRequest(
  data: unknown,
): UpdatePortalCustomerProfileRequest {
  if (!data || typeof data !== "object") {
    throw new Error("Request data is required.");
  }

  const payload = data as UpdatePortalCustomerProfileRequest;
  const displayName =
    typeof payload.displayName === "string" ? normalizeCustomerDisplayName(payload.displayName) : "";
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

  return {
    displayName,
    username: usernameResult.username,
  };
}
