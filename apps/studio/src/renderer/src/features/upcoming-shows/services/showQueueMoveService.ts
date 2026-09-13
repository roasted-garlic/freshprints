import { FirebaseError } from "firebase/app";

import type {
  ApplyShowQueueMoveRequest,
  ApplyShowQueueMoveResponse,
  PreviewShowQueueMoveRequest,
  PreviewShowQueueMoveResponse,
} from "@fresh-prints/shared/types/showQueueMove/showQueueMove.types";

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

export const SHOW_QUEUE_MOVE_DEPLOY_HINT =
  "Deploy previewShowQueueMove and applyShowQueueMove to your DEV Firebase project, then reload Studio.";

function isGenericCallableMessage(message: string): boolean {
  return GENERIC_CALLABLE_MESSAGES.has(message.trim());
}

export function mapShowQueueMoveCallableError(error: unknown, fallbackMessage: string): string {
  if (error instanceof FirebaseError) {
    const message = error.message?.trim() ?? "";
    if (message && !isGenericCallableMessage(message)) {
      return message;
    }
    switch (error.code) {
      case "functions/not-found":
      case "functions/unavailable":
      case "functions/internal":
        return SHOW_QUEUE_MOVE_DEPLOY_HINT;
      case "functions/permission-denied":
        return "You do not have permission to move show queue requests.";
      case "functions/unauthenticated":
        return "You must be signed in to move show queue requests.";
      case "functions/failed-precondition":
        return message && !isGenericCallableMessage(message)
          ? message
          : "Show queue move is not available right now. Confirm DEV Functions are deployed.";
      default:
        return SHOW_QUEUE_MOVE_DEPLOY_HINT;
    }
  }
  if (error instanceof Error && error.message.trim() && !isGenericCallableMessage(error.message)) {
    return error.message.trim();
  }
  return fallbackMessage;
}

export const showQueueMoveService = {
  async preview(request: PreviewShowQueueMoveRequest): Promise<PreviewShowQueueMoveResponse> {
    try {
      return await callTracedFunction<PreviewShowQueueMoveRequest, PreviewShowQueueMoveResponse>(
        "previewShowQueueMove",
        { source: "showQueueMoveService.preview" },
      )(request);
    } catch (error) {
      throw new Error(
        mapShowQueueMoveCallableError(error, "Unable to preview move. Please try again."),
      );
    }
  },

  async apply(request: ApplyShowQueueMoveRequest): Promise<ApplyShowQueueMoveResponse> {
    try {
      return await callTracedFunction<ApplyShowQueueMoveRequest, ApplyShowQueueMoveResponse>(
        "applyShowQueueMove",
        { source: "showQueueMoveService.apply" },
      )(request);
    } catch (error) {
      throw new Error(
        mapShowQueueMoveCallableError(error, "Unable to apply move. Please try again."),
      );
    }
  },
};
