import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const source = fs.readFileSync(
  path.resolve(path.dirname(fileURLToPath(import.meta.url)), "excludeCustomerUploadFromCatalog.ts"),
  "utf8",
);

test("exclusion changes only catalog review lifecycle and audit timestamp", () => {
  const update = source.match(/await uploadRef\.update\(\{([\s\S]*?)\}\);/)?.[1] ?? "";
  assert.match(update, /catalogReviewStatus: "excluded_from_catalog"/);
  assert.match(update, /updatedAt: FieldValue\.serverTimestamp\(\)/);
  assert.doesNotMatch(update, /technicalStatus|promotedDesignId|sourceStoragePath|productionStoragePath/);
});

test("exclusion performs no Storage deletion or document deletion", () => {
  assert.doesNotMatch(source, /adminStorage|storageObjectPath|\.delete\(/);
  assert.doesNotMatch(source, /uploadRef\.delete/);
});

test("active staff authorization and reversible excluded state remain", () => {
  assert.match(source, /assertCanManageCustomerUploadIntake\(caller\)/);
  assert.match(source, /status !== "pending_staff_review"/);
  assert.match(source, /catalogReviewStatus: "excluded_from_catalog"/);
});
