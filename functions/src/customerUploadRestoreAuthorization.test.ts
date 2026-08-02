import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const restoreSource = readFileSync(
  new URL("./restoreCustomerUploadCatalogEligibility.ts", import.meta.url),
  "utf8",
);
const excludeSource = readFileSync(
  new URL("./excludeCustomerUploadFromCatalog.ts", import.meta.url),
  "utf8",
);

test("exclude and restore share actor-independent active-staff authorization", () => {
  assert.match(excludeSource, /assertCanManageCustomerUploadIntake\(caller\)/);
  assert.match(restoreSource, /assertCanManageCustomerUploadIntake\(caller\)/);
  assert.doesNotMatch(restoreSource, /excludedBy|createdBy|caller\.id\s*===/);
});

test("restore changes the existing upload back to pending without creating a duplicate", () => {
  assert.match(restoreSource, /uploadRef\.update\(\{/);
  assert.match(restoreSource, /catalogReviewStatus:\s*"pending_staff_review"/);
  assert.doesNotMatch(restoreSource, /\.add\(|\.create\(|\.set\(/);
});

test("exclude remains a metadata-only update that preserves every asset path", () => {
  assert.match(excludeSource, /catalogReviewStatus:\s*"excluded_from_catalog"/);
  assert.doesNotMatch(excludeSource, /adminStorage|\.delete\(|StoragePath:\s*null/);
});
