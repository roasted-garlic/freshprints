import assert from "node:assert/strict";
import { describe, it } from "node:test";

import type { CatalogTag } from "../../../packages/shared/src/types/catalogTag.types";
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

describe("simpleCatalogEnrichmentPrompt — {{approved_categories}} (v34 default)", () => {
  it("substitutes category name + whitespace-collapsed description", () => {
    const messy = [
      {
        id: "cat-faith",
        name: "  Faith & Worship  ",
        description: "  Christian faith,\n  scripture,  church.  ",
      },
      { id: "cat-no-desc", name: "Occasions" },
    ];
    const template = [
      "Analyze the image.",
      "Approved categories:",
      "{{approved_categories}}",
      "Excluded tags: {{excluded_tags}}",
    ].join("\n");

    const resolved = buildSimpleCatalogEnrichmentUserPrompt({
      approvedCategories: messy,
      approvedCategoryNames: messy.map((category) => category.name),
      approvedTagNames: [],
      effectiveTagExclusions: ["death"],
      promptTemplate: template,
    });

    assert.ok(resolved.includes("- Faith & Worship — Christian faith, scripture, church."));
    assert.ok(resolved.includes("- Occasions"));
    assert.ok(!resolved.includes("{{approved_categories}}"));
    assert.ok(!resolved.includes("\n  scripture"));
  });
});

describe("simpleCatalogEnrichmentPrompt — {{approved_category_names}}", () => {
  it("substitutes only category names, without descriptions", () => {
    const template = [
      "Analyze the image.",
      "Approved categories:",
      "{{approved_category_names}}",
      "Excluded tags: {{excluded_tags}}",
    ].join("\n");

    const resolved = buildSimpleCatalogEnrichmentUserPrompt({
      approvedCategories: categories,
      approvedCategoryNames: categories.map((category) => category.name),
      approvedTagNames: [],
      effectiveTagExclusions: ["death"],
      promptTemplate: template,
    });

    assert.ok(resolved.includes("Family"));
    assert.ok(!resolved.includes("Motherhood, parenting, family themes."));
    assert.ok(!resolved.includes("{{approved_category_names}}"));
  });
});

describe("simpleCatalogEnrichmentPrompt — {{approved_tag_names}}", () => {
  it("substitutes only tag names, without aliases or preferredWhen", () => {
    const template = [
      "Analyze the image.",
      "Approved tags:",
      "{{approved_tag_names}}",
      "Excluded tags: {{excluded_tags}}",
    ].join("\n");

    const resolved = buildSimpleCatalogEnrichmentUserPrompt({
      approvedCategoryNames: [],
      approvedTags,
      approvedTagNames: approvedTags.map((tag) => tag.name),
      effectiveTagExclusions: ["death"],
      promptTemplate: template,
    });

    assert.ok(resolved.includes("motherhood"));
    assert.ok(!resolved.includes("aliases:"));
    assert.ok(!resolved.includes("preferred when:"));
    assert.ok(!resolved.includes("{{approved_tag_names}}"));
  });
});
