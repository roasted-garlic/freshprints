import { HttpsError, onCall } from "firebase-functions/v2/https";
import { loadCallerProfile } from "./lib/caller";
import { adminDb } from "./lib/admin";
import { AI_ENRICHMENT_TRACE_COLLECTION, AI_ENRICHMENT_TRACE_FULL_COLLECTION } from "./ai/aiEnrichmentTraceStore";

export const clearAiEnrichmentTraces = onCall(async (request) => {
  if (!request.auth?.uid) throw new HttpsError("unauthenticated", "Sign-in required.");
  const caller = await loadCallerProfile(request.auth.uid);
  if (!caller.isActive || caller.role !== "owner") throw new HttpsError("permission-denied", "Only owners may clear AI traces.");
  const ids = Array.isArray(request.data?.traceIds) ? request.data.traceIds.filter((value: unknown): value is string => typeof value === "string" && value.length > 0).slice(0, 50) : [];
  if (!ids.length) throw new HttpsError("invalid-argument", "Select at least one trace to clear.");
  const batch = adminDb.batch();
  for (const traceId of ids) {
    batch.delete(adminDb.collection(AI_ENRICHMENT_TRACE_COLLECTION).doc(traceId));
    batch.delete(adminDb.collection(AI_ENRICHMENT_TRACE_FULL_COLLECTION).doc(traceId));
  }
  await batch.commit();
  return { cleared: ids.length };
});
