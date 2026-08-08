import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, it } from "node:test";

const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../../..");

describe("firestore.rules taxonomyMaterialization (RC7)", () => {
  it("allows staff read and denies all client writes; uses existing isStaff()", async () => {
    const rules = await readFile(path.join(REPO_ROOT, "firestore.rules"), "utf8");
    assert.match(
      rules,
      /match \/taxonomyMaterialization\/\{docId\}[\s\S]*?allow read:\s*if isStaff\(\);/,
    );
    assert.match(
      rules,
      /match \/taxonomyMaterialization\/\{docId\}[\s\S]*?allow create, update, delete:\s*if false;/,
    );
    assert.ok(rules.includes("function isStaff()"), "must reuse existing isStaff predicate");
  });

  it("does not revive Stage 5 generated Storage match prefixes", async () => {
    const storage = await readFile(path.join(REPO_ROOT, "storage.rules"), "utf8");
    assert.doesNotMatch(storage, /match\s+\/b\/\{bucket\}\/o\s*\{[\s\S]*match\s+\/generated\/portal-catalog/);
    assert.doesNotMatch(storage, /match\s+\/generated\/portal-catalog/);
    assert.doesNotMatch(storage, /match\s+\/generated\/catalog-reference/);
  });
});
