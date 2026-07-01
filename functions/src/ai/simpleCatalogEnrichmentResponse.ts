import type { DesignAiAnalysis, DesignAiSuggestions } from "../../../shared/types/ai/aiProcessing.types";
import type { SuggestedNewTag } from "../../../shared/types/catalogTag.types";
import type { AiEnrichmentInput, AiEnrichmentResult } from "./providers/AiEnrichmentProvider";

import {
  OPENAI_SIMPLE_ENRICHMENT_MAX_SUGGESTED_TAGS,
  OPENAI_SIMPLE_ENRICHMENT_MAX_TAGS,
} from "./aiEnrichmentConfig";
import { estimateVisionCostUsd } from "../../../shared/constants/aiEnrichment.constants";
import {
  OPENAI_CATALOG_ENRICHMENT_PROMPT_VERSION,
  normalizeAiTags,
  resolveLeanCatalogTitle,
  sanitizeCatalogDescription,
} from "./catalogTitleRules";

export interface SimpleCatalogEnrichmentParsed {
  category: string;
  description: string;
  suggestedNewTags: SuggestedNewTag[];
  title: string;
  tags: string[];
  /**
   * Raw model tag strings (lightly cleaned, not tokenized into single words). Multi-word
   * tags/aliases like "rock and roll" are preserved so the catalog tag resolver can match
   * them against approved names and aliases before falling back to suggestions.
   */
  rawTags: string[];
}

/**
 * Extract a JSON object from a model response that may include code fences or surrounding prose.
 * Returns the parsed object, or an empty object when nothing parseable is found. This replaces the
 * guarantees previously provided by `response_format: json_object`, which the v17 request drops to
 * match the lightweight Settings AI Playground request shape.
 */
export function extractJsonObject(raw: string): Record<string, unknown> {
  const trimmed = raw.trim();

  const tryParse = (candidate: string): Record<string, unknown> | null => {
    try {
      const parsed = JSON.parse(candidate) as unknown;
      return parsed && typeof parsed === "object" && !Array.isArray(parsed)
        ? (parsed as Record<string, unknown>)
        : null;
    } catch {
      return null;
    }
  };

  const direct = tryParse(trimmed);
  if (direct) {
    return direct;
  }

  // Strip a single ```json ... ``` (or ``` ... ```) fence if present.
  const fenceMatch = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fenceMatch?.[1]) {
    const fromFence = tryParse(fenceMatch[1].trim());
    if (fromFence) {
      return fromFence;
    }
  }

  // Fall back to the first balanced-looking {...} block.
  const firstBrace = trimmed.indexOf("{");
  const lastBrace = trimmed.lastIndexOf("}");
  if (firstBrace >= 0 && lastBrace > firstBrace) {
    const fromBlock = tryParse(trimmed.slice(firstBrace, lastBrace + 1));
    if (fromBlock) {
      return fromBlock;
    }
  }

  return {};
}

function coerceString(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function assertRequiredField(value: string, fieldName: string): void {
  if (!value) {
    throw new Error(`AI response is missing required field: ${fieldName}.`);
  }
}

function normalizeSuggestedTagName(value: unknown): string {
  if (typeof value !== "string") {
    return "";
  }

  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function normalizeSuggestedAlias(value: unknown): string {
  if (typeof value !== "string") {
    return "";
  }

  return value
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ");
}

function isSingleWordTagName(value: string): boolean {
  return Boolean(value) && value.length <= 40 && !value.includes(" ") && !value.includes("/");
}

function normalizeSuggestedNewTags(value: unknown): SuggestedNewTag[] {
  if (!Array.isArray(value)) {
    return [];
  }

  const result: SuggestedNewTag[] = [];
  const seen = new Set<string>();

  for (const item of value) {
    if (!item || typeof item !== "object" || Array.isArray(item)) {
      continue;
    }

    const record = item as Record<string, unknown>;
    const name = normalizeSuggestedTagName(record.name);
    const preferredWhen = coerceString(record.preferredWhen);

    if (!isSingleWordTagName(name) || !preferredWhen || seen.has(name)) {
      continue;
    }

    const aliases = Array.isArray(record.aliases)
      ? [
          ...new Set(
            record.aliases
              .map(normalizeSuggestedAlias)
              .filter((alias) => alias && alias !== name && alias.length <= 40 && !alias.includes("/")),
          ),
        ]
      : [];

    result.push({
      aliases,
      name,
      preferredWhen,
      reason: coerceString(record.reason) || "AI did not find a sufficiently relevant approved tag.",
      source: "ai",
    });
    seen.add(name);

    if (result.length >= OPENAI_SIMPLE_ENRICHMENT_MAX_SUGGESTED_TAGS) {
      break;
    }
  }

  return result;
}

/**
 * Lightly clean the model's raw tag strings without tokenizing them into single words.
 * Preserves multi-word tags/aliases (e.g. "rock and roll") so the downstream catalog tag
 * resolver can match them against approved tag names and aliases. Trims, lowercases, collapses
 * internal whitespace, dedupes, and drops empty or overly long entries.
 */
function normalizeRawAiTags(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return [];
  }

  const result: string[] = [];
  const seen = new Set<string>();

  for (const item of value) {
    if (typeof item !== "string") {
      continue;
    }

    const normalized = item.trim().replace(/\s+/g, " ").toLowerCase();

    if (!normalized || normalized.length > 40 || normalized.includes("/") || seen.has(normalized)) {
      continue;
    }

    result.push(normalized);
    seen.add(normalized);
  }

  return result;
}

/**
 * Normalize the raw simple-contract JSON. Tag normalization enforces single words, lowercase,
 * dedupe, generic-word and exclusion filtering, and the tag cap.
 */
export function normalizeSimpleCatalogEnrichment(
  raw: Record<string, unknown>,
  effectiveTagExclusions: readonly string[],
): SimpleCatalogEnrichmentParsed {
  const category = coerceString(raw.category);
  const description = coerceString(raw.description);
  const title = coerceString(raw.title);
  const tags = normalizeAiTags(
    raw.tags,
    undefined,
    OPENAI_SIMPLE_ENRICHMENT_MAX_TAGS,
    effectiveTagExclusions,
  );
  const rawTags = normalizeRawAiTags(raw.tags);

  assertRequiredField(description, "description");
  assertRequiredField(category, "category");
  assertRequiredField(title, "title");

  if (!Array.isArray(raw.tags)) {
    throw new Error("AI response is missing required field: tags.");
  }

  return {
    category,
    description,
    suggestedNewTags: normalizeSuggestedNewTags(raw.suggestedNewTags),
    title,
    tags,
    rawTags,
  };
}

/**
 * Map the normalized simple response into the existing AiEnrichmentResult shape.
 */
export function buildSimpleCatalogEnrichmentResult(input: {
  parsed: SimpleCatalogEnrichmentParsed;
  enrichmentInput: AiEnrichmentInput;
  modelId: string;
  providerId?: string;
  promptTokens?: number | null;
  completionTokens?: number | null;
}): AiEnrichmentResult {
  const { parsed, enrichmentInput, modelId, providerId, promptTokens, completionTokens } = input;

  // v17 lean schema: trust the model's title. Only normalize non-destructively and fall back to
  // tags (never the description) when the model title is empty/filename-like/generic. This avoids
  // collapsing a good title into an OCR fragment derived from the transcribed-quote description.
  const title = resolveLeanCatalogTitle({
    candidateTitle: parsed.title,
    tags: parsed.tags,
    uploadFileStem: enrichmentInput.uploadFileStem,
  });

  // Preserve the model's description. It is required-non-empty by normalizeSimpleCatalogEnrichment,
  // so only scrub canvas phrases and cap length — no synthesis, which cannot reconstruct full
  // visible text from the lean schema.
  const description = sanitizeCatalogDescription(parsed.description).slice(0, 500);

  const estimatedCostUsd =
    promptTokens != null && completionTokens != null
      ? estimateVisionCostUsd(modelId, promptTokens, completionTokens)
      : null;

  // Category is not resolved here. The v18 lean prompt no longer gives the model the approved
  // category list, so parsed.category is a freeform raw candidate — not a value that can be
  // trusted or persisted directly. It is carried on analysis.rawCategory (transient, deleted
  // before the design write, same as rawTags) purely as a scoring signal; the pipeline's
  // server-side resolveThemeCategory call (run after tag resolution, using matched tags as an
  // additional signal) sets the final categoryId/categoryName, or leaves both undefined when no
  // approved category clears the confidence threshold.
  const suggestions: DesignAiSuggestions = {
    title,
    description,
    suggestedNewTags: parsed.suggestedNewTags.length > 0 ? parsed.suggestedNewTags : undefined,
    tags: parsed.tags,
    provider: providerId ?? "openai",
    model: modelId,
    promptVersion: OPENAI_CATALOG_ENRICHMENT_PROMPT_VERSION,
    generatedAt: new Date().toISOString(),
    promptTokens: promptTokens ?? null,
    completionTokens: completionTokens ?? null,
    estimatedCostUsd,
  };

  const analysis: DesignAiAnalysis = {
    rawCategory: parsed.category || undefined,
    rawTags: parsed.rawTags.length > 0 ? parsed.rawTags : undefined,
  };

  return { suggestions, analysis };
}
