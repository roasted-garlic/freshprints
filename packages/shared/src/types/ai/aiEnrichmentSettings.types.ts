import type { AllowedVisionModelId } from "../../constants/aiEnrichment.constants";
import type { CatalogWorkflowMode } from "../../constants/catalogWorkflowMode.constants";

/**
 * Firestore `settings/aiEnrichment` document shape.
 * Client writes are denied; updates go through Admin callables.
 */
export interface AiEnrichmentSettingsDocument {
  visionModelId: AllowedVisionModelId;
  promptTemplate: string;
  tagRerankPromptTemplate?: string;
  additionalTagExclusions: string[];
  tagRerankMode?: string;
  suggestionAuthorMode?: string;
  suggestedNewTagsPolicy?: string;
  /** Slice 4 — Catalog Processing Mode. Absent → Manual. */
  catalogWorkflowMode?: CatalogWorkflowMode;
  /** Slice 4 — live Autonomous publication gate. Default false. */
  catalogAutonomousLiveEnabled?: boolean;
  catalogAutonomousLiveEnabledAt?: unknown;
  catalogAutonomousLiveEnabledBy?: string;
  updatedBy?: string;
  updatedAt?: unknown;
}
