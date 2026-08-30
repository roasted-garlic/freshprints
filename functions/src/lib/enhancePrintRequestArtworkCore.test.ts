import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  resolveManualArtworkEnhanceDecision,
  shouldOfferManualArtworkEnhanceAction,
} from "../../../packages/shared/src/utils/manualArtworkEnhance";

describe("enhancePrintRequestArtwork policy", () => {
  it("rejects a third enhancement pass", () => {
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

  it("shows enhance action only below 300 DPI when eligible", () => {
    const decision = resolveManualArtworkEnhanceDecision({
      currentWidthPx: 3600,
      currentHeightPx: 3600,
      upscalePassCount: 1,
      upscaleFactor: 3.6,
      nativeSourceWidthPx: 1000,
      nativeSourceHeightPx: 1000,
    });
    assert.equal(shouldOfferManualArtworkEnhanceAction({ effectiveDpi: 260, enhanceDecision: decision }), true);
    assert.equal(shouldOfferManualArtworkEnhanceAction({ effectiveDpi: 310, enhanceDecision: decision }), false);
  });
});
