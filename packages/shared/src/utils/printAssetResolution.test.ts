import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  isAllowedGangSheetOriginalPathSnapshot,
  resolvePrintAssetPaths,
} from "./printAssetResolution";
import { buildShowAllocationSourceFields } from "./showAllocationSourceFields";

describe("printAssetResolution", () => {
  it("resolves upload production path and ignores catalogReviewStatus", () => {
    const resolved = resolvePrintAssetPaths({
      item: { sourceType: "customer_upload", customerUploadId: "up1" },
      customerUpload: {
        customerUploadId: "up1",
        productionStoragePath: "/customer-uploads/uid1/up1/production.png",
        previewStoragePath: "/customer-uploads/uid1/up1/preview.webp",
        originalFilename: "art.png",
        catalogReviewStatus: "excluded_from_catalog",
      },
    });

    assert.equal(resolved.sourceType, "customer_upload");
    assert.equal(resolved.productionStoragePath, "/customer-uploads/uid1/up1/production.png");
    assert.equal(resolved.titleSnapshot, "art.png");
    assert.equal(resolved.designId, undefined);
  });

  it("resolves catalog original path", () => {
    const resolved = resolvePrintAssetPaths({
      item: { designId: "d1" },
      catalogDesign: {
        designId: "d1",
        originalPath: "/originals/d1.png",
        title: "Cat",
      },
    });
    assert.equal(resolved.sourceType, "catalog_design");
    assert.equal(resolved.productionStoragePath, "/originals/d1.png");
  });

  it("accepts gang sheet snapshot path shapes including interactive derivatives", () => {
    assert.equal(isAllowedGangSheetOriginalPathSnapshot("/originals/abc.png"), true);
    assert.equal(
      isAllowedGangSheetOriginalPathSnapshot("/originals/abc.interactive.png"),
      true,
    );
    assert.equal(
      isAllowedGangSheetOriginalPathSnapshot("/customer-uploads/u1/up1/production.png"),
      true,
    );
    assert.equal(
      isAllowedGangSheetOriginalPathSnapshot(
        "/customer-uploads/u1/up1/production.interactive.png",
      ),
      true,
    );
    assert.equal(isAllowedGangSheetOriginalPathSnapshot("/bad/path.png"), false);
  });

  it("resolves enhanced production paths when artworkEnhanceMode is enhanced", () => {
    const catalogResolved = resolvePrintAssetPaths({
      item: { designId: "d1", artworkEnhanceMode: "enhanced" },
      catalogDesign: {
        designId: "d1",
        originalPath: "/originals/d1.png",
        interactiveEnhancedOriginalPath: "/originals/d1.interactive.png",
      },
    });
    assert.equal(catalogResolved.productionStoragePath, "/originals/d1.interactive.png");

    const uploadResolved = resolvePrintAssetPaths({
      item: { sourceType: "customer_upload", customerUploadId: "up1", artworkEnhanceMode: "enhanced" },
      customerUpload: {
        customerUploadId: "up1",
        productionStoragePath: "/customer-uploads/u1/up1/production.png",
        interactiveEnhancedProductionStoragePath:
          "/customer-uploads/u1/up1/production.interactive.png",
      },
    });
    assert.equal(
      uploadResolved.productionStoragePath,
      "/customer-uploads/u1/up1/production.interactive.png",
    );
  });

  it("fails closed when enhanced mode is set but derivative path is missing", () => {
    assert.throws(
      () =>
        resolvePrintAssetPaths({
          item: { designId: "d1", artworkEnhanceMode: "enhanced" },
          catalogDesign: {
            designId: "d1",
            originalPath: "/originals/d1.png",
          },
        }),
      /Interactive enhanced artwork is unavailable/,
    );

    assert.throws(
      () =>
        resolvePrintAssetPaths({
          item: {
            sourceType: "customer_upload",
            customerUploadId: "up1",
            artworkEnhanceMode: "enhanced",
          },
          customerUpload: {
            customerUploadId: "up1",
            productionStoragePath: "/customer-uploads/u1/up1/production.png",
          },
        }),
      /Interactive enhanced artwork is unavailable/,
    );
  });
});

describe("showAllocationSourceFields", () => {
  it("omits designId for upload allocations", () => {
    const fields = buildShowAllocationSourceFields({
      item: {
        sourceType: "customer_upload",
        customerUploadId: "up1",
        titleSnapshot: "x.png",
        quantity: 1,
      },
    });
    assert.equal(fields.sourceType, "customer_upload");
    assert.equal(fields.customerUploadId, "up1");
    assert.equal(fields.designId, undefined);
    assert.equal(fields.designTitleSnapshot, "x.png");
  });

  it("requires designId for catalog allocations", () => {
    const fields = buildShowAllocationSourceFields({
      item: { designId: "d1", quantity: 2 },
    });
    assert.equal(fields.sourceType, "catalog_design");
    assert.equal(fields.designId, "d1");
    assert.equal(fields.customerUploadId, undefined);
  });
});
