import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  buildPass1Context,
  buildAiEnrichmentPlaygroundRequestBody,
  resolveAiEnrichmentPlaygroundPass2Eligibility,
  validateAiEnrichmentPlaygroundRequest,
} from "./aiEnrichmentPlayground";
import { normalizeSimpleCatalogEnrichment } from "./simpleCatalogEnrichmentResponse";

const VALID_IMAGE_BASE64 =
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAusB9Wn0gY8AAAAASUVORK5CYII=";

describe("validateAiEnrichmentPlaygroundRequest", () => {
  it("accepts supported models and image types", () => {
    const parsed = validateAiEnrichmentPlaygroundRequest({
      imageBase64: VALID_IMAGE_BASE64,
      imageContentType: "image/png",
      prompt: "Describe this image.",
      visionModelId: "gemini-2.5-flash-lite",
    });

    assert.equal(parsed.imageContentType, "image/png");
    assert.equal(parsed.prompt, "Describe this image.");
    assert.equal(parsed.visionModelId, "gemini-2.5-flash-lite");
    assert.ok(parsed.imageBytes && parsed.imageBytes.length > 0);
  });

  it("rejects unsupported vision models", () => {
    assert.throws(
      () =>
        validateAiEnrichmentPlaygroundRequest({
          imageBase64: VALID_IMAGE_BASE64,
          imageContentType: "image/png",
          prompt: "Describe this image.",
          visionModelId: "gpt-5.4-nano-2026-03-17",
        }),
      /not allowed/i,
    );
  });

  it("rejects unsupported image content types", () => {
    assert.throws(
      () =>
        validateAiEnrichmentPlaygroundRequest({
          imageBase64: VALID_IMAGE_BASE64,
          imageContentType: "image/gif",
          prompt: "Describe this image.",
          visionModelId: "gemini-2.5-flash-lite",
        }),
      /png, jpeg, or webp/i,
    );
  });

  it("accepts a text-only request with no image", () => {
    const parsed = validateAiEnrichmentPlaygroundRequest({
      prompt: "Return valid JSON with a title field only.",
      visionModelId: "gemini-2.5-flash-lite",
    });

    assert.equal(parsed.imageBytes, undefined);
    assert.equal(parsed.imageContentType, undefined);
    assert.equal(parsed.prompt, "Return valid JSON with a title field only.");
  });

  it("still requires a prompt when no image is provided", () => {
    assert.throws(
      () =>
        validateAiEnrichmentPlaygroundRequest({
          prompt: "",
          visionModelId: "gemini-2.5-flash-lite",
        }),
      /prompt is required/i,
    );
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
  it("never includes reasoning_effort (Gemini does not support it)", () => {
    const body = buildAiEnrichmentPlaygroundRequestBody(
      validateAiEnrichmentPlaygroundRequest({
        imageBase64: VALID_IMAGE_BASE64,
        imageContentType: "image/png",
        prompt: "Return JSON only.",
        visionModelId: "gemini-2.5-flash-lite",
      }),
      VALID_IMAGE_BASE64,
      "image/webp",
      "Return JSON only.",
      "You catalog DTF apparel design images.",
    );

    const parsed = JSON.parse(body) as ParsedRequestBody;

    assert.equal(parsed.reasoning_effort, undefined);

    const userMessage = parsed.messages.find(
      (message) => message.role === "user",
    );
    assert.ok(userMessage);

    const imageInput = userMessage.content.find(
      (
        part,
      ): part is {
        type: "image_url";
        image_url: { url: string; detail?: string };
      } => part.type === "image_url",
    );

    assert.ok(imageInput);
    assert.equal(imageInput.image_url.detail, "high");
    assert.match(imageInput.image_url.url, /^data:image\/webp;base64,/);
  });

  it("omits the image_url content part entirely for a text-only request", () => {
    const body = buildAiEnrichmentPlaygroundRequestBody(
      validateAiEnrichmentPlaygroundRequest({
        prompt: "Return JSON only.",
        visionModelId: "gemini-2.5-flash-lite",
      }),
      undefined,
      undefined,
      "Return JSON only.",
      "You catalog DTF apparel design images.",
    );

    const parsed = JSON.parse(body) as ParsedRequestBody;
    const userMessage = parsed.messages.find(
      (message) => message.role === "user",
    );
    assert.ok(userMessage);

    const imageInput = userMessage.content.find(
      (part) => part.type === "image_url",
    );
    assert.equal(
      imageInput,
      undefined,
      "text-only request must never include an image_url part",
    );

    const textInput = userMessage.content.find((part) => part.type === "text");
    assert.ok(textInput);
  });
});

describe("buildPass1Context", () => {
  it("projects the normalized parse into a bounded semantic context without image bytes", () => {
    const parsed = normalizeSimpleCatalogEnrichment({
      title: "Cat Graphic",
      description: "A cat with whiskers graphic for catalog search.",
      category: "Animals",
      centralSubject: "cat",
      subjects: ["cat", "woman"],
      objects: ["whiskers"],
      visibleText: ["CAT"],
      visualContextProfile: {
        version: "visual-context-v1",
        summary: "A cat graphic.",
        detailedDescription: "A cat appears in a printable graphic.",
      },
    });
    const context = buildPass1Context({
      parsed,
      providerId: "google",
      modelId: "gemini-2.5-flash-lite",
      categories: {
        categories: [{ id: "animals", name: "Animals" }],
        names: ["Animals"],
        idsByName: { animals: "animals" },
      },
      smartProfileVocab: { lists: {} },
      settings: {
        visionModelId: "gemini-2.5-flash-lite",
        promptTemplate: "prompt",
        additionalTagExclusions: [],
        semanticReviewerEnabled: false,
        semanticReviewerModelId: "gemini-2.5-flash-lite",
        catalogWorkflowMode: "shadow",
        catalogAutonomousLiveEnabled: false,
        explicitContentAutomationTerms: [],
        settingsReadFailed: false,
      },
    });

    assert.deepEqual(context.normalized.subjects, ["cat", "woman"]);
    assert.equal(context.categoryId, "animals");
    assert.equal(context.originalSmartProfile.categoryName, "Animals");
    assert.ok(context.originalSmartProfile.provenance);
    assert.ok(context.normalized.visualContextProfile);
    assert.deepEqual(context.objectiveBlockers, []);
    assert.ok(context.semanticBlockers.length > 0);
    assert.equal(context.pass2Eligibility, "eligible");
    assert.ok(context.automationDecision);
    assert.equal(context.semanticReviewerEnabled, false);
    assert.equal(JSON.stringify(context).includes(VALID_IMAGE_BASE64), false);
    assert.equal(JSON.stringify(context).includes("tagRerank"), false);
  });
});

describe("resolveAiEnrichmentPlaygroundPass2Eligibility", () => {
  const visualContextProfile = {
    summary: "A summary.",
    detailedDescription: "A detailed description.",
  };

  it("returns each reviewed eligibility state", () => {
    assert.equal(
      resolveAiEnrichmentPlaygroundPass2Eligibility({
        objectiveBlockers: [],
        semanticBlockers: ["structured_evidence_gap:subjects:woman"],
        visualContextProfile,
      }),
      "eligible",
    );
    assert.equal(
      resolveAiEnrichmentPlaygroundPass2Eligibility({
        objectiveBlockers: [],
        semanticBlockers: [],
        visualContextProfile,
      }),
      "not_needed",
    );
    assert.equal(
      resolveAiEnrichmentPlaygroundPass2Eligibility({
        objectiveBlockers: ["category_unresolved"],
        semanticBlockers: ["structured_evidence_gap:subjects:woman"],
        visualContextProfile,
      }),
      "blocked_by_objective",
    );
    assert.equal(
      resolveAiEnrichmentPlaygroundPass2Eligibility({
        objectiveBlockers: [],
        semanticBlockers: ["structured_evidence_gap:subjects:woman"],
      }),
      "unavailable",
    );
  });
});
