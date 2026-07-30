import type {
  UpdateCustomerRequest,
  UpdateCustomerResponse,
} from "@fresh-prints/shared/types/customer/updateCustomer.types";
import { FirebaseError } from "firebase/app";

import { callTracedFunction } from "../../../config/tracedCallable";

function getCallableErrorMessage(error: unknown, fallbackMessage: string): string {
  if (!(error instanceof FirebaseError)) {
    return fallbackMessage;
  }

  const message = error.message?.trim() ?? "";

  switch (error.code) {
    case "functions/unauthenticated":
      return "You must be signed in to update customers.";
    case "functions/permission-denied":
      return message || "You do not have permission to update customers.";
    case "functions/invalid-argument":
      return message || "Check the customer details and try again.";
    case "functions/already-exists":
      return message || "That email or username is already in use.";
    case "functions/unavailable":
      return "Customer updates are unavailable right now. Confirm Cloud Functions are deployed.";
    default:
      return message || fallbackMessage;
  }
}

export const customerUpdateService = {
  async updateCustomer(input: UpdateCustomerRequest): Promise<UpdateCustomerResponse> {
    try {
      return await callTracedFunction<UpdateCustomerRequest, UpdateCustomerResponse>(
        "updateCustomer",
        { source: "customerUpdateService.updateCustomer" },
      )(input);
    } catch (error) {
      throw new Error(getCallableErrorMessage(error, "Unable to update the customer. Please try again."));
    }
  },
};
