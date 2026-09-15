import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";

const rules = readFileSync(new URL("../../firestore.rules", import.meta.url), "utf8");

describe("portalDevCustomerAccess Firestore rules contract", () => {
  it("allows owner/admin read and denies client writes", () => {
    assert.match(
      rules,
      /match\s+\/settings\/portalDevCustomerAccess\s*\{[\s\S]*?allow read:\s*if isOwnerOrAdmin\(\);[\s\S]*?allow write:\s*if false;/,
    );
  });
});
