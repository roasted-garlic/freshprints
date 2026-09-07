import {
  AI_ENRICHMENT_APPROVED_CATEGORIES_PLACEHOLDER,
  AI_ENRICHMENT_APPROVED_CATEGORY_NAMES_PLACEHOLDER,
  AI_ENRICHMENT_SMART_PROFILE_VOCAB_PLACEHOLDER,
  DEFAULT_AI_ENRICHMENT_PROMPT_TEMPLATE,
} from "../../../packages/shared/src/constants/aiEnrichment.constants";
import { formatSmartProfileVocabPromptSection } from "../../../packages/shared/src/utils/smartProfileVocab";
import type { SmartProfileVocabLists } from "../../../packages/shared/src/utils/smartProfileVocab";
import type { AiEnrichmentCategoryOption } from "./providers/AiEnrichmentProvider";

/**
 * Playground-style AI Processing prompt (v20).
 *
 * Intentionally lightweight: it asks for only catalog review fields and does NOT force
 * a machine-enforced structured response schema. Processing and the Settings AI Playground
 * share the same response contract while retaining the lightweight prompt.
 *
 * v34 default injects active category name + owner description via {{approved_categories}}
 * (see ADR-FP-165). Tag names/aliases/preferredWhen remain deliberately NOT injected
 * (ADR-FP-041 ~4.4x cost). {{approved_category_names}} remains for legacy/debug templates.
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

function formatCategoryNamesOnly(
  categories: readonly AiEnrichmentCategoryOption[] | undefined,
  fallbackNames: readonly string[],
): string {
  const names =
    categories && categories.length > 0
      ? categories.map((category) => category.name)
      : fallbackNames;

  if (names.length === 0) {
    return "(none)";
  }

  return names.map((name) => `- ${collapsePromptWhitespace(name)}`).join("\n");
}

/**
 * ADR-FP-182: keep editable legacy Settings prompts compatible with the immutable Pass 1
 * visual-context contract. The marker pair is intentionally narrow so an owner-authored prompt
 * is preserved verbatim and receives the contract at most once.
 */
export const VISUAL_CONTEXT_PROMPT_CONTRACT =
  'Return a visualContextProfile object with version "visual-context-v1", including a grounded summary and detailedDescription. Use only bounded visual evidence and include uncertainties when evidence is ambiguous.';

function ensureVisualContextPromptContract(template: string): string {
  const hasVcpKey = /visualContextProfile/i.test(template);
  const hasVcpVersion = /visual-context-v1/i.test(template);
  if (hasVcpKey && hasVcpVersion) {
    return template;
  }

  return `${template}\n\n${VISUAL_CONTEXT_PROMPT_CONTRACT}`;
}

export function buildSimpleCatalogEnrichmentUserPrompt(input: {
  approvedCategories?: readonly AiEnrichmentCategoryOption[];
  approvedCategoryNames: readonly string[];
  promptTemplate?: string;
  /** Bounded auto-derived vocab — never approved tags; empty OK. */
  smartProfileVocab?: SmartProfileVocabLists;
}): string {
  const { approvedCategoryNames, approvedCategories } = input;
  const promptTemplate =
    input.promptTemplate ?? DEFAULT_AI_ENRICHMENT_PROMPT_TEMPLATE;
  const approvedCategoryContext = formatCategoryContext(
    approvedCategories,
    approvedCategoryNames,
  );
  const approvedCategoryNamesOnly = formatCategoryNamesOnly(
    approvedCategories,
    approvedCategoryNames,
  );
  const smartProfileVocab = formatSmartProfileVocabPromptSection(
    input.smartProfileVocab,
  );
  const template = ensureVisualContextPromptContract(
    promptTemplate.trim() || DEFAULT_AI_ENRICHMENT_PROMPT_TEMPLATE,
  );
  return template
    .split(AI_ENRICHMENT_APPROVED_CATEGORIES_PLACEHOLDER)
    .join(approvedCategoryContext)
    .split(AI_ENRICHMENT_APPROVED_CATEGORY_NAMES_PLACEHOLDER)
    .join(approvedCategoryNamesOnly)
    .split(AI_ENRICHMENT_SMART_PROFILE_VOCAB_PLACEHOLDER)
    .join(smartProfileVocab);
}
