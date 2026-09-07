import { useCallback, useEffect, useState } from "react";
import type { AiEnrichmentTrace } from "@fresh-prints/shared/types/ai/aiEnrichmentTrace.types";
import { aiEnrichmentTraceService } from "../services/aiEnrichmentTraceService";
export function useAiEnrichmentTraceList() {
  const [traces, setTraces] = useState<AiEnrichmentTrace[]>([]);
  const [error, setError] = useState<string | null>(null);
  const refresh = useCallback(async () => { try { setTraces(await aiEnrichmentTraceService.list()); setError(null); } catch (value) { setError(value instanceof Error ? value.message : "Unable to list traces."); } }, []);
  useEffect(() => aiEnrichmentTraceService.subscribeList(setTraces, (value) => setError(value.message)), []);
  return { traces, error, refresh };
}
