import type {
  DesignAiAnalysis,
  DesignAiSuggestions,
} from "../../../packages/shared/src/types/ai/aiProcessing.types";
import type {
  AiEnrichmentInput,
  AiEnrichmentResult,
} from "./providers/AiEnrichmentProvider";

import { estimateVisionCostUsd } from "../../../packages/shared/src/constants/aiEnrichment.constants";
import { sanitizeMeaningfulVisibleTextPhrases } from "../../../packages/shared/src/utils/visibleTextQuality";
import {
  CATALOG_ENRICHMENT_PROMPT_VERSION,
  acceptCanonicalCatalogCopy,
} from "./catalogTitleRules";
import {
  VISUAL_CONTEXT_ALIAS_MAX,
  VISUAL_CONTEXT_ARRAY_MAX,
  VISUAL_CONTEXT_DETAILED_MAX,
  VISUAL_CONTEXT_LINE_MAX,
  VISUAL_CONTEXT_STRING_MAX,
  VISUAL_CONTEXT_SUMMARY_MAX,
  VISUAL_CONTEXT_VERSION,
  type VisualContextProfile,
} from "../../../packages/shared/src/types/catalog/visualContext.types";

export interface SimpleCatalogEnrichmentParsed {
  category: string;
  description: string;
  title: string;
  /**
   * Transient central non-text subject phrase (not persisted on aiSuggestions).
   */
  centralSubject?: string;
  /** Smart Profile dimensions from v27+ prompt (optional for backward-compatible parses). */
  subjects?: string[];
  objects?: string[];
  styles?: string[];
  themes?: string[];
  interests?: string[];
  professionsGroups?: string[];
  occasions?: string[];
  places?: string[];
  colors?: string[];
  visibleText?: string[];
  searchConcepts?: string[];
  categoryAlternatives?: Array<{ name: string; reason?: string }>;
  categoryGapNote?: string;
  visualContextProfile?: VisualContextProfile;

  /** @deprecated Accepted only by historical unit fixtures; never emitted by the v39 parser. */
  tags?: string[];
  /** @deprecated Accepted only by historical unit fixtures; never emitted by the v39 parser. */
  rawTags?: string[];
  /** @deprecated Accepted only by historical unit fixtures; never emitted by the v39 parser. */
  suggestedNewTags?: unknown[];
  /** @deprecated Bounded one-way compatibility read; visibleText is canonical. */
  readableTextLines?: string[];
}

function normalizeVisualContextProfile(
  value: unknown,
): VisualContextProfile | undefined {
  if (!value || typeof value !== "object" || Array.isArray(value))
    return undefined;
  const raw = value as Record<string, unknown>;
  const summary = coerceString(raw.summary).slice(
    0,
    VISUAL_CONTEXT_SUMMARY_MAX,
  );
  const detailedDescription = coerceString(raw.detailedDescription).slice(
    0,
    VISUAL_CONTEXT_DETAILED_MAX,
  );
  if (
    !summary ||
    !detailedDescription ||
    raw.version !== VISUAL_CONTEXT_VERSION
  )
    return undefined;
  const profile: VisualContextProfile = {
    version: VISUAL_CONTEXT_VERSION,
    summary,
    detailedDescription,
  };
  const arrays = [
    "peopleCharacters",
    "animals",
    "objects",
    "readableArtworkText",
    "symbols",
    "colors",
    "themesInterests",
    "professionsGroups",
    "occasions",
    "semanticAliases",
    "uncertainties",
  ] as const;
  for (const field of arrays) {
    const max =
      field === "semanticAliases"
        ? VISUAL_CONTEXT_ALIAS_MAX
        : VISUAL_CONTEXT_ARRAY_MAX;
    const values = normalizeStringArray(raw[field], max)?.map((item) =>
      item.slice(0, VISUAL_CONTEXT_LINE_MAX),
    );
    if (values?.length) profile[field] = values;
  }
  const strings = [
    "appearance",
    "posesActions",
    "relationships",
    "setting",
    "styleComposition",
    "visualJokeOrStory",
  ] as const;
  for (const field of strings) {
    const value = coerceString(raw[field]).slice(0, VISUAL_CONTEXT_STRING_MAX);
    if (value) profile[field] = value;
  }
  return profile;
}

/**
 * Extract a JSON object from a model response that may include code fences or surrounding prose.
 * Returns the parsed object, or an empty object when nothing parseable is found. This replaces the
 * The provider now requests the canonical structured-output schema, but extraction remains
 * defensive because the parser is still the server-side source of truth.
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

function normalizeReadableTextLines(value: unknown): string[] | undefined {
  if (!Array.isArray(value)) {
    return undefined;
  }

  const lines = value
    .filter((item): item is string => typeof item === "string")
    .map((item) => item.trim())
    .filter(Boolean)
    .slice(0, 12);

  return lines.length > 0 ? lines : undefined;
}

function normalizeStringArray(
  value: unknown,
  maxItems = 24,
): string[] | undefined {
  if (!Array.isArray(value)) {
    return undefined;
  }

  const result: string[] = [];
  const seen = new Set<string>();

  for (const item of value) {
    if (typeof item !== "string") {
      continue;
    }

    const normalized = item.trim().replace(/\s+/g, " ");
    if (!normalized) {
      continue;
    }

    const key = normalized.toLowerCase();
    if (seen.has(key)) {
      continue;
    }

    seen.add(key);
    result.push(normalized);

    if (result.length >= maxItems) {
      break;
    }
  }

  return result.length > 0 ? result : undefined;
}

function normalizeCategoryAlternativesRaw(
  value: unknown,
): Array<{ name: string; reason?: string }> | undefined {
  if (!Array.isArray(value)) {
    return undefined;
  }

  const result: Array<{ name: string; reason?: string }> = [];

  for (const item of value) {
    if (!item || typeof item !== "object" || Array.isArray(item)) {
      continue;
    }

    const record = item as Record<string, unknown>;
    const name =
      typeof record.name === "string"
        ? record.name.trim()
        : typeof record.categoryName === "string"
          ? record.categoryName.trim()
          : "";

    if (!name) {
      continue;
    }

    result.push({
      name,
      reason:
        typeof record.reason === "string"
          ? record.reason.trim() || undefined
          : undefined,
    });

    if (result.length >= 3) {
      break;
    }
  }

  return result.length > 0 ? result : undefined;
}

function assertRequiredField(value: string, fieldName: string): void {
  if (!value) {
    throw new Error(`AI response is missing required field: ${fieldName}.`);
  }
}

/**
 * Normalize the v39 response. AI tags and AI-halftone fields are intentionally not part of this
 * active parser. `readableTextLines` is accepted only as a bounded historical alias for
 * canonical `visibleText`.
 */
export function normalizeSimpleCatalogEnrichment(
  raw: Record<string, unknown>,
): SimpleCatalogEnrichmentParsed {
  const category = coerceString(raw.category);
  const description = coerceString(raw.description);
  const title = coerceString(raw.title);
  const legacyReadableTextLines = normalizeReadableTextLines(
    raw.readableTextLines,
  );
  const visibleText =
    normalizeStringArray(raw.visibleText, 12) ?? legacyReadableTextLines;

  assertRequiredField(description, "description");
  assertRequiredField(category, "category");
  assertRequiredField(title, "title");

  return {
    category,
    description,
    title,
    centralSubject: coerceString(raw.centralSubject) || undefined,
    subjects: normalizeStringArray(raw.subjects),
    objects: normalizeStringArray(raw.objects),
    styles: normalizeStringArray(raw.styles),
    themes: normalizeStringArray(raw.themes),
    interests: normalizeStringArray(raw.interests),
    professionsGroups: normalizeStringArray(raw.professionsGroups),
    occasions: normalizeStringArray(raw.occasions),
    places: normalizeStringArray(raw.places),
    colors: normalizeStringArray(raw.colors),
    visibleText,
    searchConcepts: normalizeStringArray(raw.searchConcepts, 24),
    categoryAlternatives: normalizeCategoryAlternativesRaw(
      raw.categoryAlternatives,
    ),
    categoryGapNote: coerceString(raw.categoryGapNote) || undefined,
    visualContextProfile: normalizeVisualContextProfile(
      raw.visualContextProfile,
    ),
  };
}

/**
 * Project a normalized parse into the canonical enrichment JSON keys only.
 * Unknown provider keys (prompt, keywords, people, etc.) are never included.
 */
export function toCanonicalSimpleCatalogEnrichmentJson(
  parsed: SimpleCatalogEnrichmentParsed,
): Record<string, unknown> {
  return {
    title: parsed.title,
    description: parsed.description,
    category: parsed.category,
    centralSubject: parsed.centralSubject ?? "",
    subjects: parsed.subjects ?? [],
    objects: parsed.objects ?? [],
    styles: parsed.styles ?? [],
    themes: parsed.themes ?? [],
    interests: parsed.interests ?? [],
    professionsGroups: parsed.professionsGroups ?? [],
    occasions: parsed.occasions ?? [],
    places: parsed.places ?? [],
    colors: parsed.colors ?? [],
    visibleText: parsed.visibleText ?? [],
    searchConcepts: parsed.searchConcepts ?? [],
    categoryAlternatives: (parsed.categoryAlternatives ?? []).map((entry) => ({
      name: entry.name,
      ...(entry.reason ? { reason: entry.reason } : {}),
    })),
    categoryGapNote: parsed.categoryGapNote ?? "",
    ...(parsed.visualContextProfile
      ? { visualContextProfile: parsed.visualContextProfile }
      : {}),
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
  const {
    parsed,
    enrichmentInput: _enrichmentInput,
    modelId,
    providerId,
    promptTokens,
    completionTokens,
  } = input;

  const sanitizedVisibleText = sanitizeMeaningfulVisibleTextPhrases(
    parsed.visibleText,
  );

  const explicitContentArtworkEvidence = [...(parsed.visibleText ?? [])]
    .map((line) => (typeof line === "string" ? line.trim() : ""))
    .filter(Boolean);

  // ADR-FP-181 / owner contract: AI owns semantic title/description.
  // Persist canonical model copy after structural validation only — no lean rewrite,
  // slogan rebuild, subject append, or description synthesis.
  const title = acceptCanonicalCatalogCopy("title", parsed.title);
  const description = acceptCanonicalCatalogCopy(
    "description",
    parsed.description,
  );

  const estimatedCostUsd =
    promptTokens != null && completionTokens != null
      ? estimateVisionCostUsd(modelId, promptTokens, completionTokens)
      : null;

  // Category is checked against the loaded approved category names by candidate generation before
  // persistence. This raw value remains transient until that authority boundary.
  const suggestions: DesignAiSuggestions = {
    title,
    description,
    provider: providerId ?? "google",
    model: modelId,
    promptVersion: CATALOG_ENRICHMENT_PROMPT_VERSION,
    generatedAt: new Date().toISOString(),
    promptTokens: promptTokens ?? null,
    completionTokens: completionTokens ?? null,
    estimatedCostUsd,
  };

  const analysis: DesignAiAnalysis = {
    visualContextProfile: parsed.visualContextProfile,
    // Canonical evidence path: automation and persistence consume analysis.visibleText.
    // Keep the Smart Profile parse synchronized with the same sanitized phrases.
    visibleText: sanitizedVisibleText,
    rawCategory: parsed.category || undefined,
    explicitContentArtworkEvidence:
      explicitContentArtworkEvidence.length > 0
        ? explicitContentArtworkEvidence
        : undefined,
    smartProfileEnrichmentParse: {
      subjects: parsed.subjects,
      objects: parsed.objects,
      styles: parsed.styles,
      themes: parsed.themes,
      interests: parsed.interests,
      professionsGroups: parsed.professionsGroups,
      occasions: parsed.occasions,
      places: parsed.places,
      colors: parsed.colors,
      visibleText: sanitizedVisibleText,
      searchConcepts: parsed.searchConcepts,
      categoryAlternatives: parsed.categoryAlternatives,
      categoryGapNote: parsed.categoryGapNote,
    },
  };

  return { suggestions, analysis };
}
