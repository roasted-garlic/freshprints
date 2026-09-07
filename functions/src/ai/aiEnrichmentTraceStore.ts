import { adminDb } from "../lib/admin";
import type { AiEnrichmentTrace } from "../../../packages/shared/src/types/ai/aiEnrichmentTrace.types";
import { serializeAiEnrichmentTrace } from "../../../packages/shared/src/utils/aiEnrichmentTrace";
import { logPipelineEvent } from "../lib/pipelineLog";
export const AI_ENRICHMENT_TRACE_COLLECTION = "aiEnrichmentTraces";
export const AI_ENRICHMENT_TRACE_FULL_COLLECTION = "aiEnrichmentTraceFull";

type TraceWriteCollection = "bounded" | "full";
type TraceWriteLogger = (event: string, context: Record<string, unknown>) => void;

function safeTraceWriteMessage(error: unknown): string {
  const message = error instanceof Error ? error.message : String(error);
  return message
    .replace(/[\r\n]+/g, " ")
    .replace(/(authorization|api[_-]?key|secret|token|password)\s*[:=]\s*[^\s;,]+/gi, "$1=[redacted]")
    .slice(0, 300);
}

export async function writeAiEnrichmentTraceDocument(
  write: () => Promise<void>,
  metadata: { traceId: string; collection: TraceWriteCollection },
  logger: TraceWriteLogger = logPipelineEvent,
): Promise<void> {
  try {
    await write();
  } catch (error) {
    try {
      logger("ai_enrichment_trace.write_failed", {
        operation: "trace_write",
        traceId: metadata.traceId,
        collection: metadata.collection,
        errorName: error instanceof Error ? error.name : "UnknownError",
        errorMessage: safeTraceWriteMessage(error),
        projectId: process.env.GCLOUD_PROJECT ?? process.env.GCP_PROJECT ?? "unknown",
      });
    } catch {
      // Trace diagnostics must never affect enrichment behavior.
    }
  }
}

export async function writeAiEnrichmentTrace(trace: AiEnrichmentTrace): Promise<void> {
  const boundedPayload = { ...serializeAiEnrichmentTrace(trace, false), updatedAt: new Date().toISOString() };
  await writeAiEnrichmentTraceDocument(
    async () => { await adminDb.collection(AI_ENRICHMENT_TRACE_COLLECTION).doc(trace.traceId).set(boundedPayload, { merge: true }); },
    { traceId: trace.traceId, collection: "bounded" },
  );
  if (trace.captureFullTrace) {
    const fullPayload = { ...serializeAiEnrichmentTrace(trace, true), updatedAt: new Date().toISOString() };
    await writeAiEnrichmentTraceDocument(
      async () => { await adminDb.collection(AI_ENRICHMENT_TRACE_FULL_COLLECTION).doc(trace.traceId).set(fullPayload, { merge: true }); },
      { traceId: trace.traceId, collection: "full" },
    );
  }
}
