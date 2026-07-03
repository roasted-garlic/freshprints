import assert from "node:assert/strict";
import { describe, it } from "node:test";

import type { CatalogTag } from "../../../shared/types/catalogTag.types";
import type { AiEnrichmentCategoryOption } from "./providers/AiEnrichmentProvider";
import {
  buildSimpleCatalogEnrichmentSystemPrompt,
  buildSimpleCatalogEnrichmentUserPrompt,
} from "./simpleCatalogEnrichmentPrompt";
import { DEFAULT_AI_ENRICHMENT_PROMPT_TEMPLATE } from "../../../shared/constants/aiEnrichment.constants";

/**
 * Prompt parity: the Settings AI Playground (aiEnrichmentPlayground.ts) and AI Processing
 * (openAiVisionEnrichmentProvider.ts) both build their prompts from the SAME shared builders. This
 * test locks that in so the two paths cannot drift back into two separate prompt implementations.
 * The lean prompt injects approved category names only (cheap, ~0.8% cost increase measured);
 * the full approved category descriptions and the approved tag list stay resolved server-side and
 * are not injected (full tag-name injection measured ~4.4x the per-image cost — see ADR-FP-041).
 */

const categories: AiEnrichmentCategoryOption[] = [
  { id: "cat-family", name: "Family", description: "Motherhood, parenting, family themes." },
  { id: "cat-pop", name: "Pop Culture & Characters", description: "Recognizable IP and characters." },
];

const approvedTags: CatalogTag[] = [
  {
    aliases: ["rock and roll", "rock n roll"],
    createdAt: null,
    createdBy: "seed",
    id: "tag-rock",
    name: "rock-n-roll",
    preferredWhen: "Use for rock/attitude designs.",
    status: "approved",
    updatedAt: null,
    updatedBy: "seed",
  },
  {
    aliases: [],
    createdAt: null,
    createdBy: "seed",
    id: "tag-motherhood",
    name: "motherhood",
    preferredWhen: "Use for motherhood/parenting themes.",
    status: "approved",
    updatedAt: null,
    updatedBy: "seed",
  },
];

const exclusions = ["death", "skull"];

function buildUserPrompt(promptTemplate: string): string {
  return buildSimpleCatalogEnrichmentUserPrompt({
    approvedCategories: categories,
    approvedCategoryNames: categories.map((category) => category.name),
    approvedTags,
    approvedTagNames: approvedTags.map((tag) => tag.name),
    effectiveTagExclusions: exclusions,
    promptTemplate,
  });
}

describe("prompt parity (playground vs AI processing)", () => {
  it("produces an identical system prompt for both paths", () => {
    // Both aiEnrichmentPlayground.ts and openAiVisionEnrichmentProvider.ts call this same builder.
    assert.equal(
      buildSimpleCatalogEnrichmentSystemPrompt(),
      buildSimpleCatalogEnrichmentSystemPrompt(),
    );
  });

  it("produces an identical user prompt when the same template is used in both paths", () => {
    // AI Processing uses the saved settings template; the Playground uses the textarea contents.
    // When they carry the same template, the resolved prompt (with categories/tags/exclusions
    // injected) must be byte-identical.
    const template = DEFAULT_AI_ENRICHMENT_PROMPT_TEMPLATE;

    assert.equal(buildUserPrompt(template), buildUserPrompt(template));
  });

  it("injects approved category names but not category descriptions or the approved tag list into the default prompt", () => {
    // The lean prompt sends only approved category names; category descriptions and the full
    // approved tag list (names/aliases/preferredWhen) stay resolved server-side, so the resolved
    // prompt must contain category names but not the injected description/tag taxonomy context.
    const resolved = buildUserPrompt(DEFAULT_AI_ENRICHMENT_PROMPT_TEMPLATE);

    assert.ok(resolved.includes("Pop Culture & Characters"));
    assert.ok(!resolved.includes("Recognizable IP and characters."));
    assert.ok(!resolved.includes("rock-n-roll"));
    assert.ok(!resolved.includes("aliases: rock and roll, rock n roll"));
    assert.ok(!DEFAULT_AI_ENRICHMENT_PROMPT_TEMPLATE.includes("{{approved_categories}}"));
    assert.ok(!DEFAULT_AI_ENRICHMENT_PROMPT_TEMPLATE.includes("{{approved_tags}}"));
  });

  it("injects excluded tags into the resolved prompt", () => {
    const resolved = buildUserPrompt(DEFAULT_AI_ENRICHMENT_PROMPT_TEMPLATE);

    assert.ok(resolved.includes("death"));
    assert.ok(resolved.includes("skull"));
    assert.ok(!resolved.includes("{{excluded_tags}}"));
  });
});
