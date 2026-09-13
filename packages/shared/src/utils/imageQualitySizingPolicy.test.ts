import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  AUTOMATED_UPSCALE_TARGET_WIDTH_INCHES,
  DEFAULT_PRINT_REQUEST_WIDTH_INCHES,
  IMAGE_QUALITY_SIZING_POLICY_VERSION,
  MAX_APPROVED_PRINT_HEIGHT_INCHES,
  MAX_APPROVED_PRINT_WIDTH_INCHES,
  TARGET_PRINT_DPI,
} from "../constants/printSize.constants";
import {
  buildImageQualitySizingMetadata,
  calculateApprovedMaxPrintSize,
  resolveAspectLockedTargetInches,
  resolveControlledUpscale,
  resolveDefaultPrintRequestSizeInches,
} from "./imageQualitySizingPolicy";

describe("resolveAspectLockedTargetInches (automated upscale target)", () => {
  it("uses 15in width for square artwork", () => {
    const result = resolveAspectLockedTargetInches(3000, 3000);
    assert.equal(result.targetWidthInches, AUTOMATED_UPSCALE_TARGET_WIDTH_INCHES);
    assert.equal(result.targetHeightInches, AUTOMATED_UPSCALE_TARGET_WIDTH_INCHES);
  });

  it("reduces width for tall artwork so height stays at 16.5in", () => {
    const result = resolveAspectLockedTargetInches(2766, 4896);
    assert.ok(result.targetHeightInches <= MAX_APPROVED_PRINT_HEIGHT_INCHES + 1e-9);
    assert.ok(result.targetWidthInches < AUTOMATED_UPSCALE_TARGET_WIDTH_INCHES);
  });
});

describe("resolveDefaultPrintRequestSizeInches", () => {
  it("keeps the normal request default at 10in for square artwork", () => {
    const result = resolveDefaultPrintRequestSizeInches(3600, 3600);
    assert.equal(result.targetWidthInches, DEFAULT_PRINT_REQUEST_WIDTH_INCHES);
    assert.equal(result.targetHeightInches, DEFAULT_PRINT_REQUEST_WIDTH_INCHES);
  });
});

describe("calculateApprovedMaxPrintSize", () => {
  it("large square 32in @ 300 → approved max 15×15", () => {
    const result = calculateApprovedMaxPrintSize(32 * 300, 32 * 300);
    assert.equal(result.approvedMaxPrintWidthInches, 15);
    assert.equal(result.approvedMaxPrintHeightInches, 15);
  });

  it("native 12in square → approved max 12×12", () => {
    const result = calculateApprovedMaxPrintSize(12 * 300, 12 * 300);
    assert.equal(result.approvedMaxPrintWidthInches, 12);
    assert.equal(result.approvedMaxPrintHeightInches, 12);
  });

  it("respects height envelope for tall images", () => {
    const w = 9.22 * 300;
    const h = 16.32 * 300;
    const result = calculateApprovedMaxPrintSize(w, h);
    assert.ok(result.approvedMaxPrintWidthInches <= MAX_APPROVED_PRINT_WIDTH_INCHES);
    assert.ok(result.approvedMaxPrintHeightInches <= MAX_APPROVED_PRINT_HEIGHT_INCHES + 0.01);
    assert.ok(Math.abs(result.approvedMaxPrintWidthInches - 9.22) < 0.05);
  });
});

describe("resolveControlledUpscale", () => {
  it("does not upscale or downsample a large 32in square", () => {
    const px = 32 * TARGET_PRINT_DPI;
    const decision = resolveControlledUpscale(px, px);
    assert.equal(decision.wasUpscaled, false);
    assert.equal(decision.targetWidthPx, null);
    assert.equal(decision.upscalePassCount, 0);
  });

  it("does not upscale a native 16in square (already above 15in target)", () => {
    const px = 16 * TARGET_PRINT_DPI;
    const decision = resolveControlledUpscale(px, px);
    assert.equal(decision.wasUpscaled, false);
    assert.equal(decision.targetWidthPx, null);
  });

  it("upscales a 6in square once at 2.5× toward 15in (not extended)", () => {
    const px = 6 * TARGET_PRINT_DPI;
    const decision = resolveControlledUpscale(px, px);
    assert.equal(decision.wasUpscaled, true);
    assert.equal(decision.upscalePassCount, 1);
    assert.equal(decision.upscaleFactor, 2.5);
    assert.equal(decision.targetWidthPx, 15 * TARGET_PRINT_DPI);
    assert.equal(decision.sizingWarningCode, "EXTENDED_UPSCALE");
  });

  it("caps a 300px-wide image at 6× (~6in), never reaches 15in", () => {
    const decision = resolveControlledUpscale(300, 300);
    assert.equal(decision.wasUpscaled, true);
    assert.equal(decision.upscalePassCount, 1);
    assert.equal(decision.upscaleFactor, 6);
    assert.equal(decision.targetWidthPx, 1800);
    assert.equal(decision.sizingWarningCode, "TARGET_NOT_REACHED_UPSCALE_CAPPED");
    const meta = buildImageQualitySizingMetadata(
      decision.targetWidthPx!,
      decision.targetHeightPx!,
      decision,
    );
    assert.equal(meta.approvedMaxPrintWidthInches, 6);
  });

  it("Achy Breaky regression: 641×597 → capped at 6× toward 15in envelope, one pass", () => {
    const decision = resolveControlledUpscale(641, 597);
    assert.equal(decision.wasUpscaled, true);
    assert.equal(decision.upscalePassCount, 1);
    assert.equal(decision.upscaleFactor, 6);
    assert.equal(decision.targetWidthPx, 3846);
    assert.equal(decision.targetHeightPx, 3582);
    assert.equal(decision.sizingWarningCode, "TARGET_NOT_REACHED_UPSCALE_CAPPED");

    const meta = buildImageQualitySizingMetadata(
      decision.targetWidthPx!,
      decision.targetHeightPx!,
      decision,
    );
    assert.ok(Math.abs(meta.approvedMaxPrintWidthInches - 12.82) < 0.05);
    assert.ok(Math.abs(meta.approvedMaxPrintHeightInches - 11.94) < 0.05);

    const requestDefault = resolveDefaultPrintRequestSizeInches(
      decision.targetWidthPx!,
      decision.targetHeightPx!,
    );
    assert.equal(requestDefault.targetWidthInches, DEFAULT_PRINT_REQUEST_WIDTH_INCHES);
    assert.ok(Math.abs(requestDefault.targetHeightInches - 9.31) < 0.02);
  });

  it("Best Christmas (~9.11×8.44) upscales toward 15in", () => {
    const w = 2733;
    const h = 2531;
    const decision = resolveControlledUpscale(w, h);
    assert.equal(decision.wasUpscaled, true);
    assert.equal(decision.upscalePassCount, 1);
    assert.ok(decision.upscaleFactor > 1.6 && decision.upscaleFactor < 1.7);
    assert.ok(decision.targetWidthPx !== null && decision.targetWidthPx! >= 4490);
    assert.ok(decision.targetWidthPx! <= 4510);
    const meta = buildImageQualitySizingMetadata(
      decision.targetWidthPx!,
      decision.targetHeightPx!,
      decision,
    );
    assert.ok(Math.abs(meta.approvedMaxPrintWidthInches - 15) < 0.05);
    assert.ok(Math.abs(meta.approvedMaxPrintHeightInches - 13.89) < 0.08);
    const requestDefault = resolveDefaultPrintRequestSizeInches(
      decision.targetWidthPx!,
      decision.targetHeightPx!,
    );
    assert.equal(requestDefault.targetWidthInches, DEFAULT_PRINT_REQUEST_WIDTH_INCHES);
  });

  it("does not force tall near-envelope art toward 12in width", () => {
    const w = Math.round(9.22 * TARGET_PRINT_DPI);
    const h = Math.round(16.32 * TARGET_PRINT_DPI);
    const decision = resolveControlledUpscale(w, h);
    assert.equal(decision.wasUpscaled, false);
    assert.equal(decision.targetWidthPx, null);
    assert.ok(decision.aspectLockedTarget.targetWidthInches < 10);
    assert.ok(Math.abs(decision.nativeWidthAt300 - 9.22) < 0.02);
  });

  it("skips upscale when within 5% of 15in target", () => {
    const px = Math.round(14.4 * TARGET_PRINT_DPI);
    const decision = resolveControlledUpscale(px, px);
    assert.equal(decision.wasUpscaled, false);
    assert.equal(decision.sizingWarningCode, "NEAR_TARGET_SKIPPED");
  });

  it("never proposes a downsample target", () => {
    const decision = resolveControlledUpscale(5000, 5000);
    assert.equal(decision.targetWidthPx, null);
    assert.equal(decision.wasUpscaled, false);
  });

  it("large native artwork preserves pixels and receives up to 15in approved max", () => {
    const px = 32 * TARGET_PRINT_DPI;
    const decision = resolveControlledUpscale(px, px);
    assert.equal(decision.wasUpscaled, false);
    const approved = calculateApprovedMaxPrintSize(px, px);
    assert.equal(approved.approvedMaxPrintWidthInches, 15);
    assert.equal(approved.approvedMaxPrintHeightInches, 15);
  });
});

describe("buildImageQualitySizingMetadata", () => {
  it("persists policy version and approved max after capped upscale", () => {
    const productionPx = 6 * TARGET_PRINT_DPI;
    const meta = buildImageQualitySizingMetadata(productionPx, productionPx, {
      wasUpscaled: true,
      upscalePassCount: 1,
      upscaleFactor: 6,
      sizingWarningCode: "TARGET_NOT_REACHED_UPSCALE_CAPPED",
    });
    assert.equal(meta.sizingPolicyVersion, IMAGE_QUALITY_SIZING_POLICY_VERSION);
    assert.equal(meta.approvedMaxPrintWidthInches, 6);
    assert.equal(meta.wasUpscaled, true);
    assert.equal(meta.sizingWarningCode, "TARGET_NOT_REACHED_UPSCALE_CAPPED");
  });
});
