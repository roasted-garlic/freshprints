import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";

function read(p: string): string {
  return readFileSync(p, "utf8");
}

// Amendment 2, Defect B: the final uploaded buffer (post-trim/upscale) was never re-checked
// against MAX_SINGLE_PNG_SIZE_BYTES before upload, so a legitimately-large source that upscales
// past 150MB hit storage.rules' server-side ceiling and surfaced a misleading permission error.
describe("importUploadService size-limit re-check (Amendment 2, Defect B)", () => {
  it("checks bytes.byteLength against MAX_SINGLE_PNG_SIZE_BYTES before calling uploadBytesResumable", () => {
    const source = read(
      "apps/studio/src/renderer/src/features/imports/services/importUploadService.ts",
    );

    const checkIndex = source.indexOf("if (bytes.byteLength > MAX_SINGLE_PNG_SIZE_BYTES)");
    const uploadCallIndex = source.indexOf("uploadBytesResumable(storageRef, bytes,");

    assert.ok(checkIndex > -1, "expected the size re-check to exist");
    assert.ok(uploadCallIndex > -1, "expected the upload call to exist");
    assert.ok(checkIndex < uploadCallIndex, "size re-check must run before the upload attempt");
    assert.match(source, /formatPngSizeLimitExceededMessage\(\)/);
  });
});
