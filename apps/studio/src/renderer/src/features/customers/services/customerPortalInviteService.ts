import type {
  CreateCustomerWithPortalInviteRequest,
  CreateCustomerWithPortalInviteResponse,
} from "@fresh-prints/shared/types/customer/createCustomerWithPortalInvite.types";
import { FirebaseError } from "firebase/app";

import { callTracedFunction } from "../../../config/tracedCallable";

function getCallableErrorMessage(error: unknown, fallbackMessage: string): string {
  if (!(error instanceof FirebaseError)) {
    return fallbackMessage;
  }

  const message = error.message?.trim() ?? "";

  switch (error.code) {
    case "functions/unauthenticated":
      return "You must be signed in to create customers.";
    case "functions/permission-denied":
      return message || "You do not have permission to create customers.";
    case "functions/invalid-argument":
      return message || "Check the customer details and try again.";
    case "functions/already-exists":
      return message || "That email or username is already in use.";
    case "functions/unavailable":
      return "Customer invitations are unavailable right now. Confirm Cloud Functions are deployed.";
    default:
      return message || fallbackMessage;
  }
}

export const customerPortalInviteService = {
  async createCustomerWithPortalInvite(
    input: CreateCustomerWithPortalInviteRequest,
  ): Promise<CreateCustomerWithPortalInviteResponse> {
    try {
      return await callTracedFunction<
        CreateCustomerWithPortalInviteRequest,
        CreateCustomerWithPortalInviteResponse
      >("createCustomerWithPortalInvite", {
        source: "customerPortalInviteService.createCustomerWithPortalInvite",
      })(input);
    } catch (error) {
      throw new Error(
        getCallableErrorMessage(error, "Unable to create the customer. Please try again."),
      );
    }
  },
};
