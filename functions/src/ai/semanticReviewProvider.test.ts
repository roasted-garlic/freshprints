import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { resolveProviderTarget } from "./providers/resolveProviderTarget";
import {
  callSemanticReviewer,
  describeSemanticReviewPayload,
  extractSemanticReviewContent,
} from "./semanticReviewProvider";
import { SemanticReviewError } from "./semanticReviewErrors";
import { buildSemanticReviewResponseFormat } from "./semanticReviewSchema";

const providerTarget = resolveProviderTarget("google");

async function withMockFetch(
  responseFactory: () => Response,
  run: () => Promise<void>,
): Promise<void> {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async () => responseFactory();
  try {
    await run();
  } finally {
    globalThis.fetch = originalFetch;
  }
}

function baseInput() {
  return {
    apiKey: "test-only-key",
    providerTarget,
    modelId: "gemini-2.5-flash-lite",
    prompt: "Review the supplied catalog context.",
    designId: "test-design",
    currentSmartProfile: { subjects: ["girl"] },
  };
}

describe("semantic review provider diagnostics", () => {
  it("describes response shape without retaining provider content", () => {
    assert.deepEqual(
      describeSemanticReviewPayload({
        choices: [
          {
            finish_reason: "stop",
            message: { content: [{ type: "text", text: "fixture" }] },
          },
        ],
        usage: { prompt_tokens: 11, completion_tokens: 5 },
      }),
      {
        responseContentShape: "text_parts",
        responseChoiceCount: 1,
        responseHasMessage: true,
        finishReason: "stop",
        promptTokens: 11,
        completionTokens: 5,
      },
    );
  });

  it("classifies upstream, extraction, malformed, and semantic validation failures", async () => {
    await withMockFetch(
      () =>
        new Response(JSON.stringify({ error: { message: "bad request" } }), {
          status: 400,
          headers: { "content-type": "application/json" },
        }),
      async () => {
        await assert.rejects(
          () => callSemanticReviewer(baseInput()),
          (error: unknown) =>
            error instanceof SemanticReviewError &&
            error.category === "provider_upstream_failure" &&
            error.stage === "provider_request" &&
            error.diagnostics.httpStatus === 400,
        );
      },
    );

    await withMockFetch(
      () => new Response(JSON.stringify({ choices: [{}] }), { status: 200 }),
      async () => {
        await assert.rejects(
          () => callSemanticReviewer(baseInput()),
          (error: unknown) =>
            error instanceof SemanticReviewError &&
            error.category === "response_extraction_failure" &&
            error.stage === "response_extraction" &&
            error.diagnostics.responseContentShape === "missing_message",
        );
      },
    );

    await withMockFetch(
      () => new Response("not-json", { status: 200 }),
      async () => {
        await assert.rejects(
          () => callSemanticReviewer(baseInput()),
          (error: unknown) =>
            error instanceof SemanticReviewError &&
            error.category === "malformed_json" &&
            error.stage === "json_parse",
        );
      },
    );

    await withMockFetch(
      () =>
        new Response(
          JSON.stringify({
            choices: [
              {
                message: {
                  content: JSON.stringify({
                    decision: "APPROVE_WITH_PATCH",
                    reason: "stale",
                    patches: [
                      { field: "subjects", from: ["person"], to: ["woman"] },
                    ],
                  }),
                },
              },
            ],
          }),
          { status: 200 },
        ),
      async () => {
        await assert.rejects(
          () => callSemanticReviewer(baseInput()),
            (error: unknown) =>
              error instanceof SemanticReviewError &&
              error.category === "patch_validation_failure" &&
              error.stage === "patch_validation" &&
              error.diagnostics.rawProviderResponse === undefined,
        );
      },
    );
  });

  it("sends a text-only Pass 2 body and returns usage/cost without an image", async () => {
    let requestBody: Record<string, unknown> | undefined;
    let callbackBody: Record<string, unknown> | undefined;
    await withMockFetch(
      () =>
        new Response(
          JSON.stringify({
            choices: [
              {
                finish_reason: "stop",
                message: {
                  content: JSON.stringify({
                    decision: "APPROVE",
                    reason: "The evidence is sufficient.",
                  }),
                },
              },
            ],
            usage: { prompt_tokens: 10, completion_tokens: 4 },
          }),
          { status: 200 },
        ),
      async () => {
        const originalFetch = globalThis.fetch;
        globalThis.fetch = async (_url, init) => {
          requestBody = JSON.parse(String(init?.body)) as Record<string, unknown>;
          return new Response(
            JSON.stringify({
              choices: [
                {
                  finish_reason: "stop",
                  message: {
                    content: JSON.stringify({
                      decision: "APPROVE",
                      reason: "The evidence is sufficient.",
                    }),
                  },
                },
              ],
              usage: { prompt_tokens: 10, completion_tokens: 4 },
            }),
            { status: 200 },
          );
        };
        try {
          const result = await callSemanticReviewer({
            ...baseInput(),
            onRequestReady: (body) => {
              callbackBody = body as unknown as Record<string, unknown>;
            },
          });
          assert.equal(result.result.decision, "APPROVE");
          assert.equal(result.promptTokens, 10);
          assert.equal(result.completionTokens, 4);
          assert.equal(typeof result.estimatedCostUsd, "number");
          assert.equal(result.diagnostics.category, "success");
        } finally {
          globalThis.fetch = originalFetch;
        }
      },
    );
    assert.equal(requestBody?.model, "gemini-2.5-flash-lite");
    assert.deepEqual(callbackBody, requestBody);
    assert.deepEqual(Object.keys(callbackBody ?? {}), [
      "model",
      "max_completion_tokens",
      "response_format",
      "messages",
    ]);
    assert.equal(requestBody?.max_completion_tokens, 1200);
    assert.deepEqual(
      requestBody?.response_format,
      buildSemanticReviewResponseFormat(),
    );
    assert.equal(
      JSON.stringify(requestBody).includes("image"),
      false,
    );
  });

  it("captures the patch-validation snapshot on a no-op without exposing credentials", async () => {
    let calls = 0;
    const originalFetch = globalThis.fetch;
    globalThis.fetch = async () => {
      calls += 1;
      return new Response(
        JSON.stringify({
          choices: [
            {
              finish_reason: "stop",
              message: {
                content: JSON.stringify({
                  decision: "APPROVE_WITH_PATCH",
                  reason: "The subject is already present.",
                  patches: { subjects: ["girl"] },
                }),
              },
            },
          ],
        }),
        { status: 200 },
      );
    };
    try {
      await assert.rejects(
        () =>
          callSemanticReviewer({
            ...baseInput(),
            currentSmartProfile: { subjects: ["Girl"] },
          }),
        (error: unknown) => {
          if (!(error instanceof SemanticReviewError)) return false;
          const snapshot = error.diagnostics.patchValidation as {
            currentSmartProfile?: Record<string, string[]>;
            rawProviderPatch?: unknown;
            canonicalFrom?: unknown;
            canonicalTo?: unknown;
            validationResult?: { reason?: string };
          } | undefined;
          assert.deepEqual(snapshot?.currentSmartProfile, { subjects: ["Girl"] });
          assert.deepEqual(snapshot?.rawProviderPatch, { subjects: ["girl"] });
          assert.deepEqual(snapshot?.canonicalFrom, [{ field: "subjects", values: ["girl"] }]);
          assert.deepEqual(snapshot?.canonicalTo, [{ field: "subjects", values: ["girl"] }]);
          assert.match(snapshot?.validationResult?.reason ?? "", /no-op/i);
          assert.equal(JSON.stringify(error.diagnostics).includes("test-only-key"), false);
          return error.category === "semantic_review_noop" &&
            error.message === "Semantic Review proposed no effective change. No changes were applied.";
        },
      );
      assert.equal(calls, 1);
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  it("sends the same strict v4 schema for Google and OpenAI targets", async () => {
    const originalFetch = globalThis.fetch;
    const requestBodies: Array<Record<string, unknown>> = [];
    globalThis.fetch = async (_url, init) => {
      requestBodies.push(JSON.parse(String(init?.body)) as Record<string, unknown>);
      return new Response(
        JSON.stringify({
          choices: [
            {
              finish_reason: "stop",
              message: {
                content: JSON.stringify({
                  decision: "APPROVE",
                  reason: "The evidence is sufficient.",
                  blockersResolved: [],
                  blockersUnresolved: [],
                }),
              },
            },
          ],
          usage: { prompt_tokens: 10, completion_tokens: 4 },
        }),
        { status: 200 },
      );
    };
    try {
      for (const target of [resolveProviderTarget("google"), resolveProviderTarget("openai")]) {
        await callSemanticReviewer({ ...baseInput(), providerTarget: target });
      }
    } finally {
      globalThis.fetch = originalFetch;
    }

    assert.equal(requestBodies.length, 2);
    for (const requestBody of requestBodies) {
      assert.deepEqual(requestBody.response_format, buildSemanticReviewResponseFormat());
      assert.equal(requestBody.max_completion_tokens, 1200);
      assert.equal(JSON.stringify(requestBody).includes("image"), false);
    }
  });

  it("keeps the captured field/value response fail-closed with one provider call", async () => {
    let calls = 0;
    const originalFetch = globalThis.fetch;
    globalThis.fetch = async () => {
      calls += 1;
      return new Response(
        JSON.stringify({
          choices: [
            {
              finish_reason: "stop",
              message: {
                content: `\`\`\`json
{
  "decision": "APPROVE_WITH_PATCH",
  "reason": "The visual context supports the subject update.",
  "blockersResolved": [],
  "blockersUnresolved": ["structured_evidence_gap:subjects:nature"],
  "patches": [{"field": "subjects", "value": ["Flowers", "Nature", "Wildflowers"]}]
}
\`\`\``,
              },
            },
          ],
          usage: { prompt_tokens: 1338, completion_tokens: 150 },
        }),
        { status: 200 },
      );
    };
    try {
      await assert.rejects(
          () =>
            callSemanticReviewer({
              ...baseInput(),
              captureFullTrace: true,
              currentSmartProfile: { subjects: ["Flowers", "Nature"] },
            }),
          (error: unknown) =>
            error instanceof SemanticReviewError &&
          error.category === "patch_validation_failure" &&
          error.stage === "patch_validation" &&
          error.diagnostics.validationFault === "patch_validation_failed" &&
          error.diagnostics.rejectionReason ===
            "Unsupported semantic review patch field: subjects" &&
          error.diagnostics.sanitizedExtractedExcerpt?.includes('"value"') &&
          error.diagnostics.rawProviderResponse !== undefined,
      );
    } finally {
      globalThis.fetch = originalFetch;
    }
    assert.equal(calls, 1);
  });

  it("extracts text from both string and text-part responses", () => {
    assert.equal(
      extractSemanticReviewContent({
        choices: [{ message: { content: "fixture" } }],
      }),
      "fixture",
    );
    assert.equal(
      extractSemanticReviewContent({
        choices: [
          {
            message: {
              content: [
                { type: "text", text: "one" },
                { type: "text", text: "two" },
              ],
            },
          },
        ],
      }),
      "onetwo",
    );
  });
});
