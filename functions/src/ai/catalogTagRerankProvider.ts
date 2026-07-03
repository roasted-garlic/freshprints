import type { ApprovedTagCandidate } from "./catalogTagResolver";
import type { ProviderTarget } from "./providers/resolveProviderTarget";
import type { AuthoredSuggestedTag, SuggestedTagAuthorInput } from "./catalogSuggestedTagAuthorProvider";

import { CATALOG_TAG_RERANK_PROMPT_VERSION } from "./catalogTitleRules";
import {
  estimateVisionCostUsd,
  resolveTagRerankPromptTemplate,
} from "../../../shared/constants/aiEnrichment.constants";
import { VISION_REQUEST_BASE_DELAY_MS, VISION_REQUEST_MAX_RETRIES } from "./aiEnrichmentConfig";
import { extractJsonObject } from "./simpleCatalogEnrichmentResponse";
import { buildSuggestedTagAuthorInstructions, validateAuthoredSuggestions } from "./catalogSuggestedTagAuthorProvider";
import {
  type VisionChatCompletionPayload,
  assertVisionCompletionHasContent,
  extractVisionCompletionUsage,
} from "./visionCompletion";
import { fetchVisionWithRetry } from "./visionRequestRetry";
import { logPipelineEvent } from "../lib/pipelineLog";

const CATALOG_TAG_RERANK_SYSTEM_PROMPT =
  "You are a precise catalog tagging assistant. Follow the instructions exactly and return only valid JSON.";

/** Max uncoveredConcepts strings kept from the reranker response. */
const MAX_UNCOVERED_CONCEPTS = 5;
const MAX_UNCOVERED_CONCEPT_LENGTH = 60;

export type TagRerankFailureReason = "network_error" | "invalid_json" | "empty_output" | "all_tags_invalid";

export interface CatalogTagRerankInput {
  firstResponse: { title: string; description: string; category: string; tags: string[] };
  resolvedCategoryName: string | undefined;
  approvedTagCandidates: ApprovedTagCandidate[];
  /**
   * Set only when the suggested-tags last-resort gate also fired for this design and
   * suggestionAuthorMode is enabled — merges suggestion-authoring into this same call instead of
   * making a second request. See plan §2.4/§4.2.
   */
  suggestionAuthorInput?: Pick<SuggestedTagAuthorInput, "candidateNames" | "exampleApprovedTags">;
  /**
   * Owner-editable instructional "Rules" text for the reranker. Falls back to
   * DEFAULT_TAG_RERANK_PROMPT_TEMPLATE when absent — see that constant's doc comment for why only
   * the rules section (not the data sections) is templated.
   */
  promptTemplate?: string;
}

export interface CatalogTagRerankSuccess {
  /** Validated tags — always a subset of approvedTagCandidates[].name. May be empty if none were valid. */
  tags: string[];
  /** Tags the model returned that were not in approvedTagCandidates and were discarded. */
  discardedTags: string[];
  uncoveredConcepts: string[];
  promptTokens: number | null;
  completionTokens: number | null;
  estimatedCostUsd: number | null;
  /** Present only when input.suggestionAuthorInput was provided — the merged call's authored suggestions. */
  authoredSuggestions: AuthoredSuggestedTag[] | undefined;
}

export class TagRerankError extends Error {
  readonly reason: TagRerankFailureReason;

  constructor(message: string, reason: TagRerankFailureReason) {
    super(message);
    this.name = "TagRerankError";
    this.reason = reason;
  }
}

export function buildCatalogTagRerankUserPrompt(input: CatalogTagRerankInput): string {
  const firstResponseJson = JSON.stringify(input.firstResponse);
  const resolvedCategory = input.resolvedCategoryName ?? input.firstResponse.category ?? "";
  const approvedTagCandidatesJson = JSON.stringify(
    input.approvedTagCandidates.map((candidate) => ({
      matchedBy: candidate.matchedBy,
      name: candidate.name,
      reason: candidate.reason,
    })),
  );

  const suggestionAuthorSection = input.suggestionAuthorInput
    ? `\n\nYou also have a second task this turn: authoring new tag suggestions for candidates that\ndid not match any approved tag. This is independent of the tag choice above.\n\n${buildSuggestedTagAuthorInstructions({
        approvedMatchedTags: [],
        candidateNames: input.suggestionAuthorInput.candidateNames,
        exampleApprovedTags: input.suggestionAuthorInput.exampleApprovedTags,
        firstResponse: input.firstResponse,
      })}`
    : "";

  const responseShape = input.suggestionAuthorInput
    ? `{"tags": ["approvedtag"], "uncoveredConcepts": ["concept not covered"], "suggestions": [{"name": "...", "aliases": ["..."], "preferredWhen": "..."}]}`
    : `{"tags": ["approvedtag"], "uncoveredConcepts": ["concept not covered"]}`;

  const rules = resolveTagRerankPromptTemplate(input.promptTemplate);

  return `You are choosing the best final approved catalog tags for a DTF design.

You are not analyzing the image directly. Use the previous image analysis as your source of truth.

Previous image analysis:
${firstResponseJson}

Resolved category:
${resolvedCategory}

Approved tag candidates:
${approvedTagCandidatesJson}

Task:
Choose the best final tags from the approved tag candidates only.

Rules:
${rules}${suggestionAuthorSection}

Return exactly this JSON and nothing else:
${responseShape}`;
}

/** Text-only request body — deliberately has no image_url content part. */
export function buildCatalogTagRerankRequestBody(
  visionModelId: string,
  userPromptText: string,
  maxCompletionTokens: number,
): string {
  return JSON.stringify({
    model: visionModelId,
    max_completion_tokens: maxCompletionTokens,
    messages: [
      {
        role: "system",
        content: CATALOG_TAG_RERANK_SYSTEM_PROMPT,
      },
      {
        role: "user",
        content: userPromptText,
      },
    ],
  });
}

const TAG_RERANK_MAX_COMPLETION_TOKENS = 500;
/** Higher budget when the merged call also authors suggestions (free-text preferredWhen/aliases per candidate). */
const TAG_RERANK_WITH_SUGGESTIONS_MAX_COMPLETION_TOKENS = 1000;

async function requestCatalogTagRerankCompletion(
  apiKey: string,
  baseUrl: string,
  visionModelId: string,
  userPromptText: string,
  maxCompletionTokens: number,
  logContext: { designId: string; providerId: string },
): Promise<VisionChatCompletionPayload> {
  const requestStartedAtMs = Date.now();

  logPipelineEvent("tag_rerank.request.started", {
    designId: logContext.designId,
    providerId: logContext.providerId,
    model: visionModelId,
  });

  let response: Response;

  try {
    response = await fetchVisionWithRetry(
      baseUrl,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: buildCatalogTagRerankRequestBody(
          visionModelId,
          userPromptText,
          maxCompletionTokens,
        ),
      },
      { maxRetries: VISION_REQUEST_MAX_RETRIES, baseDelayMs: VISION_REQUEST_BASE_DELAY_MS, modelId: visionModelId },
    );
  } catch (error) {
    throw new TagRerankError(
      error instanceof Error ? error.message : "Tag rerank request failed.",
      "network_error",
    );
  }

  const payload = (await response.json()) as VisionChatCompletionPayload;
  const durationMs = Date.now() - requestStartedAtMs;
  const usage = extractVisionCompletionUsage(payload);

  logPipelineEvent("tag_rerank.request.completed", {
    designId: logContext.designId,
    providerId: logContext.providerId,
    model: visionModelId,
    promptTokens: usage.promptTokens,
    completionTokens: usage.completionTokens,
    durationMs,
  });

  return payload;
}

function sanitizeUncoveredConcept(value: unknown): string | null {
  if (typeof value !== "string") {
    return null;
  }

  const trimmed = value.trim().toLowerCase().slice(0, MAX_UNCOVERED_CONCEPT_LENGTH);
  return trimmed || null;
}

/**
 * Validate the reranker's raw tag output against the approved shortlist. Tags outside
 * approvedTagCandidates are discarded individually — a mix of valid and invalid tags is not a
 * whole-response failure as long as at least one valid tag survives (review note 5).
 */
export function validateTagRerankTags(
  rawTags: unknown,
  approvedTagCandidates: readonly ApprovedTagCandidate[],
): { validTags: string[]; discardedTags: string[] } {
  const approvedNames = new Set(approvedTagCandidates.map((candidate) => candidate.name));
  const validTags: string[] = [];
  const discardedTags: string[] = [];
  const seen = new Set<string>();

  if (!Array.isArray(rawTags)) {
    return { discardedTags, validTags };
  }

  for (const rawTag of rawTags) {
    if (typeof rawTag !== "string") {
      continue;
    }

    const trimmed = rawTag.trim().toLowerCase();

    if (!trimmed || seen.has(trimmed)) {
      continue;
    }

    seen.add(trimmed);

    if (approvedNames.has(trimmed)) {
      validTags.push(trimmed);
    } else {
      discardedTags.push(trimmed);
    }
  }

  return { discardedTags, validTags };
}

export async function callTagRerank(
  apiKey: string,
  providerTarget: ProviderTarget,
  visionModelId: string,
  input: CatalogTagRerankInput,
  logContext: { designId: string },
): Promise<CatalogTagRerankSuccess> {
  const userPromptText = buildCatalogTagRerankUserPrompt(input);
  const maxCompletionTokens = input.suggestionAuthorInput
    ? TAG_RERANK_WITH_SUGGESTIONS_MAX_COMPLETION_TOKENS
    : TAG_RERANK_MAX_COMPLETION_TOKENS;

  const payload = await requestCatalogTagRerankCompletion(
    apiKey,
    providerTarget.baseUrl,
    visionModelId,
    userPromptText,
    maxCompletionTokens,
    { designId: logContext.designId, providerId: providerTarget.providerId },
  );

  const usage = extractVisionCompletionUsage(payload);
  const estimatedCostUsd = estimateVisionCostUsd(visionModelId, usage.promptTokens, usage.completionTokens);

  let content: string;

  try {
    content = assertVisionCompletionHasContent(payload);
  } catch {
    throw new TagRerankError("Tag rerank returned no output.", "empty_output");
  }

  const raw = extractJsonObject(content);

  if (Object.keys(raw).length === 0) {
    throw new TagRerankError("Tag rerank returned unparseable output.", "invalid_json");
  }

  const { validTags, discardedTags } = validateTagRerankTags(raw.tags, input.approvedTagCandidates);

  if (validTags.length === 0) {
    throw new TagRerankError("Tag rerank returned no valid approved tags.", "all_tags_invalid");
  }

  const uncoveredConcepts = Array.isArray(raw.uncoveredConcepts)
    ? raw.uncoveredConcepts
        .map(sanitizeUncoveredConcept)
        .filter((value): value is string => Boolean(value))
        .slice(0, MAX_UNCOVERED_CONCEPTS)
    : [];

  // A failure/absence in the suggestions half of the response never invalidates the rerank half —
  // validateAuthoredSuggestions safely returns [] for missing/malformed input, and this call
  // still succeeds with tags/uncoveredConcepts populated (see plan §4.3 independent-failure note).
  const authoredSuggestions = input.suggestionAuthorInput
    ? validateAuthoredSuggestions(raw.suggestions, input.suggestionAuthorInput.candidateNames)
    : undefined;

  return {
    authoredSuggestions,
    discardedTags,
    estimatedCostUsd,
    promptTokens: usage.promptTokens,
    completionTokens: usage.completionTokens,
    tags: validTags,
    uncoveredConcepts,
  };
}

export { CATALOG_TAG_RERANK_PROMPT_VERSION };
