import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { assessPrintRequestItemSize } from "./printRequestItemSizing";
import { resolveActiveArtworkPixelDimensions } from "./interactiveArtworkEnhance";
import {
  mergePrintRequestItemPreservingArtworkEnhanceFields,
  readPrintRequestItemArtworkEnhanceFields,
} from "./printRequestItemArtworkEnhanceFields";
import type { PrintRequestItem } from "../types/printRequest/printRequest.types";

function baseItem(overrides: Partial<PrintRequestItem> = {}): PrintRequestItem {
  return {
    id: "item-1",
    printRequestId: "req-1",
    designId: "design-1",
    quantity: 1,
    status: "pending",
    addedBy: "user-1",
    createdAt: {} as PrintRequestItem["createdAt"],
    updatedAt: {} as PrintRequestItem["updatedAt"],
    ...overrides,
  };
}

describe("readPrintRequestItemArtworkEnhanceFields", () => {
  it("reads enhanced mode and pre-enhance size snapshots from document data", () => {
    assert.deepEqual(
      readPrintRequestItemArtworkEnhanceFields({
        artworkEnhanceMode: "enhanced",
        preEnhancePrintWidthInches: 17,
        preEnhancePrintHeightInches: 11,
      }),
      {
        artworkEnhanceMode: "enhanced",
        preEnhancePrintWidthInches: 17,
        preEnhancePrintHeightInches: 11,
      },
    );
  });

  it("omits unknown or invalid artworkEnhanceMode values", () => {
    assert.deepEqual(readPrintRequestItemArtworkEnhanceFields({ artworkEnhanceMode: "off" }), {});
    assert.deepEqual(readPrintRequestItemArtworkEnhanceFields({}), {});
  });
});

describe("mergePrintRequestItemPreservingArtworkEnhanceFields", () => {
  it("preserves enhanced mode when a size-only mapper response omits artworkEnhanceMode", () => {
    const previous = baseItem({
      artworkEnhanceMode: "enhanced",
      preEnhancePrintWidthInches: 17,
      preEnhancePrintHeightInches: 11,
      printWidthInches: 17,
      printHeightInches: 11,
    });
    const sizeOnlyUpdate = baseItem({
      printWidthInches: 18,
      printHeightInches: 11.8,
      sizeLabel: '18" x 11.8"',
    });

    const merged = mergePrintRequestItemPreservingArtworkEnhanceFields(previous, sizeOnlyUpdate);

    assert.equal(merged.artworkEnhanceMode, "enhanced");
    assert.equal(merged.preEnhancePrintWidthInches, 17);
    assert.equal(merged.printWidthInches, 18);
  });

  it("allows explicit baseline from authoritative enhance-mode responses", () => {
    const previous = baseItem({ artworkEnhanceMode: "enhanced" });
    const explicitBaseline = baseItem({ artworkEnhanceMode: "baseline" });

    const merged = mergePrintRequestItemPreservingArtworkEnhanceFields(previous, explicitBaseline);

    assert.equal(merged.artworkEnhanceMode, "baseline");
  });

  it("keeps enhanced mode across repeated width edits and quantity-only saves", () => {
    let item = baseItem({
      artworkEnhanceMode: "enhanced",
      printWidthInches: 17,
      printHeightInches: 11,
    });

    for (const width of [18, 19, 16]) {
      item = mergePrintRequestItemPreservingArtworkEnhanceFields(
        item,
        baseItem({ printWidthInches: width, printHeightInches: width * 0.65 }),
      );
      assert.equal(item.artworkEnhanceMode, "enhanced");
    }

    item = mergePrintRequestItemPreservingArtworkEnhanceFields(item, baseItem({ quantity: 3 }));
    assert.equal(item.artworkEnhanceMode, "enhanced");
    assert.equal(item.quantity, 3);
  });

  it("recalculates DPI from enhanced pixels after width changes without changing mode", () => {
    const enhancedWidthPx = 5100;
    const enhancedHeightPx = 3300;
    const activePixels = resolveActiveArtworkPixelDimensions({
      artworkEnhanceMode: "enhanced",
      baselineWidthPx: 3400,
      baselineHeightPx: 2200,
      enhancedWidthPx,
      enhancedHeightPx,
    });
    assert.ok(activePixels);

    const at17 = assessPrintRequestItemSize({
      pixelWidth: activePixels.widthPx,
      pixelHeight: activePixels.heightPx,
      printWidthInches: 17,
      printHeightInches: 11,
    });
    const at18 = assessPrintRequestItemSize({
      pixelWidth: activePixels.widthPx,
      pixelHeight: activePixels.heightPx,
      printWidthInches: 18,
      printHeightInches: 11.65,
    });

    assert.ok(at17.effectiveDpi > at18.effectiveDpi);
    assert.equal(at18.warningMessage, "Requested size is below 300 DPI. It can be printed, but quality may be reduced.");
    assert.equal(at18.canSave, true);
  });

  it("blocks save below 200 DPI while preserving enhanced mode in merged item state", () => {
    const merged = mergePrintRequestItemPreservingArtworkEnhanceFields(
      baseItem({ artworkEnhanceMode: "enhanced" }),
      baseItem({ printWidthInches: 30, printHeightInches: 19.4 }),
    );
    const activePixels = resolveActiveArtworkPixelDimensions({
      artworkEnhanceMode: merged.artworkEnhanceMode,
      baselineWidthPx: 3400,
      baselineHeightPx: 2200,
      enhancedWidthPx: 5100,
      enhancedHeightPx: 3300,
    });
    assert.ok(activePixels);
    const assessment = assessPrintRequestItemSize({
      pixelWidth: activePixels.widthPx,
      pixelHeight: activePixels.heightPx,
      printWidthInches: merged.printWidthInches ?? Number.NaN,
      printHeightInches: merged.printHeightInches ?? Number.NaN,
    });

    assert.equal(merged.artworkEnhanceMode, "enhanced");
    assert.equal(assessment.canSave, false);
  });
});
