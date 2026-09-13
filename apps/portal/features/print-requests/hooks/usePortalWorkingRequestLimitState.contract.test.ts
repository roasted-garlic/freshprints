import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(here, "../../../../..");

test("Portal working request limit state uses effective resolver with customer override", () => {
  const source = readFileSync(
    path.join(
      repoRoot,
      "apps/portal/features/print-requests/hooks/usePortalWorkingRequestLimitState.ts",
    ),
    "utf8",
  );
  assert.match(source, /resolveEffectivePrintRequestLimits/);
  assert.match(source, /customer\?\.printRequestQuotaOverride/);
  assert.match(source, /subscribeSettings/);
});
