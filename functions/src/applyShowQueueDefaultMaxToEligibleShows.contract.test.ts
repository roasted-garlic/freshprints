import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

describe("applyShowQueueDefaultMaxToEligibleShows authorization contract", () => {
  it("exports owner/admin gate and denies helpers", () => {
    const callablePath = join(
      dirname(fileURLToPath(import.meta.url)),
      "./applyShowQueueDefaultMaxToEligibleShows.ts",
    );
    const source = readFileSync(callablePath, "utf8");
    assert.match(source, /assertStaffCaller/);
    assert.match(source, /role !== "owner"/);
    assert.match(source, /role !== "admin"/);
    assert.match(source, /Only owners and admins can manage Show Queue settings/);
  });
});
