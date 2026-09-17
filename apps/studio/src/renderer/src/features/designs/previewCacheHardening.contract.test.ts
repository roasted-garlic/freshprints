import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));

describe("import / staff preview cache hardening", () => {
  it("builds PNG previews from file bytes, not createFromPath", () => {
    const source = readFileSync(
      join(here, "../../../../../electron/ipc/import/getSelectedPngPreview.ts"),
      "utf8",
    );
    assert.match(source, /createFromBuffer/);
    assert.doesNotMatch(source, /nativeImage\.createFromPath/);
  });

  it("keys corrected import bytes by path fingerprint", () => {
    const source = readFileSync(
      join(here, "../../../../../electron/ipc/import/correctedImportBytesCache.ts"),
      "utf8",
    );
    assert.match(source, /buildCorrectedImportBytesCacheKey/);
    assert.match(source, /mtimeMs/);
  });

  it("resets batch import previews when the job changes and keys by size", () => {
    const source = readFileSync(
      join(here, "../imports/components/batch/BatchImportFileList.tsx"),
      "utf8",
    );
    assert.match(source, /buildBatchImportPreviewCacheKey/);
    assert.match(source, /setPreviewDataUrlByKey\(\{\}\)/);
    assert.match(source, /\[jobId\]/);
  });

  it("clears staff artwork previewUrls on delete", () => {
    const source = readFileSync(
      join(here, "../staff-artwork/pages/StaffArtworkPage.tsx"),
      "utf8",
    );
    assert.match(source, /deleteArtwork/);
    assert.match(source, /delete next\[artworkId\]/);
    assert.match(source, /designDerivativeUrlService\.clearCache/);
  });
});
