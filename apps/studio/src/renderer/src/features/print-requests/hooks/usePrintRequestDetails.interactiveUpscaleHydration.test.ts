/**
 * TD-033 / interactive-upscale-dpi-rehydration: Studio parent-state + upload prop wiring.
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { describe, it } from "node:test";
import { fileURLToPath } from "node:url";

import {
  mergeInteractiveEnhanceResultIntoAssetSummary,
  resolveActiveArtworkPixelDimensions,
} from "@fresh-prints/shared/utils/interactiveArtworkEnhance";

const here = dirname(fileURLToPath(import.meta.url));
const pageSource = readFileSync(join(here, "..", "pages", "PrintRequestsPage.tsx"), "utf8");
const detailsSource = readFileSync(join(here, "usePrintRequestDetails.ts"), "utf8");
const readyDesignsSource = readFileSync(join(here, "useReadyDesignsForSelection.ts"), "utf8");
const cardSource = readFileSync(
  join(here, "..", "components", "PrintRequestItemCard.tsx"),
  "utf8",
);

describe("Studio Interactive Upscale DPI rehydration (TD-033)", () => {
  it("passes interactiveEnhanced* fields on upload props to the item card", () => {
    assert.match(pageSource, /interactiveEnhancedWidthPx:\s*uploadDoc\.interactiveEnhancedWidthPx/);
    assert.match(pageSource, /interactiveEnhancedHeightPx:\s*uploadDoc\.interactiveEnhancedHeightPx/);
    assert.match(
      pageSource,
      /interactiveEnhanceGeneratedAt:\s*uploadDoc\.interactiveEnhanceGeneratedAt/,
    );
  });

  it("handleArtworkEnhanceModeChanged patches design and upload parent state", () => {
    assert.match(pageSource, /patchDesignFromEnhanceResult/);
    assert.match(pageSource, /patchUploadSummaryFromEnhanceResult/);
  });

  it("hooks expose merge-based patch helpers", () => {
    assert.match(detailsSource, /mergeInteractiveEnhanceResultIntoAssetSummary/);
    assert.match(detailsSource, /patchUploadSummaryFromEnhanceResult/);
    assert.match(readyDesignsSource, /mergeInteractiveEnhanceResultIntoAssetSummary/);
    assert.match(readyDesignsSource, /patchDesignFromEnhanceResult/);
  });

  it("card uses dpiAspectPixels so enhanced-without-dims does not show baseline DPI", () => {
    assert.match(cardSource, /const dpiAspectPixels = activeAspectPixels/);
    assert.match(cardSource, /pixelWidth: dpiAspectPixels\.width/);
  });

  it("H7/H9: upload summary patch hydrates enhanced pixels without card-local state", () => {
    const upload = mergeInteractiveEnhanceResultIntoAssetSummary(
      {
        id: "up1",
        widthPx: 1600,
        heightPx: 1600,
        interactiveEnhancedWidthPx: null as number | null,
        interactiveEnhancedHeightPx: null as number | null,
      },
      { artworkEnhanceMode: "enhanced", widthPx: 4800, heightPx: 4800 },
    );
    const active = resolveActiveArtworkPixelDimensions({
      artworkEnhanceMode: "enhanced",
      baselineWidthPx: 1600,
      baselineHeightPx: 1600,
      enhancedWidthPx: upload?.interactiveEnhancedWidthPx,
      enhancedHeightPx: upload?.interactiveEnhancedHeightPx,
    });
    assert.deepEqual(active, { widthPx: 4800, heightPx: 4800 });
  });

  it("H10: ON without dims → null active pixels", () => {
    assert.equal(
      resolveActiveArtworkPixelDimensions({
        artworkEnhanceMode: "enhanced",
        baselineWidthPx: 1600,
        baselineHeightPx: 1600,
      }),
      null,
    );
  });
});
