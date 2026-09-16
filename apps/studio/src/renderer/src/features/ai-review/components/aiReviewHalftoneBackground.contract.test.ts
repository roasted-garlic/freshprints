import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

test("AI Review Halftone toggle updates the preview background immediately", () => {
  const workspaceSource = readFileSync(path.join(__dirname, "AiReviewWorkspace.tsx"), "utf8");
  assert.match(workspaceSource, /setPendingPreviewBackgroundValues\(\{/);
  assert.match(
    workspaceSource,
    /artworkBackgroundPreset: markAsHalftone \? "lightBlack" : "grey"/,
  );
  assert.match(workspaceSource, /onSaveHalftoneStaffDecision\(markAsHalftone\)/);
});

test("AI Review Halftone save persists the paired background in the same design update", () => {
  const serviceSource = readFileSync(
    path.join(__dirname, "../services/aiReviewInboxService.ts"),
    "utf8",
  );
  assert.match(
    serviceSource,
    /artworkBackgroundHex: markAsHalftone \? ARTWORK_BACKGROUND_PRESET_LIGHT_BLACK : null,/,
  );
});
