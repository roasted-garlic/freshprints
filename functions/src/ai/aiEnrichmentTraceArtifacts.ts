import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import type { AiEnrichmentTrace } from "../../../packages/shared/src/types/ai/aiEnrichmentTrace.types";
import { serializeAiEnrichmentTrace } from "../../../packages/shared/src/utils/aiEnrichmentTrace";

export const AI_ENRICHMENT_TRACE_ARTIFACT_DIR = ".tmp/ai-enrichment-traces";
export async function writeAiEnrichmentTraceArtifact(trace: AiEnrichmentTrace): Promise<string> {
  await mkdir(AI_ENRICHMENT_TRACE_ARTIFACT_DIR, { recursive: true });
  const path = join(AI_ENRICHMENT_TRACE_ARTIFACT_DIR, `${trace.traceId}.json`);
  await writeFile(path, `${JSON.stringify(serializeAiEnrichmentTrace(trace, trace.captureFullTrace), null, 2)}\n`, "utf8");
  return path;
}
