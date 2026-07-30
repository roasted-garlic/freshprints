import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";
import path from "node:path";
import { fileURLToPath } from "node:url";

/**
 * Static-source regression guard proving Show Queue export and gang-sheet generation resolve the
 * download URL exclusively from `design.originalPath`, never from a derivative field
 * (`thumbnailPath`/`previewPath`, or any future derivative field). This is a source-text
 * assertion, not a runtime test, because both hooks are Electron-renderer code with heavy IPC/
 * Firebase dependencies that are not practical to execute in a Node test runner — the goal here is
 * to fail loudly if a future edit accidentally substitutes a derivative for the production
 * original.
 */

const __dirname = path.dirname(fileURLToPath(import.meta.url));

function readSource(relativePath: string): string {
  return readFileSync(path.join(__dirname, relativePath), "utf8");
}

describe("original-production protection (Show Queue export / gang-sheet)", () => {
  it("useExportGangSheetPng.ts resolves the download URL from design.originalPath", () => {
    const source = readSource("useExportGangSheetPng.ts");
    assert.match(source, /getDownloadUrlForCatalogPath\(design\.originalPath\)/);
  });

  it("useExportGangSheetPng.ts never reads thumbnailPath or previewPath for the export download URL", () => {
    const source = readSource("useExportGangSheetPng.ts");
    assert.doesNotMatch(source, /getDownloadUrlForCatalogPath\(design\.(thumbnailPath|previewPath)\)/);
  });

  it("useExportShowZip.ts resolves the download URL from design.originalPath", () => {
    const source = readSource("useExportShowZip.ts");
    assert.match(source, /getDownloadUrlForCatalogPath\(design\.originalPath\)/);
  });

  it("useExportShowZip.ts never reads thumbnailPath or previewPath for the export download URL", () => {
    const source = readSource("useExportShowZip.ts");
    assert.doesNotMatch(source, /getDownloadUrlForCatalogPath\(design\.(thumbnailPath|previewPath)\)/);
  });
});
