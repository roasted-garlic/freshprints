import type { AllowedVisionModelId } from "../../constants/aiEnrichment.constants";

export interface AiEnrichmentSettingsDocument {
  visionModelId: AllowedVisionModelId;
  promptTemplate: string;
  additionalTagExclusions: string[];
  updatedBy?: string;
}
