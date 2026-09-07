import { useEffect, useState } from "react";
import type { AiEnrichmentTrace } from "@fresh-prints/shared/types/ai/aiEnrichmentTrace.types";
import { aiEnrichmentTraceService } from "../services/aiEnrichmentTraceService";
export function useAiEnrichmentTrace(traceId: string | null) {
  const [trace, setTrace] = useState<AiEnrichmentTrace | null>(null);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    if (!traceId) { setTrace(null); return undefined; }
    return aiEnrichmentTraceService.subscribe(traceId, setTrace, (value) => setError(value.message));
  }, [traceId]);
  return { trace, error };
}
