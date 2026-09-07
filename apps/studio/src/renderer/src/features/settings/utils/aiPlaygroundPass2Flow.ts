import type {
  AiEnrichmentPlaygroundPass1Context,
  AiEnrichmentPlaygroundResponse,
  AiEnrichmentSemanticReviewPlaygroundRequest,
} from "@fresh-prints/shared/types/ai/aiEnrichmentPlayground.types";
import { resolveClientVisionModelId } from "../constants/aiEnrichmentSettingsConstants";

export interface AiPlaygroundPass2State {
  runId: string | null;
  attempted: boolean;
  isRunning: boolean;
  error: string | null;
}

export function getPlaygroundRunId(
  result: AiEnrichmentPlaygroundResponse | null,
): string | null {
  if (!result) {
    return null;
  }

  return result.traceId ?? `${result.version}:${result.outputText}`;
}

export function createInitialPass2State(
  runId: string | null = null,
): AiPlaygroundPass2State {
  return { runId, attempted: false, isRunning: false, error: null };
}

export function resetPass2State(runId: string | null): AiPlaygroundPass2State {
  return createInitialPass2State(runId);
}

export function markPass2Attempted(
  state: AiPlaygroundPass2State,
): AiPlaygroundPass2State {
  return { ...state, attempted: true, isRunning: true, error: null };
}

export function canAttemptPass2(
  context: AiEnrichmentPlaygroundPass1Context | undefined,
  state: AiPlaygroundPass2State,
): boolean {
  return Boolean(
    context &&
    context.pass2Eligibility === "eligible" &&
    !state.attempted &&
    !state.isRunning,
  );
}

function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

/** Map the server-built Pass 1 DTO directly to the existing text-only Pass 2 callable contract. */
export function mapPass1ContextToSemanticReviewRequest(input: {
  context: AiEnrichmentPlaygroundPass1Context;
  semanticReviewerModelId: string;
  pass1TraceId?: string;
  captureFullTrace?: boolean;
}): AiEnrichmentSemanticReviewPlaygroundRequest {
  const context = input.context;
  const modelId = resolveClientVisionModelId(input.semanticReviewerModelId);
  const originalSmartProfile = clone(context.originalSmartProfile);

  return {
    visualContextProfile: clone(context.normalized.visualContextProfile!),
    title: context.normalized.title,
    description: context.normalized.description,
    categoryId: context.categoryId,
    categoryName: context.categoryName,
    originalSmartProfile,
    effectiveSmartProfile: clone(originalSmartProfile),
    blockers: [...context.blockers],
    objectiveBlockers: [...context.objectiveBlockers],
    semanticBlockers: [...context.semanticBlockers],
    pass2Eligibility: context.pass2Eligibility,
    semanticReviewerModelId: modelId,
    // Kept for the existing callable contract; the backend resolves the configured value.
    visionModelId: modelId,
    pass1TraceId: input.pass1TraceId,
    captureFullTrace: input.captureFullTrace,
  };
}

export function formatCombinedAiCost(
  pass1Cost: number | null | undefined,
  pass2Cost: number | null | undefined,
): string {
  if (pass1Cost == null || pass2Cost == null) {
    return "N/A";
  }

  return `$${(pass1Cost + pass2Cost).toFixed(6)}`;
}
