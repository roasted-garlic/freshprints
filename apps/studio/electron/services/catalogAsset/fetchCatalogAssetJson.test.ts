import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { CatalogAssetFetchError, fetchCatalogAssetJson } from "./fetchCatalogAssetJson";

describe("fetchCatalogAssetJson host allowlist", () => {
  it("rejects a non-Firebase-Storage host before any fetch occurs", async () => {
    await assert.rejects(
      () => fetchCatalogAssetJson("https://evil.example.com/generated/portal-catalog/manifest.json"),
      /Only Firebase Storage download URLs can be fetched\./,
    );
  });

  it("rejects a non-https URL", async () => {
    await assert.rejects(
      () => fetchCatalogAssetJson("http://firebasestorage.googleapis.com/v0/b/x/o/y"),
      /Only Firebase Storage download URLs can be fetched\./,
    );
  });

  it("rejects a malformed URL", async () => {
    await assert.rejects(
      () => fetchCatalogAssetJson("not-a-url"),
      /Only Firebase Storage download URLs can be fetched\./,
    );
  });

  it("returns parsed JSON with sanitized HTTP diagnostics on success", async () => {
    const result = await fetchCatalogAssetJson(
      "https://firebasestorage.googleapis.com/v0/b/test/o/manifest",
      async () => new Response('{"schemaVersion":1}', { status: 200 }),
    );
    assert.deepEqual(result.json, { schemaVersion: 1 });
    assert.equal(result.diagnostics.httpStatus, 200);
    assert.ok(result.diagnostics.durationMs >= 0);
  });

  it("classifies transport failures without exposing a URL", async () => {
    await assert.rejects(
      () =>
        fetchCatalogAssetJson(
          "https://firebasestorage.googleapis.com/v0/b/test/o/manifest",
          async () => {
            throw new Error("network failure with sensitive details");
          },
        ),
      (error: unknown) => {
        assert.ok(error instanceof CatalogAssetFetchError);
        assert.equal(error.diagnostics.failureStage, "http-request");
        assert.equal(error.diagnostics.failureCode, "storage-http-request-failed");
        assert.doesNotMatch(error.message, /firebasestorage|sensitive/);
        return true;
      },
    );
  });

  it("classifies invalid JSON after a successful HTTP response", async () => {
    await assert.rejects(
      () =>
        fetchCatalogAssetJson(
          "https://firebasestorage.googleapis.com/v0/b/test/o/manifest",
          async () => new Response("not-json", { status: 200 }),
        ),
      (error: unknown) => {
        assert.ok(error instanceof CatalogAssetFetchError);
        assert.equal(error.diagnostics.failureStage, "json-parsing");
        assert.equal(error.diagnostics.httpStatus, 200);
        return true;
      },
    );
  });
});
