import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { buildVisionRequestBody } from "./geminiVisionEnrichmentProvider";
import { buildSimpleCatalogEnrichmentUserPrompt } from "../simpleCatalogEnrichmentPrompt";
import { DEFAULT_AI_ENRICHMENT_PROMPT_TEMPLATE } from "../../../../packages/shared/src/constants/aiEnrichment.constants";

describe("buildVisionRequestBody", () => {
  function buildUserPrompt() {
    return buildSimpleCatalogEnrichmentUserPrompt({
      approvedCategories: [
        {
          id: "motherhood",
          name: "Motherhood",
          description: "Use for mom, mama, and family designs.",
        },
        {
          id: "faith",
          name: "Faith",
          description: "Use for religious and inspirational designs.",
        },
      ],
      approvedCategoryNames: ["Motherhood", "Faith"],
      promptTemplate: DEFAULT_AI_ENRICHMENT_PROMPT_TEMPLATE,
    });
  }

  function parseBody() {
    const body = buildVisionRequestBody(
      "gemini-2.5-flash-lite",
      buildUserPrompt(),
      "ZmFrZS1pbWFnZS1ieXRlcw==",
      "image/webp",
      2500,
      "System prompt",
    );

    return JSON.parse(body) as {
      reasoning_effort?: string;
      response_format?: { type: string; json_schema: { name: string; strict: boolean; schema: unknown } };
      messages: Array<{
        role: string;
        content:
          | string
          | Array<
              | { type: "text"; text: string }
              | { type: "image_url"; image_url: { url: string; detail?: string } }
            >;
      }>;
    };
  }

  it("sends image detail high for catalog analysis", () => {
    const parsed = parseBody();

    const userMessage = parsed.messages.find((message) => message.role === "user");
    assert.ok(userMessage);
    assert.ok(Array.isArray(userMessage.content));

    const imageInput = userMessage.content.find(
      (part): part is { type: "image_url"; image_url: { url: string; detail?: string } } =>
        typeof part === "object" && part.type === "image_url",
    );

    assert.ok(imageInput);
    assert.equal(imageInput.image_url.detail, "high");
    assert.match(imageInput.image_url.url, /^data:image\/webp;base64,/);
  });

  it("uses strict structured output with the canonical response schema", () => {
    const parsed = parseBody();
    assert.equal(parsed.response_format?.type, "json_schema");
    assert.equal(parsed.response_format?.json_schema.name, "catalog_enrichment");
    assert.equal(parsed.response_format?.json_schema.strict, true);
  });

  it("never includes reasoning_effort (Gemini does not support it)", () => {
    const parsed = parseBody();
    assert.equal(parsed.reasoning_effort, undefined);
  });

  it("injects approved category names+descriptions; default v37+ does not embed tag exclusion lists", () => {
    // Default prompt uses {{approved_categories}} (name — description). Tag taxonomy
    // (names/aliases/preferredWhen) stays resolved server-side and is not sent to the model.
    // catalog-enrich-v37+ also omits {{excluded_tags}} from the default template.
    const parsed = parseBody();
    const userMessage = parsed.messages.find((message) => message.role === "user");
    assert.ok(userMessage);
    assert.ok(Array.isArray(userMessage.content));

    const textInput = userMessage.content.find(
      (part): part is { type: "text"; text: string } =>
        typeof part === "object" && part.type === "text",
    );

    assert.ok(textInput);
    assert.match(textInput.text, /Motherhood/);
    assert.match(textInput.text, /Faith/);
    assert.match(textInput.text, /Use for mom, mama, and family designs\./);
    assert.doesNotMatch(textInput.text, /aliases: mom, mother/);
    assert.doesNotMatch(textInput.text, /Use when motherhood is the main searchable idea/);
    assert.doesNotMatch(textInput.text, /\{\{excluded_tags\}\}/);
  });
});
