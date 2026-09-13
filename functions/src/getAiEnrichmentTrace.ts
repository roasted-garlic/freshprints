import { HttpsError, onCall } from "firebase-functions/v2/https";
import { loadCallerProfile } from "./lib/caller";
import { adminDb } from "./lib/admin";
import { AI_ENRICHMENT_TRACE_COLLECTION, AI_ENRICHMENT_TRACE_FULL_COLLECTION } from "./ai/aiEnrichmentTraceStore";
import { serializeAiEnrichmentTrace } from "../../packages/shared/src/utils/aiEnrichmentTrace";
import type { AiEnrichmentTrace } from "../../packages/shared/src/types/ai/aiEnrichmentTrace.types";
export const getAiEnrichmentTrace = onCall(async (request) => {
  if (!request.auth?.uid) throw new HttpsError("unauthenticated", "Sign-in required.");
  const caller = await loadCallerProfile(request.auth.uid);
  if (!caller.isActive || !["owner", "admin"].includes(caller.role)) throw new HttpsError("permission-denied", "Only owners and admins may view AI traces.");
  const traceId = request.data && typeof request.data.traceId === "string" ? request.data.traceId.trim() : "";
  if (!traceId || traceId.length > 128) throw new HttpsError("invalid-argument", "A trace ID is required.");
  let snapshot = await adminDb.collection(caller.role === "owner" ? AI_ENRICHMENT_TRACE_FULL_COLLECTION : AI_ENRICHMENT_TRACE_COLLECTION).doc(traceId).get();
  if (!snapshot.exists && caller.role === "owner") snapshot = await adminDb.collection(AI_ENRICHMENT_TRACE_COLLECTION).doc(traceId).get();
  if (!snapshot.exists) throw new HttpsError("not-found", "AI trace not found.");
  const trace = snapshot.data() as AiEnrichmentTrace;
  return serializeAiEnrichmentTrace(trace, caller.role === "owner" && trace.captureFullTrace);
});
