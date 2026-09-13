import type { HttpsError } from "firebase-functions/v2/https";

import { VisionEmptyOutputError } from "./visionCompletion";
import { VisionRequestError } from "./visionRequestRetry";
import {
  deadlineExceeded,
  failedPrecondition,
  invalidArgument,
} from "../lib/errors";

export function mapPlaygroundError(error: unknown): HttpsError {
  if (error instanceof VisionRequestError) {
    const category = error.status === 408 || error.status === 504
      ? "timeout_network"
      : "provider_upstream_failure";
    if (category === "timeout_network") {
      return deadlineExceeded("The AI provider request timed out.", {
        aiErrorCategory: category,
      });
    }
    return failedPrecondition(
      "The configured AI provider could not complete the Playground request.",
      { aiErrorCategory: category },
    );
  }
  if (error instanceof VisionEmptyOutputError) {
    return failedPrecondition("The AI provider returned no visible Playground output.", {
      aiErrorCategory: "provider_upstream_failure",
    });
  }
  if (error instanceof Error) {
    const normalized = error.message.toLowerCase();
    if (/timeout|timed out|networkerror|failed to fetch|err_failed/.test(normalized)) {
      return deadlineExceeded("The AI provider request timed out or could not be reached.", {
        aiErrorCategory: "timeout_network",
      });
    }
    return invalidArgument(error.message);
  }
  return invalidArgument("Unable to run the AI playground request.");
}
