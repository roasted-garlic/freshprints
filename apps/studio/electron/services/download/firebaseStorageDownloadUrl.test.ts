import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { isAllowedFirebaseStorageDownloadUrl } from "./firebaseStorageDownloadUrl";

describe("isAllowedFirebaseStorageDownloadUrl", () => {
  it("allows the legacy firebasestorage.googleapis.com host", () => {
    assert.equal(
      isAllowedFirebaseStorageDownloadUrl("https://firebasestorage.googleapis.com/v0/b/x/o/y"),
      true,
    );
  });

  it("allows storage.googleapis.com", () => {
    assert.equal(isAllowedFirebaseStorageDownloadUrl("https://storage.googleapis.com/bucket/object"), true);
  });

  it("allows the newer <bucket>.firebasestorage.app hostname", () => {
    assert.equal(
      isAllowedFirebaseStorageDownloadUrl("https://fresh-prints-dev.firebasestorage.app/o/path"),
      true,
    );
  });

  it("rejects an unrelated host", () => {
    assert.equal(isAllowedFirebaseStorageDownloadUrl("https://evil.example.com/x"), false);
  });

  it("rejects http (non-https)", () => {
    assert.equal(isAllowedFirebaseStorageDownloadUrl("http://firebasestorage.googleapis.com/x"), false);
  });

  it("rejects a malformed URL without throwing", () => {
    assert.equal(isAllowedFirebaseStorageDownloadUrl("not-a-url"), false);
  });
});
