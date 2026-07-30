import { FirebaseError } from "firebase/app";

import type {
  AiEnrichmentPlaygroundRequest,
  AiEnrichmentPlaygroundResponse,
} from "@fresh-prints/shared/types/ai/aiEnrichmentPlayground.types";
import { callTracedFunction } from "../../../config/tracedCallable";
import { resolveClientVisionModelId } from "../constants/aiEnrichmentSettingsConstants";

export const aiEnrichmentPlaygroundService = {
  async runPlayground(
    input: AiEnrichmentPlaygroundRequest,
  ): Promise<AiEnrichmentPlaygroundResponse> {
    try {
      return await callTracedFunction<
        AiEnrichmentPlaygroundRequest,
        AiEnrichmentPlaygroundResponse
      >("testAiEnrichmentPlayground", {
        source: "aiEnrichmentPlaygroundService.runPlayground",
      })({
        ...input,
        visionModelId: resolveClientVisionModelId(input.visionModelId),
      });
    } catch (error) {
      throw new Error(resolveAiEnrichmentPlaygroundErrorMessage(error));
    }
  },
};

function resolveAiEnrichmentPlaygroundErrorMessage(error: unknown): string {
  if (error instanceof FirebaseError) {
    const message = error.message?.trim();

    switch (error.code) {
      case "functions/unauthenticated":
        return "You must be signed in to use the AI playground.";
      case "functions/permission-denied":
        return message && message !== "permission-denied"
          ? message
          : "Only owners and admins can use the AI playground.";
      case "functions/failed-precondition":
      case "functions/invalid-argument":
        return message && !isGenericCallableMessage(message)
          ? message
          : "The AI playground request is invalid. Check the prompt and image, then try again.";
      case "functions/unavailable":
      case "functions/internal":
      case "functions/not-found":
        return "AI Playground is unavailable right now. Confirm Cloud Functions are deployed for the selected Firebase project.";
      default:
        if (message && !isGenericCallableMessage(message)) {
          return message;
        }
    }
  }

  if (error instanceof Error) {
    const normalized = error.message.trim().toLowerCase();

    if (
      normalized.includes("cors") ||
      normalized.includes("failed to fetch") ||
      normalized.includes("networkerror") ||
      normalized.includes("err_failed")
    ) {
      return "AI Playground is unavailable right now. Confirm Cloud Functions are deployed for the selected Firebase project.";
    }

    if (error.message.trim()) {
      return error.message.trim();
    }
  }

  return "Unable to run the AI playground request.";
}

function isGenericCallableMessage(message: string): boolean {
  const normalized = message.trim().toLowerCase();

  return new Set([
    "internal",
    "unknown",
    "unavailable",
    "not-found",
    "failed-precondition",
    "invalid-argument",
    "permission-denied",
  ]).has(normalized);
}
