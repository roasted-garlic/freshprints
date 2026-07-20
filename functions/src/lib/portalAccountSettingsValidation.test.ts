import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  isValidPortalAccountEmail,
  normalizePortalAccountEmail,
  validateDeletionConfirmation,
} from "./portalAccountSettingsValidation";

describe("portalAccountSettingsValidation", () => {
  it("normalizes email", () => {
    assert.equal(normalizePortalAccountEmail("  Alex@Example.COM "), "alex@example.com");
  });

  it("validates email shape", () => {
    assert.equal(isValidPortalAccountEmail("alex@example.com"), true);
    assert.equal(isValidPortalAccountEmail("not-an-email"), false);
  });

  it("requires DELETE confirmation", () => {
    assert.equal(validateDeletionConfirmation(" delete "), "DELETE");
    assert.throws(() => validateDeletionConfirmation("remove"), /Type DELETE/);
    assert.throws(() => validateDeletionConfirmation(null), /Type DELETE/);
  });
});
