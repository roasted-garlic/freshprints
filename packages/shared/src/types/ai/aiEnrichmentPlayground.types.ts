import type {
  AiEnrichmentPlaygroundImageContentType,
  AllowedVisionModelId,
} from "../../constants/aiEnrichment.constants";
import type { CatalogAutomationDecisionResult } from "../../utils/catalogAutomationDecision";
import type { DesignSmartProfile } from "../catalog/smartProfile.types";
import type { VisualContextProfile } from "../catalog/visualContext.types";
import type { SemanticReviewResult } from "../catalog/semanticReview.types";

export type AiEnrichmentProviderId = "google" | "openai" | "development";
export interface AiEnrichmentPlaygroundRequest {
  imageBase64?: string;
  imageContentType?: AiEnrichmentPlaygroundImageContentType;
  prompt: string;
  visionModelId: AllowedVisionModelId;
  captureFullTrace?: boolean;
}

export type AiEnrichmentPlaygroundPass2Eligibility =
  "eligible" | "not_needed" | "blocked_by_objective" | "unavailable";

export interface AiEnrichmentPlaygroundNormalizedResult {
  title: string;
  description: string;
  category: string;
  centralSubject?: string;
  subjects: string[];
  objects: string[];
  styles: string[];
  themes: string[];
  interests: string[];
  professionsGroups: string[];
  occasions: string[];
  places: string[];
  colors: string[];
  visibleText: string[];
  searchConcepts: string[];
  categoryAlternatives: Array<{ name: string; reason?: string }>;
  categoryGapNote?: string;
  visualContextProfile?: VisualContextProfile;
}

/**
 * Bounded, server-built semantic context for the integrated Playground Pass 2 experiment.
 * This deliberately contains no image bytes, provider secrets, or retired Tag AI fields.
 */
export interface AiEnrichmentPlaygroundPass1Context {
  normalized: AiEnrichmentPlaygroundNormalizedResult;
  originalSmartProfile: DesignSmartProfile;
  categoryId?: string;
  categoryName?: string;
  blockers: string[];
  objectiveBlockers: string[];
  semanticBlockers: string[];
  pass2Eligibility: AiEnrichmentPlaygroundPass2Eligibility;
  automationDecision: CatalogAutomationDecisionResult;
  semanticReviewerEnabled: boolean;
}

export interface AiEnrichmentPlaygroundResponse {
  elapsedMs: number;
  outputText: string;
  provider: AiEnrichmentProviderId;
  visionModelId: AllowedVisionModelId;
  version: string;
  promptTokens: number | null;
  completionTokens: number | null;
  estimatedCostUsd: number | null;
  traceId?: string;
  pass1Context: AiEnrichmentPlaygroundPass1Context;
}
export interface AiEnrichmentSemanticReviewPlaygroundRequest {
  visualContextProfile: VisualContextProfile;
  title: string;
  description: string;
  categoryName?: string;
  categoryId?: string;
  originalSmartProfile: DesignSmartProfile;
  effectiveSmartProfile: DesignSmartProfile;
  blockers: string[];
  objectiveBlockers: string[];
  semanticBlockers: string[];
  pass2Eligibility: AiEnrichmentPlaygroundPass2Eligibility;
  /** Client projection of the existing configured setting; the server re-resolves it authoritatively. */
  semanticReviewerModelId?: AllowedVisionModelId;
  /** Historical request name retained for callable compatibility. */
  visionModelId: AllowedVisionModelId;
}
export interface AiEnrichmentSemanticReviewPlaygroundResponse {
  result: SemanticReviewResult;
  promptTokens: number | null;
  completionTokens: number | null;
  estimatedCostUsd: number | null;
  provider: AiEnrichmentProviderId;
  model: string;
  promptVersion: string;
  originalSmartProfile: DesignSmartProfile;
  effectiveSmartProfile: DesignSmartProfile;
  finalAutomationDecision: CatalogAutomationDecisionResult;
  finalObjectiveBlockers: string[];
  finalSemanticBlockers: string[];
}
