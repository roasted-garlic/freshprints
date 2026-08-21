import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  assessCurrentRequestItemAttention,
  buildCurrentRequestAggregates,
  resolveCatalogAddAction,
  selectPrimaryCatalogVariantItemId,
  type CurrentRequestItemLike,
} from "./currentRequestAggregates";

function item(partial: Partial<CurrentRequestItemLike> & Pick<CurrentRequestItemLike, "id">): CurrentRequestItemLike {
  return {
    quantity: 1,
    createdAtMs: 1_000,
    ...partial,
  };
}

describe("selectPrimaryCatalogVariantItemId", () => {
  it("picks earliest createdAt among catalog variants of the same design", () => {
    const items = [
      item({
        id: "later",
        designId: "cow",
        sourceType: "catalog_design",
        createdAtMs: 3_000,
        quantity: 5,
      }),
      item({
        id: "earlier",
        designId: "cow",
        sourceType: "catalog_design",
        createdAtMs: 1_000,
        quantity: 2,
      }),
      item({
        id: "upload",
        customerUploadId: "up1",
        sourceType: "customer_upload",
        createdAtMs: 500,
        quantity: 1,
      }),
    ];

    assert.equal(selectPrimaryCatalogVariantItemId(items, "cow"), "earlier");
  });

  it("ties break by id ascending", () => {
    const items = [
      item({ id: "b", designId: "cow", sourceType: "catalog_design", createdAtMs: 1_000 }),
      item({ id: "a", designId: "cow", sourceType: "catalog_design", createdAtMs: 1_000 }),
    ];
    assert.equal(selectPrimaryCatalogVariantItemId(items, "cow"), "a");
  });
});

describe("resolveCatalogAddAction", () => {
  it("creates when design is absent", () => {
    assert.deepEqual(resolveCatalogAddAction([], "cow"), { kind: "create" });
  });

  it("increments primary only when a second size variant exists", () => {
    const items = [
      item({
        id: "primary",
        designId: "cow",
        sourceType: "catalog_design",
        createdAtMs: 1_000,
        quantity: 2,
      }),
      item({
        id: "duplicate-size",
        designId: "cow",
        sourceType: "catalog_design",
        createdAtMs: 2_000,
        quantity: 5,
      }),
    ];

    assert.deepEqual(resolveCatalogAddAction(items, "cow"), {
      kind: "increment",
      itemId: "primary",
      nextQuantity: 3,
    });
  });
});

describe("buildCurrentRequestAggregates", () => {
  it("aggregates distinct designs and total prints across variants", () => {
    const items = [
      item({
        id: "a",
        designId: "cow",
        sourceType: "catalog_design",
        quantity: 2,
        createdAtMs: 1,
      }),
      item({
        id: "b",
        designId: "cow",
        sourceType: "catalog_design",
        quantity: 5,
        createdAtMs: 2,
      }),
      item({
        id: "c",
        customerUploadId: "up1",
        sourceType: "customer_upload",
        quantity: 1,
        createdAtMs: 3,
      }),
    ];

    const aggregates = buildCurrentRequestAggregates(items);
    assert.equal(aggregates.distinctDesignCount, 2);
    assert.equal(aggregates.totalPrintQuantity, 8);
    assert.equal(aggregates.quantityByDesignId.cow, 7);
    assert.equal(aggregates.primaryItemIdByDesignId.cow, "a");
    assert.equal(aggregates.primaryQuantityByDesignId.cow, 2);
  });
});

describe("assessCurrentRequestItemAttention", () => {
  it("flags dpi below minimum and does not treat ADR-FP-080 envelope oversize as unsavable", () => {
    const below = assessCurrentRequestItemAttention(
      item({
        id: "1",
        designId: "x",
        printWidthInches: 20,
        printHeightInches: 20,
        pixelWidth: 1000,
        pixelHeight: 1000,
      }),
    );
    assert.ok(below.includes("dpi_below_minimum"));

    // 1000px → ~3.33″ approved max @ 300 DPI. 4″ is ~250 DPI and is now saveable (200 DPI + 22″).
    const overApprovedMax = assessCurrentRequestItemAttention(
      item({
        id: "2",
        designId: "x",
        printWidthInches: 4,
        printHeightInches: 4,
        pixelWidth: 1000,
        pixelHeight: 1000,
      }),
    );
    assert.equal(overApprovedMax.includes("dpi_below_minimum"), false);
  });

  it("flags upload processing and failed", () => {
    assert.ok(
      assessCurrentRequestItemAttention(
        item({
          id: "u1",
          customerUploadId: "up",
          sourceType: "customer_upload",
          uploadTechnicalStatus: "processing",
          printWidthInches: 10,
          printHeightInches: 10,
          pixelWidth: 3000,
          pixelHeight: 3000,
        }),
      ).includes("upload_processing"),
    );

    assert.ok(
      assessCurrentRequestItemAttention(
        item({
          id: "u2",
          customerUploadId: "up",
          sourceType: "customer_upload",
          uploadTechnicalStatus: "failed",
          printWidthInches: 10,
          printHeightInches: 10,
          pixelWidth: 3000,
          pixelHeight: 3000,
        }),
      ).includes("upload_failed"),
    );
  });

  it("flags missing size", () => {
    assert.ok(
      assessCurrentRequestItemAttention(item({ id: "m", designId: "x" })).includes(
        "missing_or_invalid_size",
      ),
    );
  });

  it("does not flag optimal DPI catalog items with valid size", () => {
    const optimal = assessCurrentRequestItemAttention(
      item({
        id: "ok",
        designId: "x",
        sourceType: "catalog_design",
        printWidthInches: 10,
        printHeightInches: 10,
        pixelWidth: 3000,
        pixelHeight: 3000,
      }),
    );
    assert.deepEqual(optimal, []);
  });

  it("never emits soft dpi_warning for Stash attention (queueable soft DPI is not attention)", () => {
    // 4″ at 1000px is 250 DPI ("good") and saveable; Stash chrome must not flag it.
    const overApprovedMax = assessCurrentRequestItemAttention(
      item({
        id: "soft-path",
        designId: "x",
        sourceType: "catalog_design",
        printWidthInches: 4,
        printHeightInches: 4,
        pixelWidth: 1000,
        pixelHeight: 1000,
      }),
    );
    assert.equal(overApprovedMax.includes("dpi_warning"), false);
  });

  it("does not throw when tiny pixel dims would round approved max to 0", () => {
    assert.doesNotThrow(() => {
      assessCurrentRequestItemAttention(
        item({
          id: "tiny",
          designId: "x",
          sourceType: "catalog_design",
          printWidthInches: 10,
          printHeightInches: 10,
          pixelWidth: 1,
          pixelHeight: 1,
        }),
      );
    });

    const reasons = assessCurrentRequestItemAttention(
      item({
        id: "tiny2",
        designId: "x",
        sourceType: "catalog_design",
        printWidthInches: 10,
        printHeightInches: 10,
        pixelWidth: 1,
        pixelHeight: 1,
      }),
    );
    assert.ok(reasons.includes("dpi_below_minimum") || reasons.includes("missing_or_invalid_size"));
  });
});
