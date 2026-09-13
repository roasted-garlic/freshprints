import { FirebaseError } from "firebase/app";

import type {
  DeleteEligibleUnapprovedDesignRequest,
  DeleteEligibleUnapprovedDesignResponse,
} from "@fresh-prints/shared/types/admin/deleteEligibleUnapprovedDesign.types";

import { callTracedFunction } from "../../../config/tracedCallable";
import { warmDeletionCallableBackground } from "../../deletion/services/deletionCallableWarmupService";

const genericCallableMessages = new Set([
  "internal",
  "unknown",
  "unavailable",
  "deadline-exceeded",
  "aborted",
  "cancelled",
  "data-loss",
  "not-found",
]);

function isGenericCallableMessage(message: string): boolean {
  const normalized = message.trim().toLowerCase();
  return genericCallableMessages.has(normalized);
}

function getCallableErrorMessage(error: unknown, fallbackMessage: string): string {
  if (!(error instanceof FirebaseError)) {
    if (
      error &&
      typeof error === "object" &&
      "message" in error &&
      typeof error.message === "string" &&
      error.message.trim() &&
      !isGenericCallableMessage(error.message)
    ) {
      return error.message;
    }

    return fallbackMessage;
  }

  const message = error.message?.trim() ?? "";

  switch (error.code) {
    case "functions/unauthenticated":
      return "You must be signed in to permanently delete unapproved designs.";
    case "functions/permission-denied":
      return message && !isGenericCallableMessage(message)
        ? message
        : "Only owners can permanently delete eligible unapproved designs.";
    case "functions/invalid-argument":
      return message && !isGenericCallableMessage(message)
        ? message
        : "Check the delete request and try again.";
    case "functions/not-found":
    case "functions/unavailable":
    case "functions/internal":
      return (
        "Unable to delete designs. Confirm the deleteEligibleUnapprovedDesign Cloud Function " +
        "is deployed to this Firebase project, then try again."
      );
    default:
      if (message && !isGenericCallableMessage(message)) {
        return message;
      }

      return fallbackMessage;
  }
}

export function warmDeleteEligibleUnapprovedDesignCallable(): void {
  warmDeletionCallableBackground("deleteEligibleUnapprovedDesign");
}

export async function deleteEligibleUnapprovedDesigns(
  input: DeleteEligibleUnapprovedDesignRequest,
): Promise<DeleteEligibleUnapprovedDesignResponse> {
  try {
    return await callTracedFunction<
      DeleteEligibleUnapprovedDesignRequest,
      DeleteEligibleUnapprovedDesignResponse
    >(
      "deleteEligibleUnapprovedDesign",
      { source: "deleteEligibleUnapprovedDesignService.deleteEligibleUnapprovedDesigns" },
    )(input);
  } catch (error) {
    throw new Error(
      getCallableErrorMessage(
        error,
        "Unable to permanently delete unapproved designs. Please try again.",
      ),
    );
  }
}
