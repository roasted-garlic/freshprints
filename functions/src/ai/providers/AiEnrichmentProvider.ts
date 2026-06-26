import type { DesignAiAnalysis, DesignAiSuggestions } from "../../../../shared/types/ai/aiProcessing.types";

export interface AiEnrichmentInput {
  designId: string;
  /** Import-time placeholder from filename — used for validation only, not as catalog title. */
  uploadFileStem: string;
  previewPath: string;
  previewBytes: Buffer;
  previewContentType?: string;
  categoryNames: string[];
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
