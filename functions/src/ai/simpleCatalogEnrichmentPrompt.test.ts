import assert from "node:assert/strict";
import { describe, it } from "node:test";

import type { CatalogTag } from "../../../shared/types/catalogTag.types";
import type { AiEnrichmentCategoryOption } from "./providers/AiEnrichmentProvider";
import { buildSimpleCatalogEnrichmentUserPrompt } from "./simpleCatalogEnrichmentPrompt";

const categories: AiEnrichmentCategoryOption[] = [
  { id: "cat-family", name: "Family", description: "Motherhood, parenting, family themes." },
];

const approvedTags: CatalogTag[] = [
  {
    aliases: ["mom"],
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

describe("simpleCatalogEnrichmentPrompt — legacy template backward compatibility (review note 5)", () => {
  it("still builds and substitutes an owner-edited legacy template containing {{approved_categories}} and {{approved_tags}}", () => {
    const legacyTemplate = [
      "Analyze the image.",
      "Approved categories:",
      "{{approved_categories}}",
      "Approved tags:",
      "{{approved_tags}}",
      "Excluded tags:",
      "{{excluded_tags}}",
    ].join("\n");

    const resolved = buildSimpleCatalogEnrichmentUserPrompt({
      approvedCategories: categories,
      approvedCategoryNames: categories.map((category) => category.name),
      approvedTags,
      approvedTagNames: approvedTags.map((tag) => tag.name),
      effectiveTagExclusions: ["death"],
      promptTemplate: legacyTemplate,
    });

    // Legacy placeholders are still substituted with real taxonomy context — a saved custom
    // template from before the v18 change keeps working instead of sending literal
    // "{{approved_categories}}" text to the model.
    assert.ok(resolved.includes("Family"));
    assert.ok(resolved.includes("motherhood"));
    assert.ok(resolved.includes("death"));
    assert.ok(!resolved.includes("{{approved_categories}}"));
    assert.ok(!resolved.includes("{{approved_tags}}"));
    assert.ok(!resolved.includes("{{excluded_tags}}"));
  });

  it("builds the shipped default-style template (no legacy placeholders) without error", () => {
    const modernTemplate = "Analyze the image. Excluded tags: {{excluded_tags}}";

    const resolved = buildSimpleCatalogEnrichmentUserPrompt({
      approvedCategories: categories,
      approvedCategoryNames: categories.map((category) => category.name),
      approvedTags,
      approvedTagNames: approvedTags.map((tag) => tag.name),
      effectiveTagExclusions: ["death"],
      promptTemplate: modernTemplate,
    });

    assert.ok(resolved.includes("death"));
    assert.ok(!resolved.includes("Family"));
    assert.ok(!resolved.includes("motherhood"));
  });
});
