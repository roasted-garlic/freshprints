import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, it } from "node:test";

const here = dirname(fileURLToPath(import.meta.url));

describe("Generate Print Request gang sheet selection contract", () => {
  it("keeps selection local, item-keyed, mixed-source, and safe at generate time", () => {
    const modal = readFileSync(join(here, "GeneratePrintRequestGangSheetModal.tsx"), "utf8");
    const selection = readFileSync(join(here, "../utils/printRequestGangSheetSelection.ts"), "utf8");
    const page = readFileSync(join(here, "../pages/PrintRequestsPage.tsx"), "utf8");
    const assets = readFileSync(join(here, "../utils/buildPrintRequestExportAssets.ts"), "utf8");

    assert.match(modal, /selectedItemIds/);
    assert.match(modal, /exportQuantities/);
    assert.match(modal, /requestId/);
    assert.match(modal, /resolvePrintRequestGangSheetExportItems/);
    assert.match(modal, /DesignThumbnailPanel/);
    assert.match(modal, /print-requests-item-stepper/);
    assert.match(modal, /PrintRequestItemsPreviewLightbox/);
    assert.match(modal, /Requested qty/);
    assert.doesNotMatch(modal, /Saved qty/);
    assert.match(modal, /resolveItemDisplayLabel/);
    assert.doesNotMatch(modal, /item\.designId \|\|/);
    assert.match(selection, /item\.id/);
    assert.match(selection, /customerUploadId/);
    assert.match(selection, /staffArtworkId/);
    assert.match(selection, /normalizeExportQuantity/);
    assert.match(page, /onGenerate=\{\(selectedItems\) =>/);
    assert.match(page, /designById=\{designById\}/);
    assert.match(page, /uploadSummariesById=\{uploadSummariesById\}/);
    assert.match(page, /staffArtworkById=\{staffArtworkById\}/);
    assert.match(page, /selectedItems/);
    assert.match(assets, /quantity,/);
    assert.match(assets, /printWidthInches,/);
    assert.match(assets, /printHeightInches,/);
    assert.doesNotMatch(modal, /firestore|updatePrintRequest|replaceRequestItem/i);
  });
});
