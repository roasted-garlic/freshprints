import type { CatalogTag } from "../../../shared/types/catalogTag.types";
import type { ProviderTarget } from "./providers/resolveProviderTarget";

import { estimateVisionCostUsd } from "../../../shared/constants/aiEnrichment.constants";
import { VISION_REQUEST_BASE_DELAY_MS, VISION_REQUEST_MAX_RETRIES } from "./aiEnrichmentConfig";
import { extractJsonObject } from "./simpleCatalogEnrichmentResponse";
import {
  type VisionChatCompletionPayload,
  assertVisionCompletionHasContent,
  extractVisionCompletionUsage,
} from "./visionCompletion";
import { fetchVisionWithRetry } from "./visionRequestRetry";
import { logPipelineEvent } from "../lib/pipelineLog";

/** Prompt version for the optional suggestion-authoring call, independent of the rerank/enrichment prompts. */
export const CATALOG_SUGGESTED_TAG_AUTHOR_PROMPT_VERSION = "catalog-suggested-tag-author-v1";

const SUGGESTED_TAG_AUTHOR_SYSTEM_PROMPT =
  "You are a precise catalog tagging assistant. Follow the instructions exactly and return only valid JSON.";

const MAX_CALIBRATION_EXAMPLES = 4;
const MAX_CALIBRATION_EXAMPLE_ALIASES = 3;
const MAX_ALIASES_PER_SUGGESTION = 5;
const MAX_PREFERRED_WHEN_LENGTH = 300;
const MAX_ALIAS_LENGTH = 40;
const MIN_QUALITY_PREFERRED_WHEN_LENGTH = 20;
const SUGGESTED_TAG_AUTHOR_MAX_COMPLETION_TOKENS = 700;

export type SuggestedTagAuthorFailureReason = "network_error" | "invalid_json" | "empty_output";

export interface CalibrationExampleTag {
  name: string;
  aliases: string[];
  preferredWhen: string;
}

export interface AuthoredSuggestedTag {
  name: string;
  aliases: string[];
  preferredWhen: string;
}

export interface SuggestedTagAuthorInput {
  firstResponse: { title: string; description: string; category: string };
  approvedMatchedTags: string[];
  candidateNames: string[];
  exampleApprovedTags: CalibrationExampleTag[];
}

export interface SuggestedTagAuthorSuccess {
  /** Validated suggestions — always a subset of candidateNames, and only entries the model marked worth suggesting. */
  suggestions: AuthoredSuggestedTag[];
  promptTokens: number | null;
  completionTokens: number | null;
  estimatedCostUsd: number | null;
}

export class SuggestedTagAuthorError extends Error {
  readonly reason: SuggestedTagAuthorFailureReason;

  constructor(message: string, reason: SuggestedTagAuthorFailureReason) {
    super(message);
    this.name = "SuggestedTagAuthorError";
    this.reason = reason;
  }
}

/**
 * Deterministic calibration-example selection (plan §4.2a). Never random, so output/tests stay
 * comparable across runs for the same input.
 *
 * Selection order:
 * 1. Relevant to the current design (name/aliases/preferredWhen overlaps a matched tag or
 *    candidate concept, via simple case-insensitive substring/token check) AND high quality
 *    (2+ aliases, non-generic preferredWhen).
 * 2. Remaining relevant tags regardless of quality.
 * 3. Remaining high-quality tags regardless of relevance, to fill any leftover slots.
 * 4. Stable tie-break: alphabetical by name.
 *
 * Each returned example is reduced to name + up to 3 aliases + preferredWhen only.
 */
export function selectCalibrationExampleTags(
  approvedTags: readonly CatalogTag[],
  context: { matchedTagNames: readonly string[]; candidateNames: readonly string[] },
  maxCount: number = MAX_CALIBRATION_EXAMPLES,
): CalibrationExampleTag[] {
  const RELEVANCE_STOPWORDS = new Set(["and", "the", "of", "a", "an", "to", "in", "on", "or", "use", "when", "is"]);
  const tokenize = (value: string): string[] =>
    value
      .toLowerCase()
      .split(/[^a-z0-9]+/)
      .filter((token) => token.length > 2 && !RELEVANCE_STOPWORDS.has(token));

  const relevanceTokens = new Set(
    [...context.matchedTagNames, ...context.candidateNames].flatMap((term) => tokenize(term)),
  );

  const isRelevant = (tag: CatalogTag): boolean => {
    if (relevanceTokens.size === 0) {
      return false;
    }

    const tagTokens = tokenize([tag.name, ...tag.aliases, tag.preferredWhen].join(" "));
    return tagTokens.some((token) => relevanceTokens.has(token));
  };

  const isHighQuality = (tag: CatalogTag): boolean =>
    tag.aliases.length >= 2 && tag.preferredWhen.trim().length >= MIN_QUALITY_PREFERRED_WHEN_LENGTH;

  const eligible = approvedTags.filter((tag) => tag.status === "approved");
  const byName = (a: CatalogTag, b: CatalogTag): number => a.name.localeCompare(b.name);

  const tierRelevantHighQuality = eligible.filter((tag) => isRelevant(tag) && isHighQuality(tag)).sort(byName);
  const tierRelevantOnly = eligible.filter((tag) => isRelevant(tag) && !isHighQuality(tag)).sort(byName);
  const tierHighQualityOnly = eligible.filter((tag) => !isRelevant(tag) && isHighQuality(tag)).sort(byName);

  const selected: CatalogTag[] = [];
  const selectedNames = new Set<string>();

  for (const tier of [tierRelevantHighQuality, tierRelevantOnly, tierHighQualityOnly]) {
    for (const tag of tier) {
      if (selected.length >= maxCount) {
        break;
      }

      if (!selectedNames.has(tag.name)) {
        selected.push(tag);
        selectedNames.add(tag.name);
      }
    }
  }

  return selected.slice(0, maxCount).map((tag) => ({
    aliases: tag.aliases.slice(0, MAX_CALIBRATION_EXAMPLE_ALIASES),
    name: tag.name,
    preferredWhen: tag.preferredWhen,
  }));
}

/** Shared authoring-instructions text, appended verbatim in both the standalone and merged-call prompts. */
export function buildSuggestedTagAuthorInstructions(input: SuggestedTagAuthorInput): string {
  const exampleJson = JSON.stringify(input.exampleApprovedTags);
  const candidatesJson = JSON.stringify(input.candidateNames);

  return `Examples of existing approved tags, for calibration on style and detail:
${exampleJson}

Candidate concepts that did not match any approved tag or alias:
${candidatesJson}

For each candidate, decide if it is genuinely worth proposing as a new approved tag for this
design. Skip candidates that are redundant with an already-matched tag, too narrow/one-off to
reuse across designs, or not a meaningful searchable concept.

For each candidate worth proposing, write:
- name: the same candidate, reduced to one clean lowercase word if it is a phrase
- aliases: 1 to 3 real alternate search terms someone might use for this concept, matching the
  style of the example aliases above — do not just repeat the candidate phrase
- preferredWhen: one clear, specific sentence describing exactly when staff should use this tag,
  matching the detail level of the example preferredWhen text above — not a generic template

Include a candidate in the output only when it is worth proposing — omit candidates you decided
to skip entirely, do not include them with a "do not suggest" flag.`;
}

function buildStandaloneSuggestedTagAuthorPrompt(input: SuggestedTagAuthorInput): string {
  const firstResponseJson = JSON.stringify(input.firstResponse);
  const approvedMatchedTagsJson = JSON.stringify(input.approvedMatchedTags);

  return `You are writing catalog tag entries for a DTF apparel design database, matching the style and
detail level of existing approved tags.

You are not analyzing the image directly. Use the previous image analysis as your source of truth.

Design context:
${firstResponseJson}

Already-matched approved tags:
${approvedMatchedTagsJson}

${buildSuggestedTagAuthorInstructions(input)}

Return exactly this JSON and nothing else:
{"suggestions": [{"name": "...", "aliases": ["..."], "preferredWhen": "..."}]}`;
}

/** Text-only request body — deliberately has no image_url content part. */
export function buildSuggestedTagAuthorRequestBody(
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
        content: SUGGESTED_TAG_AUTHOR_SYSTEM_PROMPT,
      },
      {
        role: "user",
        content: userPromptText,
      },
    ],
  });
}

async function requestSuggestedTagAuthorCompletion(
  apiKey: string,
  baseUrl: string,
  visionModelId: string,
  userPromptText: string,
  logContext: { designId: string; providerId: string },
): Promise<VisionChatCompletionPayload> {
  const requestStartedAtMs = Date.now();

  logPipelineEvent("suggestion_author.request.started", {
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
        body: buildSuggestedTagAuthorRequestBody(
          visionModelId,
          userPromptText,
          SUGGESTED_TAG_AUTHOR_MAX_COMPLETION_TOKENS,
        ),
      },
      { maxRetries: VISION_REQUEST_MAX_RETRIES, baseDelayMs: VISION_REQUEST_BASE_DELAY_MS, modelId: visionModelId },
    );
  } catch (error) {
    throw new SuggestedTagAuthorError(
      error instanceof Error ? error.message : "Suggestion authoring request failed.",
      "network_error",
    );
  }

  const payload = (await response.json()) as VisionChatCompletionPayload;
  const durationMs = Date.now() - requestStartedAtMs;
  const usage = extractVisionCompletionUsage(payload);

  logPipelineEvent("suggestion_author.request.completed", {
    designId: logContext.designId,
    providerId: logContext.providerId,
    model: visionModelId,
    promptTokens: usage.promptTokens,
    completionTokens: usage.completionTokens,
    durationMs,
  });

  return payload;
}

function sanitizeAlias(value: unknown, name: string): string | null {
  if (typeof value !== "string") {
    return null;
  }

  const trimmed = value.trim().toLowerCase().slice(0, MAX_ALIAS_LENGTH);
  return trimmed && trimmed !== name && !trimmed.includes("/") ? trimmed : null;
}

/**
 * Validate the authoring call's raw suggestions against the original candidate list. A candidate
 * name outside the original list is dropped entirely — the model cannot invent a suggestion for a
 * concept it wasn't given. Shared by both the standalone and merged-call response paths.
 */
export function validateAuthoredSuggestions(
  rawSuggestions: unknown,
  candidateNames: readonly string[],
): AuthoredSuggestedTag[] {
  if (!Array.isArray(rawSuggestions)) {
    return [];
  }

  const allowedNames = new Set(candidateNames.map((name) => name.trim().toLowerCase()));
  const validated: AuthoredSuggestedTag[] = [];
  const seen = new Set<string>();

  for (const rawSuggestion of rawSuggestions) {
    if (!rawSuggestion || typeof rawSuggestion !== "object") {
      continue;
    }

    const candidate = rawSuggestion as Record<string, unknown>;
    const name = typeof candidate.name === "string" ? candidate.name.trim().toLowerCase() : "";

    if (!name || name.length > 40 || name.includes("/") || name.includes(" ")) {
      continue;
    }

    if (!allowedNames.has(name) || seen.has(name)) {
      continue;
    }

    const preferredWhen =
      typeof candidate.preferredWhen === "string"
        ? candidate.preferredWhen.trim().slice(0, MAX_PREFERRED_WHEN_LENGTH)
        : "";

    if (!preferredWhen) {
      continue;
    }

    const aliases = Array.isArray(candidate.aliases)
      ? [
          ...new Set(
            candidate.aliases
              .map((alias) => sanitizeAlias(alias, name))
              .filter((alias): alias is string => Boolean(alias)),
          ),
        ].slice(0, MAX_ALIASES_PER_SUGGESTION)
      : [];

    validated.push({ aliases, name, preferredWhen });
    seen.add(name);
  }

  return validated;
}

/**
 * Standalone text-only suggestion-authoring call, used when the tag-rerank call is off or not
 * triggered for this design but suggestions are still needed (last-resort gate fired). Never
 * receives the image or the full approved tag database — only the calibration example set.
 */
export async function callSuggestedTagAuthorStandalone(
  apiKey: string,
  providerTarget: ProviderTarget,
  visionModelId: string,
  input: SuggestedTagAuthorInput,
  logContext: { designId: string },
): Promise<SuggestedTagAuthorSuccess> {
  const userPromptText = buildStandaloneSuggestedTagAuthorPrompt(input);

  const payload = await requestSuggestedTagAuthorCompletion(
    apiKey,
    providerTarget.baseUrl,
    visionModelId,
    userPromptText,
    { designId: logContext.designId, providerId: providerTarget.providerId },
  );

  const usage = extractVisionCompletionUsage(payload);
  const estimatedCostUsd = estimateVisionCostUsd(visionModelId, usage.promptTokens, usage.completionTokens);

  let content: string;

  try {
    content = assertVisionCompletionHasContent(payload);
  } catch {
    throw new SuggestedTagAuthorError("Suggestion authoring returned no output.", "empty_output");
  }

  const raw = extractJsonObject(content);

  if (Object.keys(raw).length === 0) {
    throw new SuggestedTagAuthorError("Suggestion authoring returned unparseable output.", "invalid_json");
  }

  const suggestions = validateAuthoredSuggestions(raw.suggestions, input.candidateNames);

  return {
    completionTokens: usage.completionTokens,
    estimatedCostUsd,
    promptTokens: usage.promptTokens,
    suggestions,
  };
}
