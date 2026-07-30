import {
  TOMBSTONE_CUSTOMER_CONFIRMATION_PHRASE,
  type PreviewCustomerAccountDeletionResponse,
  type TombstoneCustomerAccountResponse,
} from "@fresh-prints/shared/types/deletion/deletion.types";

import { callTracedFunction } from "../../../config/tracedCallable";

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
      return await callTracedFunction<{ customerId: string }, PreviewCustomerAccountDeletionResponse>(
        "previewCustomerAccountDeletion",
        { source: "tombstoneCustomerAccountService.preview" },
      )({ customerId });
    } catch (error) {
      throw new Error(
        getCallableErrorMessage(error, "Unable to preview customer deletion. Please try again."),
      );
    }
  },

  async tombstone(customerId: string, confirmationPhrase: string): Promise<TombstoneCustomerAccountResponse> {
    try {
      return await callTracedFunction<
        { customerId: string; confirmationPhrase: string },
        TombstoneCustomerAccountResponse
      >("tombstoneCustomerAccount", {
        source: "tombstoneCustomerAccountService.tombstone",
      })({ customerId, confirmationPhrase });
    } catch (error) {
      throw new Error(
        getCallableErrorMessage(error, "Unable to delete the customer account. Please try again."),
      );
    }
  },
};
