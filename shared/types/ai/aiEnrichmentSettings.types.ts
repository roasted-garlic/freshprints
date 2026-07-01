import type { OpenAiReasoningEffort, OpenAiVisionModelId } from "../../constants/aiEnrichment.constants";

export interface AiEnrichmentSettingsDocument {
  visionModelId: OpenAiVisionModelId;
  reasoningEffort: OpenAiReasoningEffort;
  promptTemplate: string;
  additionalTagExclusions: string[];
  updatedBy?: string;
}
