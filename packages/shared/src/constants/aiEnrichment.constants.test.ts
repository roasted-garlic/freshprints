import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  AI_ENRICHMENT_PROMPT_TEMPLATE_MAX_LENGTH,
  AI_ENRICHMENT_STALE_STAGE_MS,
  DEFAULT_AI_ENRICHMENT_PROMPT_TEMPLATE,
  PREVIOUS_DEFAULT_AI_ENRICHMENT_PROMPT_TEMPLATE_V31,
  PREVIOUS_DEFAULT_AI_ENRICHMENT_PROMPT_TEMPLATE_V32,
  PREVIOUS_DEFAULT_AI_ENRICHMENT_PROMPT_TEMPLATE_V33,
  hasRequiredAiEnrichmentPromptPlaceholders,
  isDefaultAiEnrichmentPromptTemplate,
  isPreviousDefaultAiEnrichmentPromptTemplate,
  resolveAiEnrichmentPromptTemplate,
} from "../constants/aiEnrichment.constants";
import { CURRENT_CATALOG_ENRICH_PROMPT_VERSION } from "../constants/smartProfile.constants";

describe("aiEnrichment.constants stale threshold", () => {
  it("matches the authoritative 10-minute server stale window", () => {
    assert.equal(AI_ENRICHMENT_STALE_STAGE_MS, 10 * 60 * 1000);
    assert.equal(AI_ENRICHMENT_STALE_STAGE_MS, 600_000);
  });
});

describe("catalog-enrich-v34 previous-default auto-upgrade", () => {
  it("ships catalog-enrich-v34 as the current default constant", () => {
    assert.equal(CURRENT_CATALOG_ENRICH_PROMPT_VERSION, "catalog-enrich-v34");
    assert.match(DEFAULT_AI_ENRICHMENT_PROMPT_TEMPLATE, /dominant BUYER INTENT/);
    assert.match(DEFAULT_AI_ENRICHMENT_PROMPT_TEMPLATE, /\{\{approved_categories\}\}/);
    assert.doesNotMatch(DEFAULT_AI_ENRICHMENT_PROMPT_TEMPLATE, /\{\{approved_category_names\}\}/);
    assert.equal(hasRequiredAiEnrichmentPromptPlaceholders(DEFAULT_AI_ENRICHMENT_PROMPT_TEMPLATE), true);
    assert.equal(isDefaultAiEnrichmentPromptTemplate(DEFAULT_AI_ENRICHMENT_PROMPT_TEMPLATE), true);
    assert.ok(
      DEFAULT_AI_ENRICHMENT_PROMPT_TEMPLATE.length <= AI_ENRICHMENT_PROMPT_TEMPLATE_MAX_LENGTH,
      `default prompt length ${DEFAULT_AI_ENRICHMENT_PROMPT_TEMPLATE.length} exceeds max ${AI_ENRICHMENT_PROMPT_TEMPLATE_MAX_LENGTH}`,
    );
  });

  it("upgrades recognized previous default v33 to the current default", () => {
    assert.equal(isPreviousDefaultAiEnrichmentPromptTemplate(PREVIOUS_DEFAULT_AI_ENRICHMENT_PROMPT_TEMPLATE_V33), true);
    assert.match(PREVIOUS_DEFAULT_AI_ENRICHMENT_PROMPT_TEMPLATE_V33, /\{\{approved_category_names\}\}/);
    assert.equal(
      resolveAiEnrichmentPromptTemplate(PREVIOUS_DEFAULT_AI_ENRICHMENT_PROMPT_TEMPLATE_V33),
      DEFAULT_AI_ENRICHMENT_PROMPT_TEMPLATE,
    );
  });

  it("upgrades recognized previous default v32 to the current default", () => {
    assert.equal(isPreviousDefaultAiEnrichmentPromptTemplate(PREVIOUS_DEFAULT_AI_ENRICHMENT_PROMPT_TEMPLATE_V32), true);
    assert.equal(
      resolveAiEnrichmentPromptTemplate(PREVIOUS_DEFAULT_AI_ENRICHMENT_PROMPT_TEMPLATE_V32),
      DEFAULT_AI_ENRICHMENT_PROMPT_TEMPLATE,
    );
  });

  it("upgrades recognized previous default v31 to the current default", () => {
    assert.equal(isPreviousDefaultAiEnrichmentPromptTemplate(PREVIOUS_DEFAULT_AI_ENRICHMENT_PROMPT_TEMPLATE_V31), true);
    assert.equal(
      resolveAiEnrichmentPromptTemplate(PREVIOUS_DEFAULT_AI_ENRICHMENT_PROMPT_TEMPLATE_V31),
      DEFAULT_AI_ENRICHMENT_PROMPT_TEMPLATE,
    );
  });

  it("preserves owner-customized prompt text that includes required v34 placeholders", () => {
    const custom = [
      "Owner custom enrichment guidance for DTF cataloging.",
      "Approved categories:",
      "{{approved_categories}}",
      "Do not use these tag words: {{excluded_tags}}",
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
    assert.equal(isPreviousDefaultAiEnrichmentPromptTemplate(namesOnlyCustom), false);
    assert.equal(hasRequiredAiEnrichmentPromptPlaceholders(namesOnlyCustom), false);
    assert.equal(resolveAiEnrichmentPromptTemplate(namesOnlyCustom), DEFAULT_AI_ENRICHMENT_PROMPT_TEMPLATE);
  });
});
