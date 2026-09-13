import {
  DELETE_UPCOMING_SHOW_CONFIRMATION_PHRASE,
  type DeleteEligibleUpcomingShowResponse,
  type PreviewUpcomingShowDeletionResponse,
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

export const upcomingShowDeletionService = {
  confirmationPhrase: DELETE_UPCOMING_SHOW_CONFIRMATION_PHRASE,

  warmMutateCallables(): void {
    warmDeletionCallableBackground("deleteEligibleUpcomingShow");
  },

  async preview(upcomingShowId: string): Promise<PreviewUpcomingShowDeletionResponse> {
    try {
      return await callTracedFunction<{ upcomingShowId: string }, PreviewUpcomingShowDeletionResponse>(
        "previewUpcomingShowDeletion",
        { source: "upcomingShowDeletionService.preview" },
      )({ upcomingShowId });
    } catch (error) {
      throw new Error(
        getCallableErrorMessage(error, "Unable to preview show deletion. Please try again."),
      );
    }
  },

  async deleteEligible(
    upcomingShowId: string,
    confirmationPhrase: string,
  ): Promise<DeleteEligibleUpcomingShowResponse> {
    try {
      return await callTracedFunction<
        { upcomingShowId: string; confirmationPhrase: string },
        DeleteEligibleUpcomingShowResponse
      >("deleteEligibleUpcomingShow", {
        source: "upcomingShowDeletionService.deleteEligible",
      })({ upcomingShowId, confirmationPhrase });
    } catch (error) {
      throw new Error(getCallableErrorMessage(error, "Unable to delete the show. Please try again."));
    }
  },
};
