import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { validateCreatePortalPrintRequestRequest } from "./createPortalPrintRequestValidation";

describe("validateCreatePortalPrintRequestRequest", () => {
  it("accepts empty payload", () => {
    assert.deepEqual(validateCreatePortalPrintRequestRequest(undefined), {});
    assert.deepEqual(validateCreatePortalPrintRequestRequest({}), {});
  });

  it("accepts optional trimmed notes", () => {
    assert.deepEqual(validateCreatePortalPrintRequestRequest({ notes: "  Rush order  " }), {
      notes: "Rush order",
    });
  });

  it("rejects notes that are too long", () => {
    assert.throws(
      () => validateCreatePortalPrintRequestRequest({ notes: "x".repeat(2001) }),
      /2000 characters/i,
    );
  });
});
