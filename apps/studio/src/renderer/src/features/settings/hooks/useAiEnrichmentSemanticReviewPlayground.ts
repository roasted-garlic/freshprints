import { useCallback, useEffect, useState } from "react";

import type {
  AiEnrichmentPlaygroundResponse,
  AiEnrichmentSemanticReviewPlaygroundResponse,
} from "@fresh-prints/shared/types/ai/aiEnrichmentPlayground.types";
import { aiEnrichmentSemanticReviewPlaygroundService } from "../services/aiEnrichmentSemanticReviewPlaygroundService";
import {
  canAttemptPass2,
  createInitialPass2State,
  getPlaygroundRunId,
  mapPass1ContextToSemanticReviewRequest,
  markPass2Attempted,
  resetPass2State,
  type AiPlaygroundPass2State,
} from "../utils/aiPlaygroundPass2Flow";

export interface UseAiEnrichmentSemanticReviewPlaygroundResult extends AiPlaygroundPass2State {
  result: AiEnrichmentSemanticReviewPlaygroundResponse | null;
  runReview: () => Promise<void>;
}

export function useAiEnrichmentSemanticReviewPlayground(input: {
  pass1Result: AiEnrichmentPlaygroundResponse | null;
  semanticReviewerModelId: string;
  semanticReviewPlaygroundEnabled: boolean;
}): UseAiEnrichmentSemanticReviewPlaygroundResult {
  const runId = getPlaygroundRunId(input.pass1Result);
  const [state, setState] = useState<AiPlaygroundPass2State>(() =>
    createInitialPass2State(runId),
  );
  const [result, setResult] =
    useState<AiEnrichmentSemanticReviewPlaygroundResponse | null>(null);

  useEffect(() => {
    setState(resetPass2State(runId));
    setResult(null);
  }, [runId, input.semanticReviewPlaygroundEnabled]);

  const runReview = useCallback(async () => {
    const pass1Context = input.pass1Result?.pass1Context;
    if (
      !input.semanticReviewPlaygroundEnabled ||
      !pass1Context ||
      !canAttemptPass2(pass1Context, state)
    ) {
      return;
    }

    // Consume the one attempt before the network call. Failures remain consumed.
    setState((current) => markPass2Attempted(current));

    try {
      const response =
        await aiEnrichmentSemanticReviewPlaygroundService.runReview(
          mapPass1ContextToSemanticReviewRequest({
            context: pass1Context,
            semanticReviewerModelId: input.semanticReviewerModelId,
            pass1TraceId: input.pass1Result?.traceId,
            captureFullTrace: input.pass1Result?.captureFullTrace,
          }),
        );
      setResult(response);
      setState((current) => ({ ...current, isRunning: false, error: null }));
    } catch (cause) {
      setState((current) => ({
        ...current,
        isRunning: false,
        error:
          cause instanceof Error
            ? cause.message
            : "Unable to run Semantic Review.",
      }));
    }
  }, [
    input.pass1Result,
    input.semanticReviewerModelId,
    input.semanticReviewPlaygroundEnabled,
    state,
  ]);

  return { ...state, result, runReview };
}
