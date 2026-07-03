import assert from "node:assert/strict";
import { describe, it } from "node:test";

import type { ApprovedTagCandidate } from "./catalogTagResolver";
import {
  buildCatalogTagRerankRequestBody,
  buildCatalogTagRerankUserPrompt,
  validateTagRerankTags,
} from "./catalogTagRerankProvider";

function candidate(name: string): ApprovedTagCandidate {
  return { matchedBy: [name], name, reason: "Matched via exact name or alias match" };
}

function baseRerankInput() {
  return {
    approvedTagCandidates: [candidate("motherhood")],
    firstResponse: {
      category: "Family",
      description: "A design about motherhood.",
      tags: ["motherhood"],
      title: "Mom Life",
    },
    resolvedCategoryName: "Family",
  };
}

describe("catalogTagRerankProvider — request shape", () => {
  it("builds a text-only request body with no image_url content part", () => {
    const body = JSON.parse(buildCatalogTagRerankRequestBody("gemini-2.5-flash-lite", "prompt text", 500)) as {
      messages: Array<{ role: string; content: unknown }>;
    };

    const userMessage = body.messages.find((message) => message.role === "user");
    assert.ok(userMessage);
    assert.equal(typeof userMessage.content, "string", "user content must be a plain string, no image_url part");
    assert.ok(!JSON.stringify(body).includes("image_url"), "request body must never contain image_url");
  });
});

describe("catalogTagRerankProvider — validateTagRerankTags", () => {
  it("keeps only tags present in approvedTagCandidates", () => {
    const result = validateTagRerankTags(["motherhood", "skeleton"], [candidate("motherhood"), candidate("skeleton")]);

    assert.deepEqual(result.validTags, ["motherhood", "skeleton"]);
    assert.deepEqual(result.discardedTags, []);
  });

  it("review note 5: keeps valid tags and discards invalid tags from a mixed response", () => {
    const result = validateTagRerankTags(
      ["motherhood", "invented-tag", "skeleton", "another-invented-one"],
      [candidate("motherhood"), candidate("skeleton")],
    );

    assert.deepEqual(result.validTags, ["motherhood", "skeleton"]);
    assert.deepEqual(result.discardedTags, ["invented-tag", "another-invented-one"]);
  });

  it("discards every tag when none are in approvedTagCandidates", () => {
    const result = validateTagRerankTags(["invented-a", "invented-b"], [candidate("motherhood")]);

    assert.deepEqual(result.validTags, []);
    assert.deepEqual(result.discardedTags, ["invented-a", "invented-b"]);
  });

  it("handles non-array input safely", () => {
    const result = validateTagRerankTags("not-an-array", [candidate("motherhood")]);

    assert.deepEqual(result.validTags, []);
    assert.deepEqual(result.discardedTags, []);
  });

  it("dedupes and normalizes case/whitespace", () => {
    const result = validateTagRerankTags(["Motherhood", " motherhood ", "MOTHERHOOD"], [candidate("motherhood")]);

    assert.deepEqual(result.validTags, ["motherhood"]);
  });
});

describe("catalogTagRerankProvider — merged suggestion-authoring prompt", () => {
  it("omits the suggestions section and response field when suggestionAuthorInput is not provided", () => {
    const prompt = buildCatalogTagRerankUserPrompt(baseRerankInput());

    assert.ok(!prompt.includes('"suggestions"'), "response shape must not request suggestions");
    assert.ok(!prompt.includes("second task"), "must not include the merged-call authoring instructions");
  });

  it("includes the suggestions section and response field when suggestionAuthorInput is provided", () => {
    const prompt = buildCatalogTagRerankUserPrompt({
      ...baseRerankInput(),
      suggestionAuthorInput: {
        candidateNames: ["skateboard"],
        exampleApprovedTags: [{ aliases: ["board"], name: "skate", preferredWhen: "Use when skating is shown." }],
      },
    });

    assert.ok(prompt.includes('"suggestions"'), "response shape must request suggestions when merged");
    assert.ok(prompt.includes("skateboard"), "must include the candidate list");
    assert.ok(prompt.includes("skate"), "must include the calibration example");
  });
});
