import { onCall } from "firebase-functions/v2/https";

import type {
  AiEnrichmentPlaygroundRequest,
  AiEnrichmentPlaygroundResponse,
} from "../../shared/types/ai/aiEnrichmentPlayground.types";
import { runAiEnrichmentPlayground } from "./ai/aiEnrichmentPlayground";
import { loadCallerProfile } from "./lib/caller";
import { invalidArgument, permissionDenied, unauthenticated } from "./lib/errors";
import { geminiApiKeySecret } from "./lib/secrets";

function assertOwnerAdminCaller(caller: Awaited<ReturnType<typeof loadCallerProfile>>): void {
  if (!caller.isActive || !["owner", "admin"].includes(caller.role)) {
    throw permissionDenied("Only owners and admins can use the AI playground.");
  }
}

export const testAiEnrichmentPlayground = onCall(
  { secrets: [geminiApiKeySecret], memory: "512MiB" },
  async (request): Promise<AiEnrichmentPlaygroundResponse> => {
    if (!request.auth?.uid) {
      throw unauthenticated();
    }

    const caller = await loadCallerProfile(request.auth.uid);
    assertOwnerAdminCaller(caller);

    try {
      return await runAiEnrichmentPlayground(
        geminiApiKeySecret.value(),
        request.data as AiEnrichmentPlaygroundRequest,
      );
    } catch (error) {
      if (error instanceof Error) {
        throw invalidArgument(error.message);
      }

      throw invalidArgument("Unable to run the AI playground request.");
    }
  },
);
