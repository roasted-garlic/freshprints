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
