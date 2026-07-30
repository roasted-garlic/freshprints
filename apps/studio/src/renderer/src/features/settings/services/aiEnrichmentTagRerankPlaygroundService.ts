import { FirebaseError } from "firebase/app";

import type {
  AiEnrichmentTagRerankPlaygroundRequest,
  AiEnrichmentTagRerankPlaygroundResponse,
} from "@fresh-prints/shared/types/ai/aiEnrichmentPlayground.types";
import { callTracedFunction } from "../../../config/tracedCallable";
import { resolveClientVisionModelId } from "../constants/aiEnrichmentSettingsConstants";

export const aiEnrichmentTagRerankPlaygroundService = {
  async runTagRerank(
    input: AiEnrichmentTagRerankPlaygroundRequest,
  ): Promise<AiEnrichmentTagRerankPlaygroundResponse> {
    try {
      return await callTracedFunction<
        AiEnrichmentTagRerankPlaygroundRequest,
        AiEnrichmentTagRerankPlaygroundResponse
      >("testAiEnrichmentTagRerank", {
        source: "aiEnrichmentTagRerankPlaygroundService.runTagRerank",
      })({
        ...input,
        visionModelId: resolveClientVisionModelId(input.visionModelId),
      });
    } catch (error) {
      throw new Error(resolveTagRerankPlaygroundErrorMessage(error));
    }
  },
};

function resolveTagRerankPlaygroundErrorMessage(error: unknown): string {
  if (error instanceof FirebaseError) {
    const message = error.message?.trim();

    switch (error.code) {
      case "functions/unauthenticated":
        return "You must be signed in to use the AI tag rerank playground.";
      case "functions/permission-denied":
        return message && message !== "permission-denied"
          ? message
          : "Only owners and admins can use the AI tag rerank playground.";
      case "functions/failed-precondition":
      case "functions/invalid-argument":
        return message && !isGenericCallableMessage(message)
          ? message
          : "The tag rerank request is invalid. Run the AI playground first to get a valid response.";
      case "functions/unavailable":
      case "functions/internal":
      case "functions/not-found":
        return "The tag rerank playground is unavailable right now. Confirm Cloud Functions are deployed for the selected Firebase project.";
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
      return "The tag rerank playground is unavailable right now. Confirm Cloud Functions are deployed for the selected Firebase project.";
    }

    if (error.message.trim()) {
      return error.message.trim();
    }
  }

  return "Unable to run the AI tag rerank playground request.";
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
