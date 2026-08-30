import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const studioStyles = path.join(__dirname, "../../../../styles");

test("Imports landing cards stretch to equal sibling height (not viewport fill)", () => {
  const layout = readFileSync(path.join(studioStyles, "layout.css"), "utf8");
  const batch = readFileSync(
    path.join(studioStyles, "components/batch-import.css"),
    "utf8",
  );

  assert.match(layout, /\.imports-entry-grid\s*\{[^}]*align-items:\s*stretch/s);
  assert.match(layout, /\.imports-method-card\s*\{[^}]*align-self:\s*stretch/s);
  assert.match(layout, /\.imports-session-status\s*\{[^}]*text-align:\s*center/s);
  assert.match(
    layout,
    /\.imports-method-card \.imports-phase-actions\s*\{[^}]*margin-top:\s*0/s,
  );
  assert.doesNotMatch(
    layout,
    /\.imports-method-card \.imports-phase-actions\s*\{[^}]*margin-top:\s*auto/s,
  );

  assert.match(batch, /\.batch-import-header\s*\{[^}]*height:\s*auto/s);
  assert.doesNotMatch(batch, /\.batch-import-header\s*\{[^}]*height:\s*100%/s);
  assert.match(batch, /\.import-session-settings-modal\.modal-panel\s*\{[^}]*max-width:\s*min\(52rem/s);
});

test("BatchImportPanel keeps compact landing card (session settings live in header)", () => {
  const panel = readFileSync(path.join(__dirname, "BatchImportPanel.tsx"), "utf8");
  const sessionIdx = panel.indexOf("<BatchImportSessionControls");
  assert.equal(sessionIdx, -1);
  assert.match(panel, /BatchImportSourceActions/);
});
