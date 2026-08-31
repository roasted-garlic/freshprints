import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { AUTOMATED_UPSCALE_TARGET_WIDTH_INCHES, TARGET_PRINT_DPI } from "../constants/printSize.constants";
import {
  resolveManualArtworkEnhanceDecision,
  resolveNativeProductionSourcePixels,
  shouldOfferManualArtworkEnhanceAction,
} from "./manualArtworkEnhance";
import { resolveInitialPrintRequestItemSize } from "./printRequestItemSizing";

describe("resolveManualArtworkEnhanceDecision", () => {
  it("returns already_sufficient when at 15 inch target", () => {
    const widthPx = Math.round(AUTOMATED_UPSCALE_TARGET_WIDTH_INCHES * TARGET_PRINT_DPI);
    const decision = resolveManualArtworkEnhanceDecision({
      currentWidthPx: widthPx,
      currentHeightPx: widthPx,
      upscalePassCount: 1,
      upscaleFactor: 3,
    });
    assert.equal(decision.status, "already_sufficient");
  });

  it("allows manual enhance from 12 inch normalized legacy art", () => {
    const currentWidthPx = 3600;
    const decision = resolveManualArtworkEnhanceDecision({
      currentWidthPx,
      currentHeightPx: 3600,
      upscalePassCount: 1,
      upscaleFactor: 3.6,
      nativeSourceWidthPx: 1000,
      nativeSourceHeightPx: 1000,
    });
    assert.equal(decision.status, "enhance");
    assert.ok((decision.targetWidthPx ?? 0) > currentWidthPx);
    assert.equal(decision.nextUpscalePassCount, 2);
  });

  it("rejects a third pass when upscalePassCount is already 2", () => {
    const decision = resolveManualArtworkEnhanceDecision({
      currentWidthPx: 4000,
      currentHeightPx: 4000,
      upscalePassCount: 2,
      upscaleFactor: 4,
      nativeSourceWidthPx: 1000,
      nativeSourceHeightPx: 1000,
    });
    assert.equal(decision.status, "not_eligible");
  });

  it("returns already_sufficient when already at cumulative 6x below 15in target", () => {
    const decision = resolveManualArtworkEnhanceDecision({
      currentWidthPx: 4000,
      currentHeightPx: 4000,
      upscalePassCount: 1,
      upscaleFactor: 6,
      nativeSourceWidthPx: 667,
      nativeSourceHeightPx: 667,
    });
    assert.equal(decision.status, "already_sufficient");
  });

  it("derives native pixels from upscale factor when native fields are missing", () => {
    const native = resolveNativeProductionSourcePixels({
      currentWidthPx: 3600,
      currentHeightPx: 1800,
      upscalePassCount: 1,
      upscaleFactor: 3.6,
    });
    assert.equal(native.widthPx, 1000);
  });
});

describe("shouldOfferManualArtworkEnhanceAction", () => {
  it("offers action for sub-300 DPI when enhance is possible", () => {
    const decision = resolveManualArtworkEnhanceDecision({
      currentWidthPx: 3600,
      currentHeightPx: 3600,
      upscalePassCount: 1,
      upscaleFactor: 3.6,
      nativeSourceWidthPx: 1000,
      nativeSourceHeightPx: 1000,
    });
    assert.equal(
      shouldOfferManualArtworkEnhanceAction({ effectiveDpi: 272, enhanceDecision: decision }),
      true,
    );
  });

  it("does not offer action at optimal DPI", () => {
    const decision = resolveManualArtworkEnhanceDecision({
      currentWidthPx: 3600,
      currentHeightPx: 3600,
      upscalePassCount: 1,
      upscaleFactor: 3.6,
      nativeSourceWidthPx: 1000,
      nativeSourceHeightPx: 1000,
    });
    assert.equal(
      shouldOfferManualArtworkEnhanceAction({ effectiveDpi: 327, enhanceDecision: decision }),
      false,
    );
  });
});
