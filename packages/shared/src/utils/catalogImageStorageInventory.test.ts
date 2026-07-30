import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  buildCatalogImageStorageInventoryReport,
  type CatalogImageStorageDesignRecord,
  type CatalogImageStorageObjectMetadata,
  type CatalogImageStoragePromotionRecord,
} from "./catalogImageStorageInventory";

const NOW_MS = Date.parse("2026-07-30T00:00:00Z");

function object(
  overrides: Partial<CatalogImageStorageObjectMetadata> & { designId: string },
): CatalogImageStorageObjectMetadata {
  return {
    path: `${overrides.family ?? "thumbnails"}/${overrides.designId}.webp`,
    family: "thumbnails",
    sizeBytes: 1000,
    timeCreated: "2026-07-01T00:00:00Z",
    updated: "2026-07-01T00:00:00Z",
    ...overrides,
  };
}

function design(overrides: Partial<CatalogImageStorageDesignRecord> & { designId: string }): CatalogImageStorageDesignRecord {
  return {
    status: "ready",
    originalPath: `/originals/${overrides.designId}.png`,
    thumbnailPath: `/thumbnails/${overrides.designId}.webp`,
    previewPath: `/previews/${overrides.designId}.webp`,
    displayPath: null,
    assetsPurgedAt: null,
    sourceCustomerUploadId: null,
    ...overrides,
  };
}

describe("buildCatalogImageStorageInventoryReport", () => {
  it("classifies an object matching a design's field as referenced", () => {
    const report = buildCatalogImageStorageInventoryReport({
      objects: [object({ designId: "d1", family: "thumbnails" })],
      designs: [design({ designId: "d1" })],
      promotions: [],
      nowMs: NOW_MS,
    });
    assert.equal(report.classifiedObjects.length, 1);
    assert.equal(report.classifiedObjects[0]!.classification, "referenced");
    assert.equal(report.classifiedObjects[0]!.confidence, "high");
    assert.equal(report.classifiedObjects[0]!.recommendedAction, "none");
  });

  it("classifies an object with no matching design doc at all as orphaned_candidate with high confidence", () => {
    const report = buildCatalogImageStorageInventoryReport({
      objects: [object({ designId: "ghost", family: "thumbnails" })],
      designs: [],
      promotions: [],
      nowMs: NOW_MS,
    });
    assert.equal(report.classifiedObjects[0]!.classification, "orphaned_candidate");
    assert.equal(report.classifiedObjects[0]!.confidence, "high");
    assert.equal(report.classifiedObjects[0]!.relatedDesignId, null);
  });

  it("classifies an object whose path doesn't match the design's current field as orphaned_candidate with medium confidence (stale reference)", () => {
    const report = buildCatalogImageStorageInventoryReport({
      objects: [object({ designId: "d1", family: "thumbnails", path: "thumbnails/d1-old.webp" })],
      designs: [design({ designId: "d1" })],
      promotions: [],
      nowMs: NOW_MS,
    });
    assert.equal(report.classifiedObjects[0]!.classification, "orphaned_candidate");
    assert.equal(report.classifiedObjects[0]!.confidence, "medium");
  });

  it("never classifies a referenced (currently-pointed-to) object as a cleanup candidate", () => {
    const objects = [
      object({ designId: "d1", family: "originals", path: "originals/d1.png" }),
      object({ designId: "d1", family: "thumbnails", path: "thumbnails/d1.webp" }),
      object({ designId: "d1", family: "previews", path: "previews/d1.webp" }),
    ];
    const report = buildCatalogImageStorageInventoryReport({
      objects,
      designs: [design({ designId: "d1" })],
      promotions: [],
      nowMs: NOW_MS,
    });
    for (const classified of report.classifiedObjects) {
      assert.equal(classified.classification, "referenced");
      assert.notEqual(classified.recommendedAction, "review_before_delete");
    }
  });

  it("flags an original/preview still present on an assetsPurgedAt design as purged_per_policy_violation, not referenced", () => {
    const report = buildCatalogImageStorageInventoryReport({
      objects: [object({ designId: "d1", family: "originals", path: "originals/d1.png" })],
      designs: [design({ designId: "d1", status: "archived", assetsPurgedAt: "2026-07-01T00:00:00Z" })],
      promotions: [],
      nowMs: NOW_MS,
    });
    assert.equal(report.classifiedObjects[0]!.classification, "purged_per_policy_violation");
    assert.equal(report.classifiedObjects[0]!.recommendedAction, "investigate_policy_violation");
  });

  it("does not flag a thumbnail as a policy violation on a purged design (thumbnails are kept per ADR-FP-084)", () => {
    const report = buildCatalogImageStorageInventoryReport({
      objects: [object({ designId: "d1", family: "thumbnails", path: "thumbnails/d1.webp" })],
      designs: [design({ designId: "d1", status: "archived", assetsPurgedAt: "2026-07-01T00:00:00Z" })],
      promotions: [],
      nowMs: NOW_MS,
    });
    assert.equal(report.classifiedObjects[0]!.classification, "referenced");
  });

  it("classifies an unreferenced original within the 14-day promotion cool-off window as promotion_cool_off_duplicate, not deletable", () => {
    const promotedAtMillis = NOW_MS - 5 * 24 * 60 * 60 * 1000; // 5 days ago
    const promotions: CatalogImageStoragePromotionRecord[] = [
      { uploadId: "u1", promotedDesignId: "d1", promotedAtMillis, fullSizePurgedAt: null },
    ];
    const report = buildCatalogImageStorageInventoryReport({
      objects: [object({ designId: "d1", family: "originals", path: "originals/d1-stale.png" })],
      designs: [],
      promotions,
      nowMs: NOW_MS,
    });
    assert.equal(report.classifiedObjects[0]!.classification, "promotion_cool_off_duplicate");
    assert.equal(report.classifiedObjects[0]!.recommendedAction, "none");
  });

  it("does not treat a promotion outside the cool-off window (>14 days) as a protected duplicate", () => {
    const promotedAtMillis = NOW_MS - 20 * 24 * 60 * 60 * 1000; // 20 days ago
    const promotions: CatalogImageStoragePromotionRecord[] = [
      { uploadId: "u1", promotedDesignId: "d1", promotedAtMillis, fullSizePurgedAt: null },
    ];
    const report = buildCatalogImageStorageInventoryReport({
      objects: [object({ designId: "d1", family: "originals", path: "originals/d1-stale.png" })],
      designs: [],
      promotions,
      nowMs: NOW_MS,
    });
    assert.equal(report.classifiedObjects[0]!.classification, "orphaned_candidate");
  });

  it("does not treat an already fullSizePurgedAt promotion as still in cool-off", () => {
    const promotedAtMillis = NOW_MS - 5 * 24 * 60 * 60 * 1000;
    const promotions: CatalogImageStoragePromotionRecord[] = [
      {
        uploadId: "u1",
        promotedDesignId: "d1",
        promotedAtMillis,
        fullSizePurgedAt: "2026-07-29T00:00:00Z",
      },
    ];
    const report = buildCatalogImageStorageInventoryReport({
      objects: [object({ designId: "d1", family: "originals", path: "originals/d1-stale.png" })],
      designs: [],
      promotions,
      nowMs: NOW_MS,
    });
    assert.equal(report.classifiedObjects[0]!.classification, "orphaned_candidate");
  });

  it("reports a Firestore reference pointing to a missing Storage object", () => {
    const report = buildCatalogImageStorageInventoryReport({
      objects: [],
      designs: [design({ designId: "d1" })],
      promotions: [],
      nowMs: NOW_MS,
    });
    assert.equal(report.missingObjects.length, 3); // original + thumbnail + preview all missing
    const families = report.missingObjects.map((m) => m.family).sort();
    assert.deepEqual(families, ["originals", "previews", "thumbnails"]);
  });

  it("does not report missing originals/previews for an archived+purged design (expected absence)", () => {
    const report = buildCatalogImageStorageInventoryReport({
      objects: [],
      designs: [design({ designId: "d1", status: "archived", assetsPurgedAt: "2026-07-01T00:00:00Z" })],
      promotions: [],
      nowMs: NOW_MS,
    });
    // Thumbnail is still expected to exist per ADR-FP-084 ("keep thumbnail") — reported missing.
    assert.equal(report.missingObjects.length, 1);
    assert.equal(report.missingObjects[0]!.family, "thumbnails");
  });

  it("produces deterministic output for the same input (no randomness, no Date.now() inside the pure function)", () => {
    const input = {
      objects: [object({ designId: "d1", family: "thumbnails" })],
      designs: [design({ designId: "d1" })],
      promotions: [] as CatalogImageStoragePromotionRecord[],
      nowMs: NOW_MS,
    };
    const first = buildCatalogImageStorageInventoryReport(input);
    const second = buildCatalogImageStorageInventoryReport(input);
    assert.deepEqual(first, second);
  });

  it("computes correct family totals and averages", () => {
    const report = buildCatalogImageStorageInventoryReport({
      objects: [
        object({ designId: "d1", family: "thumbnails", sizeBytes: 1000 }),
        object({ designId: "d2", family: "thumbnails", sizeBytes: 2000 }),
        object({ designId: "d1", family: "previews", sizeBytes: 5000 }),
      ],
      designs: [],
      promotions: [],
      nowMs: NOW_MS,
    });
    const thumbnailTotals = report.familyTotals.find((f) => f.family === "thumbnails")!;
    assert.equal(thumbnailTotals.objectCount, 2);
    assert.equal(thumbnailTotals.totalBytes, 3000);
    assert.equal(thumbnailTotals.averageBytes, 1500);
    const previewTotals = report.familyTotals.find((f) => f.family === "previews")!;
    assert.equal(previewTotals.objectCount, 1);
    assert.equal(previewTotals.totalBytes, 5000);
    const originalsTotals = report.familyTotals.find((f) => f.family === "originals")!;
    assert.equal(originalsTotals.objectCount, 0);
    assert.equal(originalsTotals.averageBytes, 0);
  });

  it("summary counts reconcile with classifiedObjects array", () => {
    const report = buildCatalogImageStorageInventoryReport({
      objects: [
        object({ designId: "d1", family: "thumbnails" }),
        object({ designId: "ghost", family: "thumbnails" }),
      ],
      designs: [design({ designId: "d1" })],
      promotions: [],
      nowMs: NOW_MS,
    });
    assert.equal(report.summary.totalObjects, 2);
    assert.equal(
      report.summary.referencedCount +
        report.summary.orphanedCandidateCount +
        report.summary.purgedPerPolicyViolationCount +
        report.summary.promotionCoolOffDuplicateCount,
      2,
    );
  });

  it("defaults generatedAssetTotals to an empty array when no generatedAssets param is given", () => {
    const report = buildCatalogImageStorageInventoryReport({
      objects: [],
      designs: [],
      promotions: [],
      nowMs: NOW_MS,
    });
    assert.deepEqual(report.generatedAssetTotals, []);
  });

  it("aggregates generated JSON assets by prefix, separate from the per-design family totals", () => {
    const report = buildCatalogImageStorageInventoryReport({
      objects: [],
      designs: [],
      promotions: [],
      nowMs: NOW_MS,
      generatedAssets: [
        { prefix: "generated/catalog-reference", sizeBytes: 1000 },
        { prefix: "generated/catalog-reference", sizeBytes: 3000 },
        { prefix: "generated/portal-catalog", sizeBytes: 500 },
      ],
    });
    const catalogRef = report.generatedAssetTotals.find(
      (t) => t.prefix === "generated/catalog-reference",
    )!;
    assert.equal(catalogRef.objectCount, 2);
    assert.equal(catalogRef.totalBytes, 4000);
    assert.equal(catalogRef.averageBytes, 2000);

    const portalCatalog = report.generatedAssetTotals.find(
      (t) => t.prefix === "generated/portal-catalog",
    )!;
    assert.equal(portalCatalog.objectCount, 1);
    assert.equal(portalCatalog.totalBytes, 500);

    // Generated assets never appear in familyTotals or classifiedObjects — they have no designId.
    assert.equal(report.classifiedObjects.length, 0);
    for (const family of report.familyTotals) {
      assert.equal(family.objectCount, 0);
    }
  });
});
