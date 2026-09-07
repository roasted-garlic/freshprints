import assert from "node:assert/strict";
import { describe, it } from "node:test";

import type { AiEnrichmentCategoryOption } from "./providers/AiEnrichmentProvider";
import {
  buildSimpleCatalogEnrichmentSystemPrompt,
  buildSimpleCatalogEnrichmentUserPrompt,
  VISUAL_CONTEXT_PROMPT_CONTRACT,
} from "./simpleCatalogEnrichmentPrompt";
import { DEFAULT_AI_ENRICHMENT_PROMPT_TEMPLATE } from "../../../packages/shared/src/constants/aiEnrichment.constants";

const categories: AiEnrichmentCategoryOption[] = [
  {
    id: "cat-family",
    name: "Family",
    description: "Motherhood, parenting, family themes.",
  },
];

describe("simpleCatalogEnrichmentPrompt v39", () => {
  it("uses the shared system prompt for both Processing and Playground", () => {
    assert.equal(
      buildSimpleCatalogEnrichmentSystemPrompt(),
      buildSimpleCatalogEnrichmentSystemPrompt(),
    );
  });

  it("injects active category names and owner descriptions dynamically", () => {
    const resolved = buildSimpleCatalogEnrichmentUserPrompt({
      approvedCategories: categories,
      approvedCategoryNames: categories.map((category) => category.name),
      promptTemplate: DEFAULT_AI_ENRICHMENT_PROMPT_TEMPLATE,
    });

    assert.ok(
      resolved.includes("- Family — Motherhood, parenting, family themes."),
    );
    assert.ok(!resolved.includes("{{approved_categories}}"));
    assert.ok(!resolved.includes("{{approved_category_names}}"));
  });

  it("does not inject retired tag vocabulary into the shipped prompt", () => {
    const resolved = buildSimpleCatalogEnrichmentUserPrompt({
      approvedCategories: categories,
      approvedCategoryNames: categories.map((category) => category.name),
      promptTemplate: DEFAULT_AI_ENRICHMENT_PROMPT_TEMPLATE,
    });

    assert.doesNotMatch(
      resolved,
      /tags|suggestedNewTags|preferredWhen|excluded_tags|approved_tags/i,
    );
    assert.doesNotMatch(resolved, /halftoneShadow|readableTextLines/i);
  });

  it("preserves genuine custom prompt content and adds the VCP contract once", () => {
    const custom = "Owner rule: preserve artwork wording.";
    const resolved = buildSimpleCatalogEnrichmentUserPrompt({
      approvedCategoryNames: [],
      promptTemplate: custom,
    });
    assert.ok(resolved.startsWith(custom));
    assert.equal(resolved.split(VISUAL_CONTEXT_PROMPT_CONTRACT).length - 1, 1);
  });

  it("keeps Playground and Processing prompt expansion identical", () => {
    const input = {
      approvedCategories: categories,
      approvedCategoryNames: categories.map((category) => category.name),
      promptTemplate: DEFAULT_AI_ENRICHMENT_PROMPT_TEMPLATE,
    };
    assert.equal(
      buildSimpleCatalogEnrichmentUserPrompt(input),
      buildSimpleCatalogEnrichmentUserPrompt(input),
    );
  });
});
