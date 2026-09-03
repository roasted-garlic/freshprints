import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { INTERACTIVE_UPSCALE_OFFER_MIN_DPI } from "../constants/printSize.constants";
import {
  hasInteractiveArtworkDerivative,
  isInteractiveUpscaleGenerationOfferedAtPrintSize,
  mergeInteractiveEnhanceResultIntoAssetSummary,
  resolveActiveArtworkPixelDimensions,
  resolveInteractiveEnhanceTargetPixels,
  resolveInteractiveUpscaleCapacity,
  resolveInteractiveUpscaleToggleEligibility,
} from "./interactiveArtworkEnhance";
import {
  resolvePrintRequestDefaultWidthInches,
  STANDARD_PRINT_REQUEST_INITIAL_WIDTH_INCHES,
} from "./printRequestItemSizing";

const DERIVATIVE_ASSET = {
  currentWidthPx: 3000,
  currentHeightPx: 3000,
  nativeSourceWidthPx: 1000,
  nativeSourceHeightPx: 1000,
  interactiveEnhanceGeneratedAt: new Date(),
  enhancedWidthPx: 5100,
  enhancedHeightPx: 5100,
};

describe("interactiveArtworkEnhance fallback contract", () => {
  it("system fallback is 10 inches", () => {
    assert.equal(STANDARD_PRINT_REQUEST_INITIAL_WIDTH_INCHES, 10);
    assert.equal(resolvePrintRequestDefaultWidthInches({}), 10);
  });

  it("initiation floor constant is 250", () => {
    assert.equal(INTERACTIVE_UPSCALE_OFFER_MIN_DPI, 250);
  });
});

describe("isInteractiveUpscaleGenerationOfferedAtPrintSize", () => {
  it("offers new upscale only when baseline effective DPI is strictly below 250", () => {
    // Effective DPI is Math.round(px / inches) — same as badge.
    // 2490px / 10" → 249 DPI
    assert.equal(isInteractiveUpscaleGenerationOfferedAtPrintSize(2490, 2490, 10, 10), true);
    // 2494px / 10" → 249.4 → rounds to 249 DPI
    assert.equal(isInteractiveUpscaleGenerationOfferedAtPrintSize(2494, 2494, 10, 10), true);
    // 2495px / 10" → 249.5 → rounds to 250 DPI (not eligible)
    assert.equal(isInteractiveUpscaleGenerationOfferedAtPrintSize(2495, 2495, 10, 10), false);
    // 2500px / 10" = 250 DPI
    assert.equal(isInteractiveUpscaleGenerationOfferedAtPrintSize(2500, 2500, 10, 10), false);
    // 2510px / 10" = 251 DPI
    assert.equal(isInteractiveUpscaleGenerationOfferedAtPrintSize(2510, 2510, 10, 10), false);
    // 2990px / 10" = 299 DPI
    assert.equal(isInteractiveUpscaleGenerationOfferedAtPrintSize(2990, 2990, 10, 10), false);
    // 3000px / 10" = 300 DPI
    assert.equal(isInteractiveUpscaleGenerationOfferedAtPrintSize(3000, 3000, 10, 10), false);
  });

  it("227 baseline DPI remains eligible when capacity remains", () => {
    assert.equal(isInteractiveUpscaleGenerationOfferedAtPrintSize(3860, 3860, 17, 20.48), true);
  });
});

describe("resolveInteractiveUpscaleToggleEligibility — STATE A (no derivative)", () => {
  it("offers first-time generation when below 250 and capacity allows", () => {
    const eligibility = resolveInteractiveUpscaleToggleEligibility({
      asset: {
        currentWidthPx: 2400,
        currentHeightPx: 2400,
        nativeSourceWidthPx: 1000,
        nativeSourceHeightPx: 1000,
      },
      printWidthInches: 10,
      printHeightInches: 10,
      artworkEnhanceMode: "baseline",
    });
    assert.equal(eligibility.state, "available");
    assert.equal(eligibility.toggleEnabled, true);
    assert.ok(eligibility.enhanceTarget);
  });

  it("disables toggle when baseline DPI is at/above 250 (no derivative)", () => {
    const eligibility = resolveInteractiveUpscaleToggleEligibility({
      asset: {
        currentWidthPx: 2500,
        currentHeightPx: 2500,
        nativeSourceWidthPx: 1000,
        nativeSourceHeightPx: 1000,
      },
      printWidthInches: 10,
      printHeightInches: 10,
      artworkEnhanceMode: "baseline",
    });
    assert.equal(eligibility.state, "sufficient_capacity_remains");
    assert.equal(eligibility.toggleEnabled, false);
  });

  it("disables toggle when baseline DPI already meets ~300 target (no derivative)", () => {
    const eligibility = resolveInteractiveUpscaleToggleEligibility({
      asset: {
        currentWidthPx: 3000,
        currentHeightPx: 3000,
        nativeSourceWidthPx: 1000,
        nativeSourceHeightPx: 1000,
      },
      printWidthInches: 10,
      printHeightInches: 10,
      artworkEnhanceMode: "baseline",
    });
    assert.equal(eligibility.state, "sufficient_capacity_remains");
    assert.equal(eligibility.toggleEnabled, false);
  });
});

describe("resolveInteractiveUpscaleToggleEligibility — STATE B/C (derivative exists)", () => {
  it("derivative exists + baseline mode → generated state, toggle enabled (selection only)", () => {
    const eligibility = resolveInteractiveUpscaleToggleEligibility({
      asset: DERIVATIVE_ASSET,
      printWidthInches: 17,
      printHeightInches: 20.48,
      artworkEnhanceMode: "baseline",
    });
    assert.equal(eligibility.state, "generated");
    assert.equal(eligibility.toggleEnabled, true);
    assert.equal(eligibility.enhanceTarget, undefined);
  });

  it("derivative exists + 227 baseline DPI → toggle remains available (no auto-off policy)", () => {
    const eligibility = resolveInteractiveUpscaleToggleEligibility({
      asset: {
        ...DERIVATIVE_ASSET,
        currentWidthPx: 3860,
        currentHeightPx: 3860,
      },
      printWidthInches: 17,
      printHeightInches: 20.48,
      artworkEnhanceMode: "baseline",
    });
    assert.equal(eligibility.state, "generated");
    assert.equal(eligibility.toggleEnabled, true);
  });

  it("derivative exists + 300+ baseline DPI → toggle disabled in baseline mode", () => {
    const eligibility = resolveInteractiveUpscaleToggleEligibility({
      asset: {
        ...DERIVATIVE_ASSET,
        currentWidthPx: 6000,
        currentHeightPx: 6000,
      },
      printWidthInches: 10,
      printHeightInches: 10,
      artworkEnhanceMode: "baseline",
    });
    assert.equal(eligibility.state, "generated");
    assert.equal(eligibility.toggleEnabled, false);
    assert.equal(eligibility.helperText, "Resolution is already sufficient for this print size");
  });

  it("derivative exists + enhanced mode stays ON even when enhanced DPI is >=250", () => {
    const eligibility = resolveInteractiveUpscaleToggleEligibility({
      asset: {
        ...DERIVATIVE_ASSET,
        currentWidthPx: 6000,
        currentHeightPx: 6000,
      },
      printWidthInches: 10,
      printHeightInches: 10,
      artworkEnhanceMode: "enhanced",
    });
    assert.equal(eligibility.state, "generated");
    assert.equal(eligibility.toggleEnabled, true);
  });

  it("derivative exists + larger requested size → reuse same derivative (no regeneration offer)", () => {
    const eligibility = resolveInteractiveUpscaleToggleEligibility({
      asset: DERIVATIVE_ASSET,
      printWidthInches: 20,
      printHeightInches: 20,
      artworkEnhanceMode: "baseline",
    });
    assert.equal(eligibility.state, "generated");
    assert.equal(eligibility.toggleEnabled, true);
    assert.equal(eligibility.enhanceTarget, undefined);
  });

  it("derivative exists + enhanced mode → selection state only", () => {
    const eligibility = resolveInteractiveUpscaleToggleEligibility({
      asset: DERIVATIVE_ASSET,
      printWidthInches: 17,
      printHeightInches: 20.48,
      artworkEnhanceMode: "enhanced",
    });
    assert.equal(eligibility.state, "generated");
    assert.equal(eligibility.toggleEnabled, true);
  });
});

describe("resolveInteractiveUpscaleToggleEligibility — STATE D (max resolution)", () => {
  it("disables toggle at cumulative native max without derivative", () => {
    const capacity = resolveInteractiveUpscaleCapacity({
      currentWidthPx: 6000,
      currentHeightPx: 3000,
      nativeSourceWidthPx: 1000,
      nativeSourceHeightPx: 500,
    });
    assert.equal(capacity.isAtMaximumResolution, true);

    const eligibility = resolveInteractiveUpscaleToggleEligibility({
      asset: {
        currentWidthPx: 6000,
        currentHeightPx: 3000,
        nativeSourceWidthPx: 1000,
        nativeSourceHeightPx: 500,
      },
      printWidthInches: 10,
      printHeightInches: 10,
      artworkEnhanceMode: "baseline",
    });
    assert.equal(eligibility.state, "maximum_resolution");
    assert.equal(eligibility.toggleEnabled, false);
  });
});

describe("resolveActiveArtworkPixelDimensions", () => {
  it("uses enhanced pixels when mode is enhanced", () => {
    const active = resolveActiveArtworkPixelDimensions({
      artworkEnhanceMode: "enhanced",
      baselineWidthPx: 3000,
      baselineHeightPx: 3000,
      enhancedWidthPx: 5100,
      enhancedHeightPx: 5100,
    });
    assert.deepEqual(active, { widthPx: 5100, heightPx: 5100 });
  });

  it("uses baseline pixels when mode is baseline", () => {
    const active = resolveActiveArtworkPixelDimensions({
      artworkEnhanceMode: "baseline",
      baselineWidthPx: 3000,
      baselineHeightPx: 3000,
      enhancedWidthPx: 5100,
      enhancedHeightPx: 5100,
    });
    assert.deepEqual(active, { widthPx: 3000, heightPx: 3000 });
  });

  it("returns null when enhanced mode lacks enhanced dimensions (no baseline mislabel)", () => {
    const active = resolveActiveArtworkPixelDimensions({
      artworkEnhanceMode: "enhanced",
      baselineWidthPx: 3000,
      baselineHeightPx: 3000,
      enhancedWidthPx: null,
      enhancedHeightPx: null,
    });
    assert.equal(active, null);
  });
});

describe("resolveInteractiveEnhanceTargetPixels", () => {
  it("returns null when baseline DPI is at/above the 250 initiation floor", () => {
    const target = resolveInteractiveEnhanceTargetPixels({
      baselineWidthPx: 2500,
      baselineHeightPx: 2500,
      nativeWidthPx: 1000,
      nativeHeightPx: 1000,
      printWidthInches: 10,
      printHeightInches: 10,
    });
    assert.equal(target, null);
  });

  it("returns a target when baseline DPI is below 250 and capacity remains", () => {
    const target = resolveInteractiveEnhanceTargetPixels({
      baselineWidthPx: 2400,
      baselineHeightPx: 2400,
      nativeWidthPx: 1000,
      nativeHeightPx: 1000,
      printWidthInches: 10,
      printHeightInches: 10,
    });
    assert.ok(target);
    assert.ok(target.targetWidthPx >= 3000);
  });
});

describe("hasInteractiveArtworkDerivative", () => {
  it("detects derivative marker for catalog and upload parity", () => {
    assert.equal(
      hasInteractiveArtworkDerivative({
        currentWidthPx: 1000,
        currentHeightPx: 1000,
        interactiveEnhanceGeneratedAt: { seconds: 1 },
      }),
      true,
    );
    assert.equal(
      hasInteractiveArtworkDerivative({
        currentWidthPx: 1000,
        currentHeightPx: 1000,
      }),
      false,
    );
  });
});

describe("mergeInteractiveEnhanceResultIntoAssetSummary", () => {
  it("patches enhanced width/height from callable result", () => {
    const merged = mergeInteractiveEnhanceResultIntoAssetSummary(
      {
        id: "d1",
        width: 2000,
        height: 2000,
        interactiveEnhancedWidthPx: undefined as number | undefined,
        interactiveEnhancedHeightPx: undefined as number | undefined,
        interactiveEnhanceGeneratedAt: undefined as unknown,
      },
      { artworkEnhanceMode: "enhanced", widthPx: 5100, heightPx: 4800 },
    );
    assert.equal(merged?.interactiveEnhancedWidthPx, 5100);
    assert.equal(merged?.interactiveEnhancedHeightPx, 4800);
    assert.ok(merged?.interactiveEnhanceGeneratedAt);
  });

  it("does not clear enhanced metadata when switching to baseline", () => {
    const merged = mergeInteractiveEnhanceResultIntoAssetSummary(
      {
        id: "d1",
        interactiveEnhancedWidthPx: 5100,
        interactiveEnhancedHeightPx: 4800,
        interactiveEnhanceGeneratedAt: { seconds: 1 },
      },
      { artworkEnhanceMode: "baseline", widthPx: 2000, heightPx: 2000 },
    );
    assert.equal(merged?.interactiveEnhancedWidthPx, 5100);
    assert.equal(merged?.interactiveEnhancedHeightPx, 4800);
  });

  it("keeps two assets independent when patched separately", () => {
    const a = mergeInteractiveEnhanceResultIntoAssetSummary(
      {
        id: "a",
        width: 1000,
        interactiveEnhancedWidthPx: undefined as number | undefined,
        interactiveEnhancedHeightPx: undefined as number | undefined,
      },
      { artworkEnhanceMode: "enhanced", widthPx: 4000, heightPx: 4000 },
    );
    const b = mergeInteractiveEnhanceResultIntoAssetSummary(
      {
        id: "b",
        width: 1200,
        interactiveEnhancedWidthPx: undefined as number | undefined,
        interactiveEnhancedHeightPx: undefined as number | undefined,
      },
      { artworkEnhanceMode: "enhanced", widthPx: 5500, heightPx: 5200 },
    );
    assert.equal(a?.interactiveEnhancedWidthPx, 4000);
    assert.equal(b?.interactiveEnhancedWidthPx, 5500);
  });
});
