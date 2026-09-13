import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, it } from "node:test";

describe("firestore customer identity field whitelist", () => {
  const rules = readFileSync(resolve(import.meta.dirname, "../../../firestore.rules"), "utf8");

  it("allows WS1 identity fields during staff customer updates", () => {
    for (const field of [
      "isDisabled",
      "disabledAt",
      "disabledBy",
      "disabledReason",
      "identitySnapshotPropagation",
      "identityOperationLock",
      "isMerged",
      "mergedIntoCustomerId",
      "isDeleted",
      "usernameHistory",
    ]) {
      assert.match(rules, new RegExp(`"${field}"`));
    }
  });
});
