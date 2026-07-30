import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { HttpsError } from "firebase-functions/v2/https";

import {
  validateEtsySuggestionRequestInput,
  validateSuggestionRequestId,
} from "./etsySuggestionRequestValidation";

describe("validateEtsySuggestionRequestInput", () => {
  it("accepts a subject label", () => {
    const result = validateEtsySuggestionRequestInput({
      kind: "subject",
      label: "  Axolotl dad  ",
    });
    assert.equal(result.kind, "subject");
    assert.equal(result.label, "Axolotl dad");
    assert.equal(result.apiToken, "Axolotl dad");
    assert.equal(result.labelKey, "axolotl dad");
  });

  it("accepts an optional subject apiToken", () => {
    const result = validateEtsySuggestionRequestInput({
      kind: "subject",
      label: "Axolotl dad",
      apiToken: " axolotl father ",
    });
    assert.equal(result.apiToken, "axolotl father");
  });

  it("rejects empty label", () => {
    assert.throws(
      () => validateEtsySuggestionRequestInput({ kind: "style", label: "   " }),
      (error: unknown) => error instanceof HttpsError && error.code === "invalid-argument",
    );
  });

  it("rejects invalid kind", () => {
    assert.throws(
      () => validateEtsySuggestionRequestInput({ kind: "color", label: "Blue" }),
      (error: unknown) => error instanceof HttpsError && error.code === "invalid-argument",
    );
  });

  it("preserves whitespace normalization and rejects remaining ASCII control boundaries", () => {
    assert.equal(
      validateEtsySuggestionRequestInput({ kind: "style", label: "A\tB\nC" }).label,
      "A B C",
    );
    for (const control of ["\u0000", "\u001f", "\u007f"]) {
      assert.throws(
        () => validateEtsySuggestionRequestInput({ kind: "style", label: `A${control}B` }),
        (error: unknown) => error instanceof HttpsError && error.code === "invalid-argument",
      );
    }
    assert.equal(
      validateEtsySuggestionRequestInput({ kind: "style", label: "A\u0080B" }).label,
      "A\u0080B",
    );
  });
});

describe("validateSuggestionRequestId", () => {
  it("returns trimmed request id", () => {
    assert.equal(validateSuggestionRequestId({ requestId: " abc123 " }), "abc123");
  });

  it("rejects missing id", () => {
    assert.throws(
      () => validateSuggestionRequestId({}),
      (error: unknown) => error instanceof HttpsError && error.code === "invalid-argument",
    );
  });
});
