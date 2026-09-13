import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  AI_ENRICHMENT_PROMPT_TEMPLATE_MAX_LENGTH,
  AI_ENRICHMENT_STALE_STAGE_MS,
  DEFAULT_AI_ENRICHMENT_PROMPT_TEMPLATE,
  PREVIOUS_DEFAULT_AI_ENRICHMENT_PROMPT_TEMPLATE_V31,
  PREVIOUS_DEFAULT_AI_ENRICHMENT_PROMPT_TEMPLATE_V32,
  PREVIOUS_DEFAULT_AI_ENRICHMENT_PROMPT_TEMPLATE_V33,
  PREVIOUS_DEFAULT_AI_ENRICHMENT_PROMPT_TEMPLATE_V34,
  PREVIOUS_DEFAULT_AI_ENRICHMENT_PROMPT_TEMPLATE_V35,
  PREVIOUS_DEFAULT_AI_ENRICHMENT_PROMPT_TEMPLATE_V36,
  PREVIOUS_DEFAULT_AI_ENRICHMENT_PROMPT_TEMPLATE_V38_LEGACY,
  VISION_MODEL_PRICING_USD_PER_1M,
  estimateVisionCostUsd,
  hasRequiredAiEnrichmentPromptPlaceholders,
  isDefaultAiEnrichmentPromptTemplate,
  isPreviousDefaultAiEnrichmentPromptTemplate,
  resolveAiEnrichmentPromptTemplate,
  resolveVisionModelProviderId,
} from "../constants/aiEnrichment.constants";
import { CURRENT_CATALOG_ENRICH_PROMPT_VERSION } from "../constants/smartProfile.constants";

describe("aiEnrichment.constants stale threshold", () => {
  it("matches the authoritative 10-minute server stale window", () => {
    assert.equal(AI_ENRICHMENT_STALE_STAGE_MS, 10 * 60 * 1000);
    assert.equal(AI_ENRICHMENT_STALE_STAGE_MS, 600_000);
  });
});

describe("dual-provider vision model metadata", () => {
  it("maps models to providers explicitly and prices Luna with cached input", () => {
    assert.equal(
      resolveVisionModelProviderId("gemini-2.5-flash-lite"),
      "google",
    );
    assert.equal(
      resolveVisionModelProviderId("gemini-3.1-flash-lite"),
      "google",
    );
    assert.equal(resolveVisionModelProviderId("gpt-5.6-luna"), "openai");
    assert.equal(resolveVisionModelProviderId("not-a-model"), null);
    assert.deepEqual(VISION_MODEL_PRICING_USD_PER_1M["gpt-5.6-luna"], {
      input: 0.2,
      cachedInput: 0.02,
      output: 1.2,
    });
    assert.equal(
      estimateVisionCostUsd("gpt-5.6-luna", 1_000_000, 1_000_000),
      0.2 + 1.2,
    );
    assert.equal(
      estimateVisionCostUsd("gpt-5.6-luna", 1_000_000, 0, 500_000),
      0.1 + 0.01,
    );
    assert.equal(
      estimateVisionCostUsd("gemini-2.5-flash-lite", 1_000_000, 1_000_000),
      0.5,
    );
  });
});

describe("catalog-enrich-v39 previous-default auto-upgrade", () => {
  it("ships catalog-enrich-v39 as the current default constant", () => {
    assert.equal(CURRENT_CATALOG_ENRICH_PROMPT_VERSION, "catalog-enrich-v39");
    assert.match(
      DEFAULT_AI_ENRICHMENT_PROMPT_TEMPLATE,
      /4–10 words|4-10 words/,
    );
    assert.match(
      DEFAULT_AI_ENRICHMENT_PROMPT_TEMPLATE,
      /\{\{approved_categories\}\}/,
    );
    assert.match(
      DEFAULT_AI_ENRICHMENT_PROMPT_TEMPLATE,
      /Use categoryGapNote only when no approved category reasonably fits/,
    );
    assert.doesNotMatch(
      DEFAULT_AI_ENRICHMENT_PROMPT_TEMPLATE,
      /\{\{excluded_tags\}\}/,
    );
    assert.doesNotMatch(
      DEFAULT_AI_ENRICHMENT_PROMPT_TEMPLATE,
      /tags|suggestedNewTags|halftoneShadow|readableTextLines/i,
    );
    assert.doesNotMatch(
      DEFAULT_AI_ENRICHMENT_PROMPT_TEMPLATE,
      /\{\{approved_category_names\}\}/,
    );
    assert.doesNotMatch(
      DEFAULT_AI_ENRICHMENT_PROMPT_TEMPLATE,
      /Structured evidence self-consistency/,
    );
    assert.doesNotMatch(
      DEFAULT_AI_ENRICHMENT_PROMPT_TEMPLATE,
      /\{\{existing_smart_profile_response_schema\}\}/,
    );
    assert.equal(
      hasRequiredAiEnrichmentPromptPlaceholders(
        DEFAULT_AI_ENRICHMENT_PROMPT_TEMPLATE,
      ),
      true,
    );
    assert.equal(
      isDefaultAiEnrichmentPromptTemplate(
        DEFAULT_AI_ENRICHMENT_PROMPT_TEMPLATE,
      ),
      true,
    );
    assert.ok(
      DEFAULT_AI_ENRICHMENT_PROMPT_TEMPLATE.length <=
        AI_ENRICHMENT_PROMPT_TEMPLATE_MAX_LENGTH,
      `default prompt length ${DEFAULT_AI_ENRICHMENT_PROMPT_TEMPLATE.length} exceeds max ${AI_ENRICHMENT_PROMPT_TEMPLATE_MAX_LENGTH}`,
    );
  });

  it("upgrades recognized previous default v36 to the current default", () => {
    assert.equal(
      isPreviousDefaultAiEnrichmentPromptTemplate(
        PREVIOUS_DEFAULT_AI_ENRICHMENT_PROMPT_TEMPLATE_V36,
      ),
      true,
    );
    assert.doesNotMatch(
      PREVIOUS_DEFAULT_AI_ENRICHMENT_PROMPT_TEMPLATE_V36,
      /Use categoryGapNote only when no approved category is a reasonable fit/,
    );
    assert.equal(
      resolveAiEnrichmentPromptTemplate(
        PREVIOUS_DEFAULT_AI_ENRICHMENT_PROMPT_TEMPLATE_V36,
      ),
      DEFAULT_AI_ENRICHMENT_PROMPT_TEMPLATE,
    );
  });

  it("upgrades the observed legacy v38 Playground stock copy to the current default", () => {
    assert.equal(
      isPreviousDefaultAiEnrichmentPromptTemplate(
        PREVIOUS_DEFAULT_AI_ENRICHMENT_PROMPT_TEMPLATE_V38_LEGACY,
      ),
      true,
    );
    assert.doesNotMatch(
      PREVIOUS_DEFAULT_AI_ENRICHMENT_PROMPT_TEMPLATE_V38_LEGACY,
      /visualContextProfile/,
    );
    assert.equal(
      resolveAiEnrichmentPromptTemplate(
        PREVIOUS_DEFAULT_AI_ENRICHMENT_PROMPT_TEMPLATE_V38_LEGACY,
      ),
      DEFAULT_AI_ENRICHMENT_PROMPT_TEMPLATE,
    );
  });

  it("upgrades recognized previous default v35 to the current default", () => {
    assert.equal(
      isPreviousDefaultAiEnrichmentPromptTemplate(
        PREVIOUS_DEFAULT_AI_ENRICHMENT_PROMPT_TEMPLATE_V35,
      ),
      true,
    );
    assert.match(
      PREVIOUS_DEFAULT_AI_ENRICHMENT_PROMPT_TEMPLATE_V35,
      /Structured evidence self-consistency/,
    );
    assert.equal(
      resolveAiEnrichmentPromptTemplate(
        PREVIOUS_DEFAULT_AI_ENRICHMENT_PROMPT_TEMPLATE_V35,
      ),
      DEFAULT_AI_ENRICHMENT_PROMPT_TEMPLATE,
    );
  });

  it("upgrades recognized previous default v34 to the current default", () => {
    assert.equal(
      isPreviousDefaultAiEnrichmentPromptTemplate(
        PREVIOUS_DEFAULT_AI_ENRICHMENT_PROMPT_TEMPLATE_V34,
      ),
      true,
    );
    assert.equal(
      resolveAiEnrichmentPromptTemplate(
        PREVIOUS_DEFAULT_AI_ENRICHMENT_PROMPT_TEMPLATE_V34,
      ),
      DEFAULT_AI_ENRICHMENT_PROMPT_TEMPLATE,
    );
  });

  it("upgrades recognized previous default v33 to the current default", () => {
    assert.equal(
      isPreviousDefaultAiEnrichmentPromptTemplate(
        PREVIOUS_DEFAULT_AI_ENRICHMENT_PROMPT_TEMPLATE_V33,
      ),
      true,
    );
    assert.match(
      PREVIOUS_DEFAULT_AI_ENRICHMENT_PROMPT_TEMPLATE_V33,
      /\{\{approved_category_names\}\}/,
    );
    assert.equal(
      resolveAiEnrichmentPromptTemplate(
        PREVIOUS_DEFAULT_AI_ENRICHMENT_PROMPT_TEMPLATE_V33,
      ),
      DEFAULT_AI_ENRICHMENT_PROMPT_TEMPLATE,
    );
  });

  it("upgrades recognized previous default v32 to the current default", () => {
    assert.equal(
      isPreviousDefaultAiEnrichmentPromptTemplate(
        PREVIOUS_DEFAULT_AI_ENRICHMENT_PROMPT_TEMPLATE_V32,
      ),
      true,
    );
    assert.equal(
      resolveAiEnrichmentPromptTemplate(
        PREVIOUS_DEFAULT_AI_ENRICHMENT_PROMPT_TEMPLATE_V32,
      ),
      DEFAULT_AI_ENRICHMENT_PROMPT_TEMPLATE,
    );
  });

  it("upgrades recognized previous default v31 to the current default", () => {
    assert.equal(
      isPreviousDefaultAiEnrichmentPromptTemplate(
        PREVIOUS_DEFAULT_AI_ENRICHMENT_PROMPT_TEMPLATE_V31,
      ),
      true,
    );
    assert.equal(
      resolveAiEnrichmentPromptTemplate(
        PREVIOUS_DEFAULT_AI_ENRICHMENT_PROMPT_TEMPLATE_V31,
      ),
      DEFAULT_AI_ENRICHMENT_PROMPT_TEMPLATE,
    );
  });

  it("preserves owner-customized prompt text that includes required v36 placeholders", () => {
    const custom = [
      "Owner custom enrichment guidance for DTF cataloging.",
      "Approved categories:",
      "{{approved_categories}}",
      "Return JSON only.",
    ].join("\n");
    assert.equal(isPreviousDefaultAiEnrichmentPromptTemplate(custom), false);
    assert.equal(isDefaultAiEnrichmentPromptTemplate(custom), false);
    assert.equal(resolveAiEnrichmentPromptTemplate(custom), custom);
  });

  it("does not silently rewrite a names-only custom prompt into an injected categories template", () => {
    // Missing {{approved_categories}} is incompatible with v34. Repo-standard resolve falls
    // back to the shipped default (does not mutate/inject into the custom string).
    const namesOnlyCustom = [
      "Owner custom enrichment guidance for DTF cataloging.",
      "Approved categories:",
      "{{approved_category_names}}",
      "Do not use these tag words: {{excluded_tags}}",
      "Return JSON only.",
    ].join("\n");
    assert.equal(
      isPreviousDefaultAiEnrichmentPromptTemplate(namesOnlyCustom),
      false,
    );
    assert.equal(
      hasRequiredAiEnrichmentPromptPlaceholders(namesOnlyCustom),
      false,
    );
    assert.equal(
      resolveAiEnrichmentPromptTemplate(namesOnlyCustom),
      DEFAULT_AI_ENRICHMENT_PROMPT_TEMPLATE,
    );
  });
});
