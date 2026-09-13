import { FirebaseError } from "firebase/app";

import type {
  ApplyShowProductionRecoveryRequest,
  ApplyShowProductionRecoveryResponse,
  PreviewShowProductionRecoveryRequest,
  PreviewShowProductionRecoveryResponse,
  ShowProductionRecoveryAction,
} from "@fresh-prints/shared/types/showProductionRecovery/showProductionRecovery.types";

import { callTracedFunction } from "../../../config/tracedCallable";

const GENERIC_CALLABLE_MESSAGES = new Set([
  "internal",
  "INTERNAL",
  "unknown",
  "unavailable",
  "failed-precondition",
  "invalid-argument",
  "permission-denied",
  "not-found",
]);

export const SHOW_PRODUCTION_RECOVERY_DEPLOY_HINT =
  "Deploy previewShowProductionRecovery and applyShowProductionRecovery to your DEV Firebase project, then reload Studio.";

function isGenericCallableMessage(message: string): boolean {
  return GENERIC_CALLABLE_MESSAGES.has(message.trim());
}

export function mapShowProductionRecoveryCallableError(error: unknown, fallbackMessage: string): string {
  if (error instanceof FirebaseError) {
    const message = error.message?.trim() ?? "";
    if (message && !isGenericCallableMessage(message)) {
      return message;
    }
    switch (error.code) {
      case "functions/not-found":
      case "functions/unavailable":
      case "functions/internal":
        return SHOW_PRODUCTION_RECOVERY_DEPLOY_HINT;
      case "functions/permission-denied":
        return "You do not have permission to run show production recovery.";
      case "functions/unauthenticated":
        return "You must be signed in to run show production recovery.";
      case "functions/failed-precondition":
        return message && !isGenericCallableMessage(message)
          ? message
          : "Show production recovery is not available right now. Confirm DEV Functions are deployed.";
      default:
        return SHOW_PRODUCTION_RECOVERY_DEPLOY_HINT;
    }
  }
  if (error instanceof Error && error.message.trim() && !isGenericCallableMessage(error.message)) {
    return error.message.trim();
  }
  return fallbackMessage;
}

export const showProductionRecoveryService = {
  async preview(
    request: PreviewShowProductionRecoveryRequest,
  ): Promise<PreviewShowProductionRecoveryResponse> {
    try {
      return await callTracedFunction<
        PreviewShowProductionRecoveryRequest,
        PreviewShowProductionRecoveryResponse
      >("previewShowProductionRecovery", {
        source: "showProductionRecoveryService.preview",
      })(request);
    } catch (error) {
      throw new Error(
        mapShowProductionRecoveryCallableError(error, "Unable to preview show recovery. Please try again."),
      );
    }
  },

  async apply(request: ApplyShowProductionRecoveryRequest): Promise<ApplyShowProductionRecoveryResponse> {
    try {
      return await callTracedFunction<
        ApplyShowProductionRecoveryRequest,
        ApplyShowProductionRecoveryResponse
      >("applyShowProductionRecovery", {
        source: "showProductionRecoveryService.apply",
      })(request);
    } catch (error) {
      throw new Error(
        mapShowProductionRecoveryCallableError(error, "Unable to apply show recovery. Please try again."),
      );
    }
  },
};

export const SHOW_PRODUCTION_RECOVERY_ACTION_LABELS: Record<ShowProductionRecoveryAction, string> = {
  close_empty: "Close Empty Show",
  mark_fulfilled: "Mark as Fulfilled",
  release_unfulfilled: "Release from show",
  requeue_unfulfilled: "Confirm Did Not Print + Move",
  force_completed: "Force Completed",
};

/** Staff-facing helper for Did Not Print secondary path (release without requeue). */
export const SHOW_PRODUCTION_RELEASE_ONLY_HELPER =
  "Cancels this show's allocations without moving work to another show. Print requests appear under Working → Needs Re-queue until staff adds them to a show. If the customer has no other draft or editing request, the released request may also return to editing for Portal changes.";
