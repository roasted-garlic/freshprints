import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  buildAiEnrichmentPlaygroundRequestBody,
  validateAiEnrichmentPlaygroundRequest,
} from "./aiEnrichmentPlayground";

const VALID_IMAGE_BASE64 =
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAusB9Wn0gY8AAAAASUVORK5CYII=";

describe("validateAiEnrichmentPlaygroundRequest", () => {
  it("accepts supported models, reasoning effort values, and image types", () => {
    const parsed = validateAiEnrichmentPlaygroundRequest({
      imageBase64: VALID_IMAGE_BASE64,
      imageContentType: "image/png",
      prompt: "Describe this image.",
      reasoningEffort: "none",
      visionModelId: "gpt-5.4-nano-2026-03-17",
    });

    assert.equal(parsed.imageContentType, "image/png");
    assert.equal(parsed.prompt, "Describe this image.");
    assert.equal(parsed.reasoningEffort, "none");
    assert.equal(parsed.visionModelId, "gpt-5.4-nano-2026-03-17");
    assert.ok(parsed.imageBytes.length > 0);
  });

  it("rejects unsupported reasoning effort values", () => {
    assert.throws(
      () =>
        validateAiEnrichmentPlaygroundRequest({
          imageBase64: VALID_IMAGE_BASE64,
          imageContentType: "image/png",
          prompt: "Describe this image.",
          reasoningEffort: "xhigh",
          visionModelId: "gpt-5.4-nano-2026-03-17",
        }),
      /reasoning effort is not allowed/i,
    );
  });

  it("rejects unsupported image content types", () => {
    assert.throws(
      () =>
        validateAiEnrichmentPlaygroundRequest({
          imageBase64: VALID_IMAGE_BASE64,
          imageContentType: "image/gif",
          prompt: "Describe this image.",
          reasoningEffort: "medium",
          visionModelId: "gpt-5.4-nano-2026-03-17",
        }),
      /png, jpeg, or webp/i,
    );
  });
});

describe("validateAiEnrichmentPlaygroundRequest — Gemini", () => {
  it("accepts gemini-2.5-flash-lite as a valid vision model", () => {
    const parsed = validateAiEnrichmentPlaygroundRequest({
      imageBase64: VALID_IMAGE_BASE64,
      imageContentType: "image/png",
      prompt: "Describe this image.",
      reasoningEffort: "medium",
      visionModelId: "gemini-2.5-flash-lite",
    });

    assert.equal(parsed.visionModelId, "gemini-2.5-flash-lite");
  });
});

type ParsedRequestBody = {
  reasoning_effort?: string;
  messages: Array<{
    role: string;
    content: Array<
      | { type: "text"; text: string }
      | { type: "image_url"; image_url: { url: string; detail?: string } }
    >;
  }>;
};

describe("buildAiEnrichmentPlaygroundRequestBody", () => {
  it("includes reasoning_effort for OpenAI models", () => {
    const body = buildAiEnrichmentPlaygroundRequestBody(
      validateAiEnrichmentPlaygroundRequest({
        imageBase64: VALID_IMAGE_BASE64,
        imageContentType: "image/png",
        prompt: "Return JSON only.",
        reasoningEffort: "medium",
        visionModelId: "gpt-5.4-mini-2026-03-17",
      }),
      VALID_IMAGE_BASE64,
      "image/webp",
      "Return JSON only.",
      "You catalog DTF apparel design images.",
      true,
      "medium",
    );

    const parsed = JSON.parse(body) as ParsedRequestBody;

    assert.equal(parsed.reasoning_effort, "medium");

    const userMessage = parsed.messages.find((message) => message.role === "user");
    assert.ok(userMessage);

    const imageInput = userMessage.content.find(
      (part): part is { type: "image_url"; image_url: { url: string; detail?: string } } =>
        part.type === "image_url",
    );

    assert.ok(imageInput);
    assert.equal(imageInput.image_url.detail, "high");
    assert.match(imageInput.image_url.url, /^data:image\/webp;base64,/);
  });

  it("omits reasoning_effort for Gemini models", () => {
    const body = buildAiEnrichmentPlaygroundRequestBody(
      validateAiEnrichmentPlaygroundRequest({
        imageBase64: VALID_IMAGE_BASE64,
        imageContentType: "image/png",
        prompt: "Return JSON only.",
        reasoningEffort: "medium",
        visionModelId: "gemini-2.5-flash-lite",
      }),
      VALID_IMAGE_BASE64,
      "image/webp",
      "Return JSON only.",
      "You catalog DTF apparel design images.",
      false,
      "medium",
    );

    const parsed = JSON.parse(body) as ParsedRequestBody;

    assert.equal(parsed.reasoning_effort, undefined);

    const userMessage = parsed.messages.find((message) => message.role === "user");
    assert.ok(userMessage);

    const imageInput = userMessage.content.find(
      (part): part is { type: "image_url"; image_url: { url: string; detail?: string } } =>
        part.type === "image_url",
    );

    assert.ok(imageInput);
    assert.equal(imageInput.image_url.detail, "high");
  });
});
