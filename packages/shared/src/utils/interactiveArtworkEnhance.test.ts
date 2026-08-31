import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  hasInteractiveArtworkDerivative,
  isInteractiveUpscaleGenerationOfferedAtPrintSize,
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
});

describe("isInteractiveUpscaleGenerationOfferedAtPrintSize", () => {
  it("offers first-time generation below ~300 DPI target, not at 250-only gate", () => {
    assert.equal(isInteractiveUpscaleGenerationOfferedAtPrintSize(2270, 2270, 10, 10), true);
    assert.equal(isInteractiveUpscaleGenerationOfferedAtPrintSize(3000, 3000, 10, 10), false);
    assert.equal(isInteractiveUpscaleGenerationOfferedAtPrintSize(2600, 2600, 10, 10), true);
  });

  it("227 baseline DPI is not classified as enhancement unnecessary when capacity remains", () => {
    assert.equal(isInteractiveUpscaleGenerationOfferedAtPrintSize(3860, 3860, 17, 20.48), true);
  });
});

describe("resolveInteractiveUpscaleToggleEligibility — STATE A (no derivative)", () => {
  it("offers first-time generation when below target and capacity allows", () => {
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

  it("derivative exists + 300+ baseline DPI → user may still select enhanced derivative", () => {
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

describe("resolveInteractiveEnhanceTargetPixels", () => {
  it("targets roughly 300 DPI at 16 inches when capacity allows (first generation only)", () => {
    const target = resolveInteractiveEnhanceTargetPixels({
      baselineWidthPx: 3000,
      baselineHeightPx: 3000,
      nativeWidthPx: 1000,
      nativeHeightPx: 1000,
      printWidthInches: 16,
      printHeightInches: 16,
    });
    assert.ok(target);
    assert.ok(target.targetWidthPx >= 4500);
    assert.ok(target.cumulativeFactor <= 6.01);
  });
});

describe("200 DPI hard floor vs 300 DPI enhancement target", () => {
  it("keeps generation offer separate from 200 DPI save floor", () => {
    const at227 = isInteractiveUpscaleGenerationOfferedAtPrintSize(3860, 3860, 17, 20.48);
    assert.equal(at227, true);
    const at200Floor = isInteractiveUpscaleGenerationOfferedAtPrintSize(2000, 2000, 10, 10);
    assert.equal(at200Floor, true);
  });
});
