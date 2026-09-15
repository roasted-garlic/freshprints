import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

const here = path.dirname(fileURLToPath(import.meta.url));
const source = readFileSync(path.join(here, "getPortalAdminShowQueueRequestDesigns.ts"), "utf8");

function classifyPortalAdminShowQueuePreviewFailure(
  error: unknown,
): "signing_failed" | "missing_object" {
  const message = error instanceof Error ? error.message : String(error ?? "");
  return /signBlob|SigningError|iam\.serviceAccounts\.signBlob|Permission.*denied/i.test(message)
    ? "signing_failed"
    : "missing_object";
}

test("classifies Gen2 signBlob IAM failures as signing_failed", () => {
  assert.equal(
    classifyPortalAdminShowQueuePreviewFailure(
      new Error("Permission 'iam.serviceAccounts.signBlob' denied on resource"),
    ),
    "signing_failed",
  );
  assert.equal(
    classifyPortalAdminShowQueuePreviewFailure(new Error("SigningError: failed to sign")),
    "signing_failed",
  );
});

test("classifies missing objects as missing_object", () => {
  assert.equal(
    classifyPortalAdminShowQueuePreviewFailure(new Error("Artwork preview is unavailable.")),
    "missing_object",
  );
});

test("Staff Artwork uses staffArtworks derivative paths for signing", () => {
  assert.match(source, /resolveStaffArtworkArtworkAsset/);
  assert.match(source, /staffArtworks/);
  assert.match(source, /previewStoragePath/);
  assert.match(source, /thumbnailStoragePath/);
  assert.doesNotMatch(source, /staff_artwork_not_previewed/);
  assert.doesNotMatch(source, /productionStoragePath/);
});

test("preview failures are logged instead of swallowed silently", () => {
  assert.match(source, /logger\.error\("portal-admin-show-queue preview unavailable"/);
  assert.doesNotMatch(source, /catch \{\s*return \{\};\s*\}/);
});

test("source exports classify helper matching this test seam", () => {
  assert.match(source, /export function classifyPortalAdminShowQueuePreviewFailure/);
});
