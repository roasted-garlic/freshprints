import assert from "node:assert/strict";
import { describe, it } from "node:test";

import type { CatalogTag } from "../../../packages/shared/src/types/catalogTag.types";
import type { AiEnrichmentCategoryOption } from "./providers/AiEnrichmentProvider";
import {
  buildSimpleCatalogEnrichmentSystemPrompt,
  buildSimpleCatalogEnrichmentUserPrompt,
} from "./simpleCatalogEnrichmentPrompt";
import { DEFAULT_AI_ENRICHMENT_PROMPT_TEMPLATE } from "../../../packages/shared/src/constants/aiEnrichment.constants";

/**
 * Prompt parity: Settings AI Playground and AI Processing share the same builders.
 * v34 default injects category name + description (ADR-FP-165); tag taxonomy stays out.
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
    assert.equal(
      buildSimpleCatalogEnrichmentSystemPrompt(),
      buildSimpleCatalogEnrichmentSystemPrompt(),
    );
  });

  it("produces an identical user prompt when the same template is used in both paths", () => {
    const template = DEFAULT_AI_ENRICHMENT_PROMPT_TEMPLATE;
    assert.equal(buildUserPrompt(template), buildUserPrompt(template));
  });

  it("injects approved category names and descriptions but not the approved tag list into the default prompt", () => {
    const resolved = buildUserPrompt(DEFAULT_AI_ENRICHMENT_PROMPT_TEMPLATE);

    assert.ok(resolved.includes("Pop Culture & Characters"));
    assert.ok(resolved.includes("Recognizable IP and characters."));
    assert.ok(resolved.includes("Family — Motherhood, parenting, family themes."));
    assert.ok(!resolved.includes("rock-n-roll"));
    assert.ok(!resolved.includes("aliases: rock and roll, rock n roll"));
    assert.ok(DEFAULT_AI_ENRICHMENT_PROMPT_TEMPLATE.includes("{{approved_categories}}"));
    assert.ok(!DEFAULT_AI_ENRICHMENT_PROMPT_TEMPLATE.includes("{{approved_category_names}}"));
    assert.ok(!DEFAULT_AI_ENRICHMENT_PROMPT_TEMPLATE.includes("{{approved_tags}}"));
  });

  it("injects excluded tags into the resolved prompt", () => {
    const resolved = buildUserPrompt(DEFAULT_AI_ENRICHMENT_PROMPT_TEMPLATE);

    assert.ok(resolved.includes("death"));
    assert.ok(resolved.includes("skull"));
  });
});
