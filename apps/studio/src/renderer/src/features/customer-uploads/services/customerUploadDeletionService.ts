import { httpsCallable } from "firebase/functions";

import {
  DELETE_CUSTOMER_UPLOAD_CONFIRMATION_PHRASE,
  type DeleteEligibleCustomerUploadResponse,
  type PreviewCustomerUploadDeletionResponse,
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

export const customerUploadDeletionService = {
  confirmationPhrase: DELETE_CUSTOMER_UPLOAD_CONFIRMATION_PHRASE,

  async preview(customerUploadId: string): Promise<PreviewCustomerUploadDeletionResponse> {
    try {
      const callable = httpsCallable<
        { customerUploadId: string },
        PreviewCustomerUploadDeletionResponse
      >(functions, "previewCustomerUploadDeletion");
      const response = await callable({ customerUploadId });
      return response.data;
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
      const callable = httpsCallable<
        { customerUploadId: string; confirmationPhrase: string },
        DeleteEligibleCustomerUploadResponse
      >(functions, "deleteEligibleCustomerUpload");
      const response = await callable({ customerUploadId, confirmationPhrase });
      return response.data;
    } catch (error) {
      throw new Error(
        getCallableErrorMessage(error, "Unable to delete the customer upload. Please try again."),
      );
    }
  },
};
