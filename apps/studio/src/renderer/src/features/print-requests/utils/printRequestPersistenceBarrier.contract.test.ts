import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

const here = path.dirname(fileURLToPath(import.meta.url));
const pageSource = readFileSync(path.join(here, "../pages/PrintRequestsPage.tsx"), "utf8");
const exportZipSource = readFileSync(
  path.join(here, "../../upcoming-shows/hooks/useExportShowZip.ts"),
  "utf8",
);

test("Studio Add to Show flushes dirty-valid sizes and blocks invalid persistence", () => {
  assert.match(pageSource, /summarizePrintRequestPersistenceHealth/);
  assert.match(pageSource, /openAddToShow/);
  assert.match(pageSource, /needsFlush/);
});

test("Show ZIP export uses queued requested inches only", () => {
  assert.match(exportZipSource, /resolveQueuedPrintInches/);
  assert.doesNotMatch(exportZipSource, /DEFAULT_EXPORT_WIDTH_INCHES/);
});
