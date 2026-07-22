import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, it } from "node:test";

const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../../..");

describe("firestore.rules public catalog browse (#13)", () => {
  it("defines resource-constrained public catalog helpers and uses them on reads", async () => {
    const rulesPath = path.join(REPO_ROOT, "firestore.rules");
    const rules = await readFile(rulesPath, "utf8");

    assert.ok(rules.includes("function isPublicCatalogDesign()"), "missing isPublicCatalogDesign");
    assert.ok(rules.includes("function isPublicCatalogCategory()"), "missing isPublicCatalogCategory");
    assert.ok(rules.includes("function isPublicCatalogTag()"), "missing isPublicCatalogTag");
    assert.ok(
      rules.includes('resource.data.status == "ready"'),
      "public design read must constrain status == ready",
    );
    assert.ok(
      rules.includes("resource.data.isActive == true"),
      "public category read must constrain isActive",
    );
    assert.ok(
      rules.includes('resource.data.status == "approved"'),
      "public tag read must constrain status == approved",
    );
    assert.ok(
      rules.includes("allow read: if isStaff() || isPublicCatalogDesign();"),
      "designs read must use public catalog helper",
    );
    assert.ok(
      rules.includes("allow read: if isStaff() || isPublicCatalogCategory();"),
      "categories read must use public catalog helper",
    );
    assert.ok(
      rules.includes("allow read: if isStaff() || isPublicCatalogTag();"),
      "tags read must use public catalog helper",
    );
    assert.ok(
      !/match \/upcomingShows\/\{[^}]+\}[\s\S]*?allow read:\s*if\s*true/.test(rules),
      "upcomingShows must not allow public read: if true",
    );
    assert.match(
      rules,
      /match \/upcomingShows\/\{upcomingShowId\}[\s\S]*?allow read:\s*if isStaff\(\);/,
      "upcomingShows remains staff-only read",
    );
  });
});
