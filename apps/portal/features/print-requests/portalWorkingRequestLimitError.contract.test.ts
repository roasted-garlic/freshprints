import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)));

test("failed working-item hydration is terminal and safe", () => {
  const hook = fs.readFileSync(
    path.join(root, "hooks/usePortalWorkingRequestLimitState.ts"),
    "utf8",
  );
  const panel = fs.readFileSync(
    path.join(root, "../customer-uploads/components/CustomerUploadPanel.tsx"),
    "utf8",
  );
  assert.match(hook, /itemsError/);
  assert.match(hook, /error: hydration\.itemsError/);
  assert.match(panel, /We could not check print limits/);
  assert.match(panel, /Retry/);
  assert.doesNotMatch(panel, /setInterval/);
});
