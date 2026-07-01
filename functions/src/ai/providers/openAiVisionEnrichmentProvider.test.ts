import assert from "node:assert/strict";
import { describe, it } from "node:test";

import type { CatalogTag } from "../../../../shared/types/catalogTag.types";
import { buildVisionRequestBody } from "./openAiVisionEnrichmentProvider";
import { buildSimpleCatalogEnrichmentUserPrompt } from "../simpleCatalogEnrichmentPrompt";
import { DEFAULT_AI_ENRICHMENT_PROMPT_TEMPLATE } from "../../../../shared/constants/aiEnrichment.constants";

describe("buildVisionRequestBody", () => {
  function catalogTag(input: Pick<CatalogTag, "name" | "aliases" | "preferredWhen">): CatalogTag {
    return {
      ...input,
      createdAt: null,
      createdBy: "owner-1",
      id: input.name,
      status: "approved",
      updatedAt: null,
      updatedBy: "owner-1",
    };
  }

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
      approvedTags: [
        catalogTag({
          aliases: ["mom", "mother"],
          name: "mama",
          preferredWhen: "Use when motherhood is the main searchable idea.",
        }),
        catalogTag({
          aliases: ["vintage"],
          name: "retro",
          preferredWhen: "Use when artwork has 1970s or vintage styling.",
        }),
      ],
      approvedTagNames: ["mama", "retro", "floral"],
      effectiveTagExclusions: ["death"],
      promptTemplate: DEFAULT_AI_ENRICHMENT_PROMPT_TEMPLATE,
    });
  }

  function parseBody(supportsReasoningEffort = true) {
    const body = buildVisionRequestBody(
      "gpt-5.4-nano-2026-03-17",
      buildUserPrompt(),
      "ZmFrZS1pbWFnZS1ieXRlcw==",
      "image/webp",
      {
        maxCompletionTokens: 2500,
        reasoningEffort: "medium",
        supportsReasoningEffort,
      },
      "System prompt",
    );

    return JSON.parse(body) as {
      reasoning_effort?: string;
      response_format?: unknown;
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

  it("does not force response_format json_object (playground-style request)", () => {
    const parsed = parseBody();
    assert.equal(parsed.response_format, undefined);
  });

  it("includes reasoning_effort when supportsReasoningEffort is true", () => {
    const parsed = parseBody(true);
    assert.equal(parsed.reasoning_effort, "medium");
  });

  it("omits reasoning_effort when supportsReasoningEffort is false (Gemini)", () => {
    const parsed = parseBody(false);
    assert.equal(parsed.reasoning_effort, undefined);
  });

  it("injects excluded tags but not the full approved category/tag list into the default v18 user prompt", () => {
    // v18 is vision-only: approved taxonomy resolution moved server-side (catalogTagResolver.ts,
    // catalogThemeCategoryResolver.ts). The default template only substitutes {{excluded_tags}}.
    const parsed = parseBody();
    const userMessage = parsed.messages.find((message) => message.role === "user");
    assert.ok(userMessage);
    assert.ok(Array.isArray(userMessage.content));

    const textInput = userMessage.content.find(
      (part): part is { type: "text"; text: string } =>
        typeof part === "object" && part.type === "text",
    );

    assert.ok(textInput);
    assert.match(textInput.text, /death/);
    assert.doesNotMatch(textInput.text, /Motherhood/);
    assert.doesNotMatch(textInput.text, /aliases: mom, mother/);
  });
});
