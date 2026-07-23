import { httpsCallable } from "firebase/functions";

import {
  TOMBSTONE_CUSTOMER_CONFIRMATION_PHRASE,
  type PreviewCustomerAccountDeletionResponse,
  type TombstoneCustomerAccountResponse,
} from "@fresh-prints/shared/types/deletion/deletion.types";

import { functions } from "../../../config/firebase";

function getCallableErrorMessage(error: unknown, fallbackMessage: string): string {
  if (
    error &&
    typeof error === "object" &&
    "message" in error &&
    typeof error.message === "string" &&
    error.message.trim()
  ) {
    return error.message;
  }

  return fallbackMessage;
}

export const tombstoneCustomerAccountService = {
  confirmationPhrase: TOMBSTONE_CUSTOMER_CONFIRMATION_PHRASE,

  async preview(customerId: string): Promise<PreviewCustomerAccountDeletionResponse> {
    try {
      const callable = httpsCallable<{ customerId: string }, PreviewCustomerAccountDeletionResponse>(
        functions,
        "previewCustomerAccountDeletion",
      );
      const response = await callable({ customerId });
      return response.data;
    } catch (error) {
      throw new Error(
        getCallableErrorMessage(error, "Unable to preview customer deletion. Please try again."),
      );
    }
  },

  async tombstone(customerId: string, confirmationPhrase: string): Promise<TombstoneCustomerAccountResponse> {
    try {
      const callable = httpsCallable<
        { customerId: string; confirmationPhrase: string },
        TombstoneCustomerAccountResponse
      >(functions, "tombstoneCustomerAccount");
      const response = await callable({ customerId, confirmationPhrase });
      return response.data;
    } catch (error) {
      throw new Error(
        getCallableErrorMessage(error, "Unable to delete the customer account. Please try again."),
      );
    }
  },
};
