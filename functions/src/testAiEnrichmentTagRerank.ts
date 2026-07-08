import { onCall } from "firebase-functions/v2/https";

import type {
  AiEnrichmentTagRerankPlaygroundRequest,
  AiEnrichmentTagRerankPlaygroundResponse,
} from "../../packages/shared/src/types/ai/aiEnrichmentPlayground.types";
import { runAiEnrichmentTagRerankPlayground } from "./ai/aiEnrichmentPlayground";
import { loadCallerProfile } from "./lib/caller";
import { invalidArgument, permissionDenied, unauthenticated } from "./lib/errors";
import { geminiApiKeySecret } from "./lib/secrets";

// Same owner/admin gate as testAiEnrichmentPlayground — this callable triggers a real Gemini call
// and reads internal approved-tag data, so it must never be weaker than the existing Settings AI
// Playground / updateAiEnrichmentSettings authorization (review note 2). Exported so the gate
// itself is independently unit-testable without requiring a live/emulated Firestore.
export function assertOwnerAdminCaller(caller: Awaited<ReturnType<typeof loadCallerProfile>>): void {
  if (!caller.isActive || !["owner", "admin"].includes(caller.role)) {
    throw permissionDenied("Only owners and admins can use the AI tag rerank playground.");
  }
}

export const testAiEnrichmentTagRerank = onCall(
  { secrets: [geminiApiKeySecret], memory: "512MiB" },
  async (request): Promise<AiEnrichmentTagRerankPlaygroundResponse> => {
    if (!request.auth?.uid) {
      throw unauthenticated();
    }

    const caller = await loadCallerProfile(request.auth.uid);
    assertOwnerAdminCaller(caller);

    try {
      return await runAiEnrichmentTagRerankPlayground(
        geminiApiKeySecret.value(),
        request.data as AiEnrichmentTagRerankPlaygroundRequest,
      );
    } catch (error) {
      if (error instanceof Error) {
        throw invalidArgument(error.message);
      }

      throw invalidArgument("Unable to run the AI tag rerank playground request.");
    }
  },
);
