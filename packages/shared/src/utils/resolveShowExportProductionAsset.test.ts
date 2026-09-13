import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { computeExportTargetPixelSize } from "./showExportFilename";
import { resolveShowExportProductionAsset } from "./resolveShowExportProductionAsset";

const catalogDesign = {
  designId: "d1",
  originalPath: "/originals/d1.png",
  interactiveEnhancedOriginalPath: "/originals/d1.interactive.png",
  interactiveEnhancedWidthPx: 6000,
  interactiveEnhancedHeightPx: 4500,
  widthPx: 2000,
  heightPx: 1500,
  title: "Cat Design",
};

const customerUpload = {
  customerUploadId: "up1",
  productionStoragePath: "/customer-uploads/u1/up1/production.png",
  interactiveEnhancedProductionStoragePath: "/customer-uploads/u1/up1/production.interactive.png",
  interactiveEnhancedWidthPx: 5400,
  interactiveEnhancedHeightPx: 3600,
  widthPx: 1800,
  heightPx: 1200,
  originalFilename: "art.png",
};

describe("resolveShowExportProductionAsset", () => {
  it("1. catalog baseline mode → baseline path", () => {
    const resolved = resolveShowExportProductionAsset({
      item: { designId: "d1", artworkEnhanceMode: "baseline" },
      catalogDesign,
    });
    assert.equal(resolved.productionStoragePath, "/originals/d1.png");
    assert.equal(resolved.sourceWidthPx, 2000);
    assert.equal(resolved.sourceHeightPx, 1500);
  });

  it("2. catalog absent mode → baseline path", () => {
    const resolved = resolveShowExportProductionAsset({
      item: { designId: "d1" },
      catalogDesign,
    });
    assert.equal(resolved.productionStoragePath, "/originals/d1.png");
  });

  it("3. catalog enhanced mode → enhanced path", () => {
    const resolved = resolveShowExportProductionAsset({
      item: { designId: "d1", artworkEnhanceMode: "enhanced" },
      catalogDesign,
    });
    assert.equal(resolved.productionStoragePath, "/originals/d1.interactive.png");
    assert.equal(resolved.sourceWidthPx, 6000);
    assert.equal(resolved.sourceHeightPx, 4500);
  });

  it("4. customer upload baseline → baseline upload path", () => {
    const resolved = resolveShowExportProductionAsset({
      item: { sourceType: "customer_upload", customerUploadId: "up1", artworkEnhanceMode: "baseline" },
      customerUpload,
    });
    assert.equal(resolved.productionStoragePath, "/customer-uploads/u1/up1/production.png");
    assert.equal(resolved.sourceWidthPx, 1800);
  });

  it("5. customer upload enhanced → enhanced upload path", () => {
    const resolved = resolveShowExportProductionAsset({
      item: { sourceType: "customer_upload", customerUploadId: "up1", artworkEnhanceMode: "enhanced" },
      customerUpload,
    });
    assert.equal(
      resolved.productionStoragePath,
      "/customer-uploads/u1/up1/production.interactive.png",
    );
    assert.equal(resolved.sourceWidthPx, 5400);
  });

  it("6. enhanced mode + missing derivative → fail closed", () => {
    assert.throws(
      () =>
        resolveShowExportProductionAsset({
          item: { designId: "d1", artworkEnhanceMode: "enhanced" },
          catalogDesign: {
            ...catalogDesign,
            interactiveEnhancedOriginalPath: undefined,
          },
        }),
      /Interactive enhanced artwork is unavailable/,
    );

    assert.throws(
      () =>
        resolveShowExportProductionAsset({
          item: {
            sourceType: "customer_upload",
            customerUploadId: "up1",
            artworkEnhanceMode: "enhanced",
          },
          customerUpload: {
            ...customerUpload,
            interactiveEnhancedProductionStoragePath: null,
          },
        }),
      /Interactive enhanced artwork is unavailable/,
    );
  });

  it("6b. enhanced mode + missing enhanced pixel dims → fail closed", () => {
    assert.throws(
      () =>
        resolveShowExportProductionAsset({
          item: { designId: "d1", artworkEnhanceMode: "enhanced" },
          catalogDesign: {
            ...catalogDesign,
            interactiveEnhancedWidthPx: undefined,
            interactiveEnhancedHeightPx: undefined,
          },
        }),
      /Enhanced .* pixel dimensions are missing/,
    );
  });

  it("7. same design, baseline vs enhanced items → distinct assets", () => {
    const baseline = resolveShowExportProductionAsset({
      item: { designId: "d1", artworkEnhanceMode: "baseline" },
      catalogDesign,
    });
    const enhanced = resolveShowExportProductionAsset({
      item: { designId: "d1", artworkEnhanceMode: "enhanced" },
      catalogDesign,
    });
    assert.notEqual(baseline.productionStoragePath, enhanced.productionStoragePath);
  });

  it("8. physical print size identical regardless of selected variant", () => {
    const printWidthInches = 18;
    const printHeightInches = 12;
    const baselinePixels = resolveShowExportProductionAsset({
      item: { designId: "d1", artworkEnhanceMode: "baseline" },
      catalogDesign,
    });
    const enhancedPixels = resolveShowExportProductionAsset({
      item: { designId: "d1", artworkEnhanceMode: "enhanced" },
      catalogDesign,
    });

    const baselineTarget = computeExportTargetPixelSize(
      printWidthInches,
      printHeightInches,
      baselinePixels.sourceWidthPx,
      baselinePixels.sourceHeightPx,
    );
    const enhancedTarget = computeExportTargetPixelSize(
      printWidthInches,
      printHeightInches,
      enhancedPixels.sourceWidthPx,
      enhancedPixels.sourceHeightPx,
    );

    assert.equal(baselineTarget.targetWidthPx, enhancedTarget.targetWidthPx);
    assert.equal(baselineTarget.targetHeightPx, enhancedTarget.targetHeightPx);
    assert.equal(baselineTarget.needsUpscale, true);
    assert.equal(enhancedTarget.needsUpscale, false);
  });

  it("21. legacy item without new fields exports baseline exactly as before", () => {
    const resolved = resolveShowExportProductionAsset({
      item: { designId: "d1" },
      catalogDesign,
    });
    assert.equal(resolved.productionStoragePath, "/originals/d1.png");
    assert.equal(resolved.sourceWidthPx, 2000);
  });

  it("23. DPI quality calculation matches resolved asset pixels", () => {
    const enhanced = resolveShowExportProductionAsset({
      item: { designId: "d1", artworkEnhanceMode: "enhanced" },
      catalogDesign,
    });
    const target = computeExportTargetPixelSize(18, 12, enhanced.sourceWidthPx, enhanced.sourceHeightPx);
    assert.equal(target.needsUpscale, false);
  });
});
