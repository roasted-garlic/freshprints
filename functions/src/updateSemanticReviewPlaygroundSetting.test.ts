import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  assertOwnerCaller,
  validateEnabled,
} from "./updateSemanticReviewPlaygroundSetting";
import { resolveSemanticReviewPlaygroundEnabled } from "./ai/loadAiEnrichmentSettings";

describe("Semantic Review Playground setting boundary", () => {
  it("resolves only literal true as enabled and fails closed otherwise", () => {
    assert.equal(resolveSemanticReviewPlaygroundEnabled(true), true);
    assert.equal(resolveSemanticReviewPlaygroundEnabled(false), false);
    assert.equal(resolveSemanticReviewPlaygroundEnabled(undefined), false);
    assert.equal(resolveSemanticReviewPlaygroundEnabled(null), false);
    assert.equal(resolveSemanticReviewPlaygroundEnabled("true"), false);
    assert.equal(resolveSemanticReviewPlaygroundEnabled(1), false);
  });

  it("pins Gen2 public invoker so CORS preflight is not rejected by Cloud Run IAM", async () => {
    const source = await import("node:fs").then((fs) =>
      fs.readFileSync(new URL("./updateSemanticReviewPlaygroundSetting.ts", import.meta.url), "utf8"),
    );
    assert.match(source, /invoker:\s*["']public["']/);
    assert.match(
      source,
      /onCall\(\s*\{\s*invoker:\s*["']public["']\s*\}\s*,/,
    );
  });

  it("accepts only a boolean enabled payload", () => {
    assert.equal(validateEnabled({ enabled: true }), true);
    assert.equal(validateEnabled({ enabled: false }), false);
    assert.throws(() => validateEnabled({}), /enabled must be a boolean/i);
    assert.throws(() => validateEnabled({ enabled: "true" }), /enabled must be a boolean/i);
  });

  it("allows an active owner and denies admins/inactive callers", () => {
    assert.doesNotThrow(() =>
      assertOwnerCaller({ isActive: true, role: "owner" } as never),
    );
    assert.throws(
      () => assertOwnerCaller({ isActive: true, role: "admin" } as never),
      /only the owner/i,
    );
    assert.throws(
      () => assertOwnerCaller({ isActive: false, role: "owner" } as never),
      /only the owner/i,
    );
  });
});
