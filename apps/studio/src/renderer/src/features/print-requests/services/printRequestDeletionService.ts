import {
  ARCHIVE_PRINT_REQUEST_CONFIRMATION_PHRASE,
  DELETE_PRINT_REQUEST_CONFIRMATION_PHRASE,
  type ArchivePrintRequestResponse,
  type DeleteEligiblePrintRequestResponse,
  type PreviewPrintRequestDeletionResponse,
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

export const printRequestDeletionService = {
  deleteConfirmationPhrase: DELETE_PRINT_REQUEST_CONFIRMATION_PHRASE,
  archiveConfirmationPhrase: ARCHIVE_PRINT_REQUEST_CONFIRMATION_PHRASE,

  /** Same-service warm for mutate callables that may run after preview (non-blocking). */
  warmMutateCallables(): void {
    warmDeletionCallableBackground("deleteEligiblePrintRequest");
    warmDeletionCallableBackground("archivePrintRequest");
  },

  async preview(printRequestId: string): Promise<PreviewPrintRequestDeletionResponse> {
    try {
      return await callTracedFunction<{ printRequestId: string }, PreviewPrintRequestDeletionResponse>(
        "previewPrintRequestDeletion",
        { source: "printRequestDeletionService.preview" },
      )({ printRequestId });
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
      return await callTracedFunction<
        { printRequestId: string; confirmationPhrase: string },
        DeleteEligiblePrintRequestResponse
      >("deleteEligiblePrintRequest", {
        source: "printRequestDeletionService.deleteEligible",
      })({ printRequestId, confirmationPhrase });
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
      return await callTracedFunction<
        { printRequestId: string; confirmationPhrase: string },
        ArchivePrintRequestResponse
      >("archivePrintRequest", {
        source: "printRequestDeletionService.archive",
      })({ printRequestId, confirmationPhrase });
    } catch (error) {
      throw new Error(
        getCallableErrorMessage(error, "Unable to archive the print request. Please try again."),
      );
    }
  },
};
