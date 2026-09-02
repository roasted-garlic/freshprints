import {
  DELETE_CUSTOMER_UPLOAD_CONFIRMATION_PHRASE,
  type DeleteEligibleCustomerUploadResponse,
  type PreviewCustomerUploadDeletionResponse,
} from "@fresh-prints/shared/types/deletion/deletion.types";

import { callTracedFunction } from "../../../config/tracedCallable";
import { warmDeletionCallableBackground } from "../../deletion/services/deletionCallableWarmupService";

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

export const customerUploadDeletionService = {
  confirmationPhrase: DELETE_CUSTOMER_UPLOAD_CONFIRMATION_PHRASE,

  warmMutateCallables(): void {
    warmDeletionCallableBackground("deleteEligibleCustomerUpload");
  },

  async preview(customerUploadId: string): Promise<PreviewCustomerUploadDeletionResponse> {
    try {
      return await callTracedFunction<
        { customerUploadId: string },
        PreviewCustomerUploadDeletionResponse
      >("previewCustomerUploadDeletion", {
        source: "customerUploadDeletionService.preview",
      })({ customerUploadId });
    } catch (error) {
      throw new Error(
        getCallableErrorMessage(error, "Unable to preview upload deletion. Please try again."),
      );
    }
  },

  async deleteEligible(
    customerUploadId: string,
    confirmationPhrase: string,
  ): Promise<DeleteEligibleCustomerUploadResponse> {
    try {
      return await callTracedFunction<
        { customerUploadId: string; confirmationPhrase: string },
        DeleteEligibleCustomerUploadResponse
      >("deleteEligibleCustomerUpload", {
        source: "customerUploadDeletionService.deleteEligible",
      })({ customerUploadId, confirmationPhrase });
    } catch (error) {
      throw new Error(
        getCallableErrorMessage(error, "Unable to delete the customer upload. Please try again."),
      );
    }
  },
};
