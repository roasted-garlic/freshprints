import assert from "node:assert/strict";
import test from "node:test";
import { sanitizeProviderError } from "./providerErrorSanitizer";
test("provider sanitizer retains bounded diagnostics and strips secrets/body", () => {
  const value = sanitizeProviderError({ status: 400, error: { code: "INVALID", message: "bad schema", apiKey: "secret", details: { token: "x" } }, headers: { authorization: "Bearer x" }, body: "unbounded" });
  assert.deepEqual(value, { status: 400, code: "INVALID", message: "bad schema", retryable: false, classification: "provider_request_rejected" });
  assert.equal("apiKey" in value, false); assert.equal("headers" in value, false);
});
