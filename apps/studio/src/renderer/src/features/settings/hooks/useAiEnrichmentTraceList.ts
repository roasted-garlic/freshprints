import { useCallback, useEffect, useState } from "react";
import type { AiEnrichmentTrace } from "@fresh-prints/shared/types/ai/aiEnrichmentTrace.types";
import { aiEnrichmentTraceService } from "../services/aiEnrichmentTraceService";
export function useAiEnrichmentTraceList() {
  const [traces, setTraces] = useState<AiEnrichmentTrace[]>([]);
  const [error, setError] = useState<string | null>(null);
  const refresh = useCallback(async () => {
    try {
      const nextTraces = await aiEnrichmentTraceService.list();
      setTraces(nextTraces);
      setError(null);
      return nextTraces;
    } catch (value) {
      setError(value instanceof Error ? value.message : "Unable to list traces.");
      return null;
    }
  }, []);
  useEffect(() => aiEnrichmentTraceService.subscribeList(setTraces, (value) => setError(value.message)), []);
  return { traces, error, refresh };
}
