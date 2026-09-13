import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("copy callable is transaction-only, allowlist-based, and fail-closed for private uploads", async () => {
  const source = await readFile(new URL("./copyStudioPrintRequestCore.ts", import.meta.url), "utf8");
  assert.match(source, /runTransaction|copyStudioPrintRequestInTransaction/);
  assert.match(source, /MAX_COPY_ITEMS/);
  assert.match(source, /customerUploadId/);
  assert.match(source, /ownerCustomerId !== destinationCustomerId/);
  assert.match(source, /status: "pending"/);
  assert.match(source, /queueTab: "working"/);
  assert.doesNotMatch(source, /\.set\([^\n]+source/);
});

test("copy callable is exported as a trusted staff function", async () => {
  const source = await readFile(new URL("../copyStudioPrintRequest.ts", import.meta.url), "utf8");
  const index = await readFile(new URL("../index.ts", import.meta.url), "utf8");
  assert.match(source, /assertStaffCaller/);
  assert.match(source, /adminDb\.runTransaction/);
  assert.match(index, /copyStudioPrintRequest/);
});
