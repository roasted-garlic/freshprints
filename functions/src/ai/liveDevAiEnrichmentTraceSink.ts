import { FieldValue } from "firebase-admin/firestore";
import { adminDb } from "../lib/admin";
import type { AiEnrichmentTrace, AiEnrichmentTraceSink, AiEnrichmentTraceStageEvent } from "../../../packages/shared/src/types/ai/aiEnrichmentTrace.types";
import { serializeAiEnrichmentTrace } from "../../../packages/shared/src/utils/aiEnrichmentTrace";
import { AI_ENRICHMENT_TRACE_COLLECTION } from "./aiEnrichmentTraceStore";

/** Explicit opt-in for DEV integration/fixture tests. Application Default Credentials are used; no credentials are stored. */
export function isLiveDevTraceEnabled(): boolean { return process.env.AI_ENRICHMENT_TRACE_LIVE_DEV === "1"; }

export class LiveDevAiEnrichmentTraceSink implements AiEnrichmentTraceSink {
  async record(trace: AiEnrichmentTrace): Promise<void> {
    if (!isLiveDevTraceEnabled()) return;
    await adminDb.collection(AI_ENRICHMENT_TRACE_COLLECTION).doc(trace.traceId).set(serializeAiEnrichmentTrace(trace, trace.captureFullTrace), { merge: true }).catch(() => undefined);
  }
  async stage(traceId: string, event: AiEnrichmentTraceStageEvent): Promise<void> {
    if (!isLiveDevTraceEnabled()) return;
    await adminDb.collection(AI_ENRICHMENT_TRACE_COLLECTION).doc(traceId).set({ stages: FieldValue.arrayUnion({ ...event }), lifecycleState: event.stage, updatedAt: new Date().toISOString() }, { merge: true }).catch(() => undefined);
  }
}
