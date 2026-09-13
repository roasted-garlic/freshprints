import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";
import path from "node:path";
import { fileURLToPath } from "node:url";

/**
 * Static-source regression guard proving Show Queue export and gang-sheet generation route
 * production artwork resolution through the shared enhance-mode-aware builder instead of reading
 * `design.originalPath` or upload `productionStoragePath` directly in the hooks.
 */

const __dirname = path.dirname(fileURLToPath(import.meta.url));

function readSource(relativePath: string): string {
  return readFileSync(path.join(__dirname, relativePath), "utf8");
}

describe("show export production asset resolution (Show Queue export / gang-sheet)", () => {
  it("useExportGangSheetPng.ts routes through buildShowExportAllocationAssets", () => {
    const source = readSource("useExportGangSheetPng.ts");
    assert.match(source, /buildShowExportAllocationAssets/);
    assert.doesNotMatch(source, /getDownloadUrlForCatalogPath\(design\.originalPath\)/);
    assert.doesNotMatch(source, /upload\.productionStoragePath/);
  });

  it("useExportShowZip.ts routes through buildShowExportAllocationAssets", () => {
    const source = readSource("useExportShowZip.ts");
    assert.match(source, /buildShowExportAllocationAssets/);
    assert.doesNotMatch(source, /getDownloadUrlForCatalogPath\(design\.originalPath\)/);
    assert.doesNotMatch(source, /upload\.productionStoragePath/);
  });

  it("buildShowExportAllocationAssets.ts uses resolveShowExportProductionAsset", () => {
    const source = readSource("../utils/buildShowExportAllocationAssets.ts");
    assert.match(source, /resolveShowExportProductionAsset/);
  });
});
