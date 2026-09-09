import assert from "node:assert/strict";
import { describe, it, test } from "node:test";

import { DEFAULT_GANG_SHEET_SECTION_PRICING_CONFIG } from "../constants/gangSheetSectionPricingSettings.constants";
import type { ExportGangSheetPngRequest } from "../types/export/gangSheetExportIpc.types";
import {
  buildGangSheetCacheFingerprint,
  sanitizeGangSheetCacheShowId,
} from "./gangSheetCacheFingerprint";

function sampleRequest(overrides: Partial<ExportGangSheetPngRequest> = {}): ExportGangSheetPngRequest {
  return {
    baseFileName: "whatnot_07-10-2026_gang-sheet",
    sheetWidthInches: 22,
    sideMarginInches: 0.25,
    topBottomMarginInches: 0.25,
    gutterInches: 0.125,
    maxSheetLengthInches: 100,
    labelFontSizePx: 48,
    images: [
      {
        allocationId: "alloc-b",
        downloadUrl: "https://firebasestorage.googleapis.com/v0/b/x/o/y",
        productionStoragePath: "/originals/b.png",
        targetWidthPx: 900,
        targetHeightPx: 1200,
        fileName: "Design B",
        quantity: 2,
      },
      {
        allocationId: "alloc-a",
        downloadUrl: "https://firebasestorage.googleapis.com/v0/b/x/o/z",
        productionStoragePath: "/originals/a.png",
        targetWidthPx: 900,
        targetHeightPx: 900,
        fileName: "Design A",
        quantity: 1,
      },
    ],
    ...overrides,
  };
}

describe("buildGangSheetCacheFingerprint", () => {
  it("is stable regardless of image order or download URL", () => {
    const first = buildGangSheetCacheFingerprint(sampleRequest());
    const second = buildGangSheetCacheFingerprint(
      sampleRequest({
        images: [
          {
            allocationId: "alloc-a",
            downloadUrl: "https://firebasestorage.googleapis.com/v0/b/x/o/different",
            productionStoragePath: "/originals/a.png",
            targetWidthPx: 900,
            targetHeightPx: 900,
            fileName: "Design A",
            quantity: 1,
          },
          {
            allocationId: "alloc-b",
            downloadUrl: "https://firebasestorage.googleapis.com/v0/b/x/o/other",
            productionStoragePath: "/originals/b.png",
            targetWidthPx: 900,
            targetHeightPx: 1200,
            fileName: "Design B",
            quantity: 2,
          },
        ],
      }),
    );

    assert.equal(first, second);
  });

  it("changes when quantity changes", () => {
    const baseline = buildGangSheetCacheFingerprint(sampleRequest());
    const changed = buildGangSheetCacheFingerprint(
      sampleRequest({
        images: [
          {
            allocationId: "alloc-a",
            downloadUrl: "https://firebasestorage.googleapis.com/v0/b/x/o/z",
            productionStoragePath: "/originals/a.png",
            targetWidthPx: 900,
            targetHeightPx: 900,
            fileName: "Design A",
            quantity: 99,
          },
          {
            allocationId: "alloc-b",
            downloadUrl: "https://firebasestorage.googleapis.com/v0/b/x/o/y",
            productionStoragePath: "/originals/b.png",
            targetWidthPx: 900,
            targetHeightPx: 1200,
            fileName: "Design B",
            quantity: 2,
          },
        ],
      }),
    );

    assert.notEqual(baseline, changed);
  });

  it("ignores omitted layoutMode so efficiency fingerprints stay stable", () => {
    const efficiency = buildGangSheetCacheFingerprint(sampleRequest());
    const explicitEfficiency = buildGangSheetCacheFingerprint(
      sampleRequest({ layoutMode: "efficiency" }),
    );

    assert.equal(efficiency, explicitEfficiency);
  });

  it("changes when grouped layout mode is selected", () => {
    const efficiency = buildGangSheetCacheFingerprint(sampleRequest());
    const grouped = buildGangSheetCacheFingerprint(
      sampleRequest({
        layoutMode: "grouped_by_customer",
        images: sampleRequest().images.map((image) => ({
          ...image,
          grouping: {
            printRequestId: "req-1",
            requestName: "alice-IR001",
            customerUsernameSnapshot: "alice",
            isInternal: false,
          },
        })),
      }),
    );

    assert.notEqual(efficiency, grouped);
  });

  it("distinguishes sheet-per-customer and continuous grouped fingerprints", () => {
    const groupedImages = sampleRequest().images.map((image) => ({
      ...image,
      grouping: {
        printRequestId: "req-1",
        requestName: "alice-IR001",
        customerUsernameSnapshot: "alice",
        isInternal: false,
      },
    }));

    const sheetPerCustomer = buildGangSheetCacheFingerprint(
      sampleRequest({
        layoutMode: "grouped_by_customer",
        baseFileName: "whatnot_07-10-2026_grouped-gang-sheet",
        images: groupedImages,
      }),
    );
    const continuousGrouped = buildGangSheetCacheFingerprint(
      sampleRequest({
        layoutMode: "customer_grouped_continuous",
        baseFileName: "whatnot_07-10-2026_grouped-continuous-gang-sheet",
        images: groupedImages,
      }),
    );

    assert.notEqual(sheetPerCustomer, continuousGrouped);
  });

  it("changes when active production asset path changes for the same allocation", () => {
    const baseline = buildGangSheetCacheFingerprint(sampleRequest());
    const enhanced = buildGangSheetCacheFingerprint(
      sampleRequest({
        images: sampleRequest().images.map((image) => ({
          ...image,
          productionStoragePath:
            image.allocationId === "alloc-a"
              ? "/originals/a.interactive.png"
              : image.productionStoragePath,
        })),
      }),
    );

    assert.notEqual(baseline, enhanced);
  });

  it("includes sectionSummaryVersion for grouped customer layouts", () => {
    const grouped = buildGangSheetCacheFingerprint(
      sampleRequest({
        layoutMode: "grouped_by_customer",
        images: sampleRequest().images.map((image) => ({
          ...image,
          grouping: {
            printRequestId: "req-1",
            requestName: "alice-IR001",
            customerUsernameSnapshot: "alice",
            isInternal: false,
          },
        })),
      }),
    );
    const groupedWithSummaryBump = buildGangSheetCacheFingerprint(
      sampleRequest({
        layoutMode: "grouped_by_customer",
        images: sampleRequest().images.map((image) => ({
          ...image,
          grouping: {
            printRequestId: "req-1",
            requestName: "alice-IR001",
            customerUsernameSnapshot: "alice",
            isInternal: false,
          },
        })),
        labelFontSizePx: 49,
      }),
    );

    assert.notEqual(grouped, groupedWithSummaryBump);
  });

  it("changes grouped fingerprint when print dimensions cross price tier", () => {
    const groupedImages = sampleRequest().images.map((image) => ({
      ...image,
      grouping: {
        printRequestId: "req-1",
        requestName: "alice-IR001",
        customerUsernameSnapshot: "alice",
        isInternal: false,
      },
      printWidthInches: 5.5,
      printHeightInches: 5.5,
    }));

    const smallTier = buildGangSheetCacheFingerprint(
      sampleRequest({
        layoutMode: "grouped_by_customer",
        images: groupedImages,
      }),
    );
    const largeTier = buildGangSheetCacheFingerprint(
      sampleRequest({
        layoutMode: "grouped_by_customer",
        images: groupedImages.map((image) => ({
          ...image,
          printWidthInches: 6,
          printHeightInches: 5.5,
        })),
      }),
    );

    assert.notEqual(smallTier, largeTier);
  });

  it("changes grouped fingerprint when section pricing settings change", () => {
    const groupedBase = sampleRequest({
      layoutMode: "grouped_by_customer",
      sectionPricing: DEFAULT_GANG_SHEET_SECTION_PRICING_CONFIG,
      images: sampleRequest().images.map((image) => ({
        ...image,
        grouping: {
          printRequestId: "req-1",
          requestName: "alice-IR001",
          customerUsernameSnapshot: "alice",
          isInternal: false,
        },
      })),
    });

    const largePriceChanged = buildGangSheetCacheFingerprint({
      ...groupedBase,
      sectionPricing: {
        ...DEFAULT_GANG_SHEET_SECTION_PRICING_CONFIG,
        standardFullSize: { ...DEFAULT_GANG_SHEET_SECTION_PRICING_CONFIG.standardFullSize, priceUsd: 2.5 },
      },
    });
    const smallWeightChanged = buildGangSheetCacheFingerprint({
      ...groupedBase,
      sectionPricing: {
        ...DEFAULT_GANG_SHEET_SECTION_PRICING_CONFIG,
        pocket: { ...DEFAULT_GANG_SHEET_SECTION_PRICING_CONFIG.pocket, weightOz: 0.5 },
      },
    });
    const baseline = buildGangSheetCacheFingerprint(groupedBase);

    assert.notEqual(baseline, largePriceChanged);
    assert.notEqual(baseline, smallWeightChanged);
  });

  it("keeps efficiency fingerprint stable when only grouped pricing settings would change", () => {
    const efficiency = buildGangSheetCacheFingerprint(sampleRequest());
    const efficiencyAgain = buildGangSheetCacheFingerprint(
      sampleRequest({
        images: sampleRequest().images.map((image) => ({
          ...image,
          printWidthInches: 8,
          printHeightInches: 8,
        })),
      }),
    );

    assert.equal(efficiency, efficiencyAgain);
  });
});

describe("sanitizeGangSheetCacheShowId", () => {
  it("strips unsafe path characters", () => {
    assert.equal(sanitizeGangSheetCacheShowId("../evil/show"), "evil_show");
  });

  it("falls back when empty", () => {
    assert.equal(sanitizeGangSheetCacheShowId("   "), "show");
  });
});

test("request item identity and human-readable sheet label participate in cache isolation", () => {
  const base = sampleRequest({
    images: [{ ...sampleRequest().images[0], allocationId: "item-1", requestItemId: "item-1" }],
    sheetLabel: "alice-CR001",
  });
  const otherRequest = buildGangSheetCacheFingerprint({ ...base, sheetLabel: "alice-CR002" });
  assert.notEqual(buildGangSheetCacheFingerprint(base), otherRequest);
  assert.notEqual(
    buildGangSheetCacheFingerprint({ ...base, cacheScope: "print-request:req-1" }),
    buildGangSheetCacheFingerprint({ ...base, cacheScope: "print-request:req-2" }),
  );
});
