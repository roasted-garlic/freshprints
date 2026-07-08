import type { DesignAiAnalysis, DesignAiSuggestions } from "../../../../packages/shared/src/types/ai/aiProcessing.types";
import type { CatalogTag } from "../../../../packages/shared/src/types/catalogTag.types";

export interface AiEnrichmentCategoryOption {
  id: string;
  name: string;
  description?: string;
}

export interface AiEnrichmentInput {
  designId: string;
  /** Import-time placeholder from filename — used for validation only, not as catalog title. */
  uploadFileStem: string;
  previewPath: string;
  previewBytes: Buffer;
  previewContentType?: string;
  promptTemplate: string;
  categoryOptions: AiEnrichmentCategoryOption[];
  categoryNames: string[];
  approvedTags: CatalogTag[];
  approvedTagNames: string[];
  categoryIdsByName: Record<string, string>;
  effectiveTagExclusions: string[];
}

export interface AiEnrichmentResult {
  suggestions: DesignAiSuggestions;
  analysis: DesignAiAnalysis;
}

export interface AiEnrichmentProvider {
  readonly providerId: string;
  readonly modelId: string;
  readonly promptVersion: string;
  enrichDesign(input: AiEnrichmentInput): Promise<AiEnrichmentResult>;
}
