import { useCallback, useState } from "react";

import type { AllowedVisionModelId } from "@fresh-prints/shared/constants/aiEnrichment.constants";
import type { AiEnrichmentTagRerankPlaygroundResponse } from "@fresh-prints/shared/types/ai/aiEnrichmentPlayground.types";
import { aiEnrichmentTagRerankPlaygroundService } from "../services/aiEnrichmentTagRerankPlaygroundService";

export interface UseAiEnrichmentTagRerankPlaygroundResult {
  error: string | null;
  isRunning: boolean;
  result: AiEnrichmentTagRerankPlaygroundResponse | null;
  reset: () => void;
  runTagRerank: (
    firstResponseOutputText: string,
    visionModelId: AllowedVisionModelId,
    promptTemplate?: string,
  ) => Promise<void>;
}

export function useAiEnrichmentTagRerankPlayground(): UseAiEnrichmentTagRerankPlaygroundResult {
  const [result, setResult] = useState<AiEnrichmentTagRerankPlaygroundResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isRunning, setIsRunning] = useState(false);

  const reset = useCallback(() => {
    setResult(null);
    setError(null);
  }, []);

  const runTagRerank = useCallback(
    async (
      firstResponseOutputText: string,
      visionModelId: AllowedVisionModelId,
      promptTemplate?: string,
    ) => {
      setIsRunning(true);
      setError(null);
      setResult(null);

      try {
        const response = await aiEnrichmentTagRerankPlaygroundService.runTagRerank({
          firstResponseOutputText,
          promptTemplate,
          visionModelId,
        });
        setResult(response);
      } catch (rerankError) {
        setError(
          rerankError instanceof Error ? rerankError.message : "Unable to run the tag rerank request.",
        );
      } finally {
        setIsRunning(false);
      }
    },
    [],
  );

  return { error, isRunning, reset, result, runTagRerank };
}
