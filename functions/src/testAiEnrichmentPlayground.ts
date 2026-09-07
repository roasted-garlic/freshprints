import { onCall } from "firebase-functions/v2/https";

import type {
  AiEnrichmentPlaygroundRequest,
  AiEnrichmentPlaygroundResponse,
} from "../../packages/shared/src/types/ai/aiEnrichmentPlayground.types";
import { runAiEnrichmentPlayground } from "./ai/aiEnrichmentPlayground";
import { mapPlaygroundError } from "./ai/playgroundErrorMapping";
import { loadCallerProfile } from "./lib/caller";
import { permissionDenied, unauthenticated } from "./lib/errors";
import { geminiApiKeySecret, openAiApiKeySecret } from "./lib/secrets";

function assertOwnerAdminCaller(caller: Awaited<ReturnType<typeof loadCallerProfile>>): void {
  if (!caller.isActive || !["owner", "admin"].includes(caller.role)) {
    throw permissionDenied("Only owners and admins can use the AI playground.");
  }
}

export const testAiEnrichmentPlayground = onCall(
  { secrets: [geminiApiKeySecret, openAiApiKeySecret], memory: "512MiB" },
  async (request): Promise<AiEnrichmentPlaygroundResponse> => {
    if (!request.auth?.uid) {
      throw unauthenticated();
    }

    const caller = await loadCallerProfile(request.auth.uid);
    assertOwnerAdminCaller(caller);
    const data = request.data as AiEnrichmentPlaygroundRequest;
    if (data.captureFullTrace && caller.role !== "owner") throw permissionDenied("Only owners may capture full AI trace content.");

    try {
      return await runAiEnrichmentPlayground(
        {
          geminiApiKey: geminiApiKeySecret.value(),
          openAiApiKey: openAiApiKeySecret.value(),
        },
        data,
      );
    } catch (error) {
      throw mapPlaygroundError(error);
    }
  },
);
