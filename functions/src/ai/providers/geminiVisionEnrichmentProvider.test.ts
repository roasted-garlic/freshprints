import assert from "node:assert/strict";
import { describe, it } from "node:test";

import type { CatalogTag } from "../../../../packages/shared/src/types/catalogTag.types";
import { buildVisionRequestBody } from "./geminiVisionEnrichmentProvider";
import { buildSimpleCatalogEnrichmentUserPrompt } from "../simpleCatalogEnrichmentPrompt";
import { DEFAULT_AI_ENRICHMENT_PROMPT_TEMPLATE } from "../../../../packages/shared/src/constants/aiEnrichment.constants";

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

  it("never includes reasoning_effort (Gemini does not support it)", () => {
    const parsed = parseBody();
    assert.equal(parsed.reasoning_effort, undefined);
  });

  it("injects excluded tags and approved category names, but not category descriptions or the approved tag list, into the default user prompt", () => {
    // The default prompt is vision-only plus approved category names: full category descriptions
    // and the approved tag list (names/aliases/preferredWhen) stay resolved server-side
    // (catalogTagResolver.ts, catalogThemeCategoryResolver.ts) and are not sent to the model.
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
    assert.match(textInput.text, /Motherhood/);
    assert.match(textInput.text, /Faith/);
    assert.doesNotMatch(textInput.text, /Use for mom, mama, and family designs\./);
    assert.doesNotMatch(textInput.text, /aliases: mom, mother/);
  });
});
