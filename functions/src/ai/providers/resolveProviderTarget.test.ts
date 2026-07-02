import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { resolveProviderTarget, GEMINI_CHAT_COMPLETIONS_URL } from "./resolveProviderTarget";

describe("resolveProviderTarget", () => {
  it("always targets the Google provider", () => {
    const target = resolveProviderTarget();
    assert.equal(target.providerId, "google");
    assert.equal(target.baseUrl, GEMINI_CHAT_COMPLETIONS_URL);
  });
});
