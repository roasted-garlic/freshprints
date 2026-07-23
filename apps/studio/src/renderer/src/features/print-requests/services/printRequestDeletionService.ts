import { httpsCallable } from "firebase/functions";

import {
  ARCHIVE_PRINT_REQUEST_CONFIRMATION_PHRASE,
  DELETE_PRINT_REQUEST_CONFIRMATION_PHRASE,
  type ArchivePrintRequestResponse,
  type DeleteEligiblePrintRequestResponse,
  type PreviewPrintRequestDeletionResponse,
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

export const printRequestDeletionService = {
  deleteConfirmationPhrase: DELETE_PRINT_REQUEST_CONFIRMATION_PHRASE,
  archiveConfirmationPhrase: ARCHIVE_PRINT_REQUEST_CONFIRMATION_PHRASE,

  async preview(printRequestId: string): Promise<PreviewPrintRequestDeletionResponse> {
    try {
      const callable = httpsCallable<{ printRequestId: string }, PreviewPrintRequestDeletionResponse>(
        functions,
        "previewPrintRequestDeletion",
      );
      const response = await callable({ printRequestId });
      return response.data;
    } catch (error) {
      throw new Error(
        getCallableErrorMessage(error, "Unable to preview print request deletion. Please try again."),
      );
    }
  },

  async deleteEligible(
    printRequestId: string,
    confirmationPhrase: string,
  ): Promise<DeleteEligiblePrintRequestResponse> {
    try {
      const callable = httpsCallable<
        { printRequestId: string; confirmationPhrase: string },
        DeleteEligiblePrintRequestResponse
      >(functions, "deleteEligiblePrintRequest");
      const response = await callable({ printRequestId, confirmationPhrase });
      return response.data;
    } catch (error) {
      throw new Error(
        getCallableErrorMessage(error, "Unable to delete the print request. Please try again."),
      );
    }
  },

  async archive(
    printRequestId: string,
    confirmationPhrase: string,
  ): Promise<ArchivePrintRequestResponse> {
    try {
      const callable = httpsCallable<
        { printRequestId: string; confirmationPhrase: string },
        ArchivePrintRequestResponse
      >(functions, "archivePrintRequest");
      const response = await callable({ printRequestId, confirmationPhrase });
      return response.data;
    } catch (error) {
      throw new Error(
        getCallableErrorMessage(error, "Unable to archive the print request. Please try again."),
      );
    }
  },
};
