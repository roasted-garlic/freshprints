import {
  AI_ENRICHMENT_APPROVED_CATEGORIES_PLACEHOLDER,
  AI_ENRICHMENT_APPROVED_TAGS_PLACEHOLDER,
  AI_ENRICHMENT_EXCLUDED_TAGS_PLACEHOLDER,
  DEFAULT_AI_ENRICHMENT_PROMPT_TEMPLATE,
} from "../../../shared/constants/aiEnrichment.constants";
import type { CatalogTag } from "../../../shared/types/catalogTag.types";
import type { AiEnrichmentCategoryOption } from "./providers/AiEnrichmentProvider";

/**
 * Playground-style AI Processing prompt (v17).
 *
 * Intentionally lightweight: it asks for only catalog review fields and does NOT force
 * `response_format: json_object`. This matches the Settings
 * AI Playground request shape, which returns valid JSON quickly at `medium` reasoning effort
 * without exhausting the token budget (the cause of the `finish_reason: length` empty-output
 * error on the heavier v16 structured contract).
 */

const SIMPLE_CATALOG_SYSTEM_PROMPT = [
  "You catalog DTF apparel design images for an internal print shop.",
  "Look only at the provided image. Do not use filenames or outside context.",
  "Return valid JSON only — no markdown, code fences, comments, or extra text.",
].join(" ");

export function buildSimpleCatalogEnrichmentSystemPrompt(): string {
  return SIMPLE_CATALOG_SYSTEM_PROMPT;
}

function collapsePromptWhitespace(value: string): string {
  return value.replace(/\s+/g, " ").trim();
}

function formatCategoryContext(
  categories: readonly AiEnrichmentCategoryOption[] | undefined,
  fallbackNames: readonly string[],
): string {
  const options: readonly AiEnrichmentCategoryOption[] =
    categories && categories.length > 0
      ? categories
      : fallbackNames.map((name) => ({ id: name, name }));

  if (options.length === 0) {
    return "(none)";
  }

  return options
    .map((category) => {
      const name = collapsePromptWhitespace(category.name);
      const description = collapsePromptWhitespace(category.description ?? "");
      return description ? `- ${name} — ${description}` : `- ${name}`;
    })
    .join("\n");
}

function formatTagContext(
  approvedTags: readonly CatalogTag[] | undefined,
  fallbackNames: readonly string[],
): string {
  const tags =
    approvedTags && approvedTags.length > 0
      ? approvedTags
      : fallbackNames.map((name) => ({
          aliases: [],
          createdAt: null,
          createdBy: "",
          id: name,
          name,
          preferredWhen: "",
          status: "approved" as const,
          updatedAt: null,
          updatedBy: "",
        }));

  if (tags.length === 0) {
    return "(none)";
  }

  return tags
    .filter((tag) => tag.status === "approved")
    .map((tag) => {
      const name = collapsePromptWhitespace(tag.name);
      const aliases = tag.aliases.map(collapsePromptWhitespace).filter(Boolean);
      const preferredWhen = collapsePromptWhitespace(tag.preferredWhen);
      const parts = [`- ${name}`];

      if (aliases.length > 0) {
        parts.push(`aliases: ${aliases.join(", ")}`);
      }

      if (preferredWhen) {
        parts.push(`preferred when: ${preferredWhen}`);
      }

      return parts.join(" | ");
    })
    .join("\n");
}

function formatExclusionList(values: readonly string[]): string {
  return values.length > 0 ? values.join(", ") : "(none)";
}

export function buildSimpleCatalogEnrichmentUserPrompt(input: {
  approvedCategories?: readonly AiEnrichmentCategoryOption[];
  approvedCategoryNames: readonly string[];
  approvedTags?: readonly CatalogTag[];
  approvedTagNames: readonly string[];
  effectiveTagExclusions: readonly string[];
  promptTemplate?: string;
}): string {
  const { approvedCategoryNames, approvedTagNames, approvedCategories, approvedTags, effectiveTagExclusions } = input;
  const promptTemplate = input.promptTemplate ?? DEFAULT_AI_ENRICHMENT_PROMPT_TEMPLATE;
  const approvedCategoryContext = formatCategoryContext(approvedCategories, approvedCategoryNames);
  const approvedTagContext = formatTagContext(approvedTags, approvedTagNames);
  const excludedTags = formatExclusionList(effectiveTagExclusions);
  const template = promptTemplate.trim() || DEFAULT_AI_ENRICHMENT_PROMPT_TEMPLATE;
  return template
    .split(AI_ENRICHMENT_APPROVED_CATEGORIES_PLACEHOLDER)
    .join(approvedCategoryContext)
    .split(AI_ENRICHMENT_APPROVED_TAGS_PLACEHOLDER)
    .join(approvedTagContext)
    .split(AI_ENRICHMENT_EXCLUDED_TAGS_PLACEHOLDER)
    .join(excludedTags);
}
