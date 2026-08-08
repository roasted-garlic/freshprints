import { FirebaseError } from "firebase/app";

/**
 * `enqueueAiEnrichment`'s own server-side `timeoutSeconds: 180` (see
 * functions/src/enqueueAiEnrichment.ts) is well above the Firebase JS SDK's 70-second callable
 * default. Without a client-side override, a design whose Gemini pipeline genuinely runs longer
 * than 70s causes the CLIENT call to reject with `functions/deadline-exceeded` while the
 * server-side pipeline keeps running to completion independently (`onCall` execution is not
 * cancelled by a client disconnect) — the client then loses track of that design's real
 * completion until an unrelated later reload happens to observe it, producing exactly the
 * "Processing count/list freezes, then everything reconciles at once" symptom
 * (post-launch-catalog-and-processing-stability, Owner QA Amendment 5). A buffer above the
 * server's 180s absorbs network/serialization overhead so the client does not race a
 * fully-successful server completion landing right at the boundary.
 */
export const ENQUEUE_AI_ENRICHMENT_CLIENT_TIMEOUT_MS = 200_000;

function isGenericCallableMessage(message: string): boolean {
  return new Set([
    "internal",
    "unknown",
    "unavailable",
    "failed-precondition",
    "invalid-argument",
    "permission-denied",
    "not-found",
  ]).has(message.trim().toLowerCase());
}

export function resolveAiEnrichmentCallableErrorMessage(error: unknown): string {
  if (error instanceof FirebaseError) {
    const message = error.message?.trim() ?? "";

    switch (error.code) {
      case "functions/unauthenticated":
        return "You must be signed in to run AI processing.";
      case "functions/permission-denied":
        return message && !isGenericCallableMessage(message)
          ? message
          : "You do not have permission to run AI processing.";
      case "functions/invalid-argument":
      case "functions/failed-precondition":
        return message && !isGenericCallableMessage(message)
          ? message
          : "AI processing could not start for this design.";
      case "functions/unavailable":
      case "functions/not-found":
      case "functions/internal":
        return "AI Processing is unavailable right now. Confirm Cloud Functions are deployed for the selected Firebase project.";
      case "functions/deadline-exceeded":
        // The client gave up waiting, but the server-side pipeline is not cancelled by this and
        // may still complete successfully shortly after — distinct from a genuine failure
        // (Owner QA Amendment 5). The caller reconciles the design's real outcome via a
        // generation-guarded reload once it actually completes.
        return "AI processing is taking longer than expected. It will keep running — this design will update automatically once it finishes.";
      default:
        if (message && !isGenericCallableMessage(message)) {
          return message;
        }
    }
  }

  if (error instanceof Error && error.message.trim()) {
    return error.message.trim();
  }

  return "Unable to run AI processing right now.";
}
