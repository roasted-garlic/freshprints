/**
 * TD-034 / catalog-enrich-v37 — categoryGapNote semantics corrective on visual-first prompt.
 */
import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  DEFAULT_AI_ENRICHMENT_PROMPT_TEMPLATE,
  PREVIOUS_DEFAULT_AI_ENRICHMENT_PROMPT_TEMPLATE_V36,
  isPreviousDefaultAiEnrichmentPromptTemplate,
  resolveAiEnrichmentPromptTemplate,
} from "../../../packages/shared/src/constants/aiEnrichment.constants";
import { CURRENT_CATALOG_ENRICH_PROMPT_VERSION } from "../../../packages/shared/src/constants/smartProfile.constants";
import { CATALOG_ENRICHMENT_PROMPT_VERSION } from "./catalogTitleRules";

describe("catalog-enrich-v39 false category-gap semantics corrective", () => {
  it("pins Functions and shared prompt versions to v39", () => {
    assert.equal(CATALOG_ENRICHMENT_PROMPT_VERSION, "catalog-enrich-v39");
    assert.equal(CURRENT_CATALOG_ENRICH_PROMPT_VERSION, "catalog-enrich-v39");
  });

  it("keeps visual-first baseline and defines categoryGapNote as true-gap only", () => {
    assert.match(
      DEFAULT_AI_ENRICHMENT_PROMPT_TEMPLATE,
      /4–10 words|4-10 words/,
    );
    assert.match(
      DEFAULT_AI_ENRICHMENT_PROMPT_TEMPLATE,
      /2–4 sentences|2-4 sentences/,
    );
    assert.match(
      DEFAULT_AI_ENRICHMENT_PROMPT_TEMPLATE,
      /\{\{approved_categories\}\}/,
    );
    assert.doesNotMatch(
      DEFAULT_AI_ENRICHMENT_PROMPT_TEMPLATE,
      /\{\{excluded_tags\}\}/,
    );
    assert.match(
      DEFAULT_AI_ENRICHMENT_PROMPT_TEMPLATE,
      /Use categoryGapNote only when no approved category reasonably fits/,
    );
    assert.match(
      DEFAULT_AI_ENRICHMENT_PROMPT_TEMPLATE,
      /Use categoryAlternatives only when another approved category is genuinely plausible/,
    );
    assert.doesNotMatch(
      DEFAULT_AI_ENRICHMENT_PROMPT_TEMPLATE,
      /cucumber|Funny & Sarcastic|Food & Drink|pin-up|Woman holding/i,
    );
    assert.ok(DEFAULT_AI_ENRICHMENT_PROMPT_TEMPLATE.length < 4500);
  });

  it("auto-upgrades archived v36 default to v39", () => {
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
});
