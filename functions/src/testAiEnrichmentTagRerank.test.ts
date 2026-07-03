import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { HttpsError } from "firebase-functions/v2/https";

import { assertOwnerAdminCaller } from "./testAiEnrichmentTagRerank";
import type { TeamUserProfile } from "./lib/types";

function caller(overrides: Partial<TeamUserProfile> = {}): TeamUserProfile {
  return {
    id: "user-1",
    email: "user@example.com",
    displayName: "User",
    role: "helper",
    isActive: true,
    ...overrides,
  };
}

describe("testAiEnrichmentTagRerank — assertOwnerAdminCaller (review note 2)", () => {
  it("allows an active owner", () => {
    assert.doesNotThrow(() => assertOwnerAdminCaller(caller({ role: "owner" })));
  });

  it("allows an active admin", () => {
    assert.doesNotThrow(() => assertOwnerAdminCaller(caller({ role: "admin" })));
  });

  it("rejects a non-owner/admin caller (helper), matching the existing Playground gate", () => {
    assert.throws(() => assertOwnerAdminCaller(caller({ role: "helper" })), (error) => {
      assert.ok(error instanceof HttpsError);
      assert.equal(error.code, "permission-denied");
      return true;
    });
  });

  it("rejects an inactive owner", () => {
    assert.throws(() => assertOwnerAdminCaller(caller({ role: "owner", isActive: false })), (error) => {
      assert.ok(error instanceof HttpsError);
      assert.equal(error.code, "permission-denied");
      return true;
    });
  });
});
