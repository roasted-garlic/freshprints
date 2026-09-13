import { HttpsError, onCall } from "firebase-functions/v2/https";
import { loadCallerProfile } from "./lib/caller";
import { adminDb } from "./lib/admin";
import { AI_ENRICHMENT_TRACE_COLLECTION } from "./ai/aiEnrichmentTraceStore";
import type { AiEnrichmentTrace } from "../../packages/shared/src/types/ai/aiEnrichmentTrace.types";
import { serializeAiEnrichmentTrace } from "../../packages/shared/src/utils/aiEnrichmentTrace";
export const listAiEnrichmentTraces = onCall(async (request) => {
  if (!request.auth?.uid) throw new HttpsError("unauthenticated", "Sign-in required.");
  const caller = await loadCallerProfile(request.auth.uid);
  if (!caller.isActive || !["owner", "admin"].includes(caller.role)) throw new HttpsError("permission-denied", "Only owners and admins may view AI traces.");
  const snapshot = await adminDb.collection(AI_ENRICHMENT_TRACE_COLLECTION).orderBy("startedAt", "desc").limit(50).get();
  return snapshot.docs.map((entry) => serializeAiEnrichmentTrace(entry.data() as AiEnrichmentTrace, caller.role === "owner" && Boolean(entry.data().captureFullTrace)));
});
