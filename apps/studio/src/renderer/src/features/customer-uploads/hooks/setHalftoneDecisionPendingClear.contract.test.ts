import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));

test("setHalftoneDecision always clears pending in finally (no stuck disabled controls)", () => {
  const source = readFileSync(join(here, "useCustomerUploadIntake.ts"), "utf8");
  const start = source.indexOf("setHalftoneDecision: async (");
  assert.ok(start >= 0);
  const body = source.slice(start, start + 4500);
  // Pending clear must wrap the whole save path — early returns previously left buttons disabled.
  assert.match(
    body,
    /setHalftoneDecision: async \([\s\S]*?try \{[\s\S]*?recordHalftoneStaffDecision[\s\S]*?\} finally \{\s*\/\/[^\n]*\n\s*setPending\(uploadId, null\);/,
  );
  assert.doesNotMatch(
    body,
    /if \(!shouldDefaultDarkBackground\) \{\s*return true;\s*\}/,
  );
});
