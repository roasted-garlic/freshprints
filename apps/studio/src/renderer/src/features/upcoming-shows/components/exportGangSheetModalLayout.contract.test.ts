import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, it } from "node:test";

describe("export gang sheet modal layout contracts", () => {
  const modalSource = readFileSync(
    resolve(import.meta.dirname, "ExportGangSheetConfirmModal.tsx"),
    "utf8",
  );
  const showQueueCss = readFileSync(
    resolve(import.meta.dirname, "../../../styles/components/show-queue.css"),
    "utf8",
  );

  it("wraps generated sheet list in a scrollable region", () => {
    assert.match(modalSource, /gang-sheet-preview-list-scroll/);
    assert.match(showQueueCss, /\.gang-sheet-preview-list-scroll/);
    assert.match(showQueueCss, /overflow-y: auto/);
  });

  it("bounds modal height to the viewport", () => {
    assert.match(showQueueCss, /\.export-gang-sheet-modal\.modal-panel/);
    assert.match(showQueueCss, /max-height: min\(90vh/);
    assert.match(showQueueCss, /grid-template-rows: auto minmax\(0, 1fr\) auto/);
  });

  it("highlights the most recently clicked sheet download button", () => {
    assert.match(modalSource, /lastDownloadedSheetIndex/);
    assert.match(modalSource, /is-last-downloaded/);
    assert.match(modalSource, /handleDownloadSheet/);
    assert.match(showQueueCss, /\.button\.is-last-downloaded/);
  });
});
