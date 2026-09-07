/**
 * TD-034 / catalog-enrich-v37 visual-first prompt contract.
 */
import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { DEFAULT_AI_ENRICHMENT_PROMPT_TEMPLATE } from "../../../packages/shared/src/constants/aiEnrichment.constants";
import { CURRENT_CATALOG_ENRICH_PROMPT_VERSION } from "../../../packages/shared/src/constants/smartProfile.constants";
import { CATALOG_ENRICHMENT_PROMPT_VERSION } from "./catalogTitleRules";

describe("catalog-enrich-v39 visual-first prompt contract", () => {
  it("pins Functions and shared prompt versions to v39", () => {
    assert.equal(CATALOG_ENRICHMENT_PROMPT_VERSION, "catalog-enrich-v39");
    assert.equal(CURRENT_CATALOG_ENRICH_PROMPT_VERSION, "catalog-enrich-v39");
  });

  it("ships the owner visual-first baseline without rebuilding the v35 rulebook", () => {
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
      /exact approved category name/,
    );
    assert.match(DEFAULT_AI_ENRICHMENT_PROMPT_TEMPLATE, /display mat/);
    assert.match(
      DEFAULT_AI_ENRICHMENT_PROMPT_TEMPLATE,
      /fine-grained attributes/,
    );
    assert.doesNotMatch(
      DEFAULT_AI_ENRICHMENT_PROMPT_TEMPLATE,
      /\{\{existing_smart_profile_response_schema\}\}/,
    );
    assert.doesNotMatch(
      DEFAULT_AI_ENRICHMENT_PROMPT_TEMPLATE,
      /\{\{smart_profile_vocab\}\}/,
    );
    assert.doesNotMatch(
      DEFAULT_AI_ENRICHMENT_PROMPT_TEMPLATE,
      /Structured evidence self-consistency/,
    );
    assert.doesNotMatch(
      DEFAULT_AI_ENRICHMENT_PROMPT_TEMPLATE,
      /cucumber|Woman holding/i,
    );
    assert.ok(DEFAULT_AI_ENRICHMENT_PROMPT_TEMPLATE.length < 4000);
  });

  it("leaves response structure to the supplied schema", () => {
    assert.match(
      DEFAULT_AI_ENRICHMENT_PROMPT_TEMPLATE,
      /matching the supplied schema/,
    );
    assert.doesNotMatch(
      DEFAULT_AI_ENRICHMENT_PROMPT_TEMPLATE,
      /"subjects":\[\]/,
    );
    assert.doesNotMatch(
      DEFAULT_AI_ENRICHMENT_PROMPT_TEMPLATE,
      /"objects":\[\]/,
    );
    assert.doesNotMatch(
      DEFAULT_AI_ENRICHMENT_PROMPT_TEMPLATE,
      /"centralSubject":""/,
    );
    assert.match(
      DEFAULT_AI_ENRICHMENT_PROMPT_TEMPLATE,
      /readable artwork text accurately/,
    );
    assert.doesNotMatch(
      DEFAULT_AI_ENRICHMENT_PROMPT_TEMPLATE,
      /readableTextLines|halftoneShadow|suggestedNewTags/,
    );
    assert.doesNotMatch(DEFAULT_AI_ENRICHMENT_PROMPT_TEMPLATE, /"prompt":/);
  });

  it("does not admit searchConcepts into the evidence validator corpus", () => {
    const evidence = readFileSync(
      resolve(
        import.meta.dirname,
        "../../../packages/shared/src/utils/catalogAutomationEvidence.ts",
      ),
      "utf8",
    );
    assert.match(evidence, /input\.title/);
    assert.match(evidence, /input\.description/);
    assert.match(evidence, /input\.centralSubject/);
    assert.match(evidence, /visibleText/);
    assert.doesNotMatch(evidence, /searchConcepts/);
  });
});
