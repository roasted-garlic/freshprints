import assert from "node:assert/strict";
import test, { describe, it } from "node:test";

import { applyStandardPrintSizePreset } from "../../packages/shared/src/utils/applyStandardPrintSizePreset";
import {
  assessPrintRequestItemSize,
  resolveInitialPrintRequestItemSize,
  STANDARD_PRINT_REQUEST_INITIAL_WIDTH_INCHES,
} from "../../packages/shared/src/utils/printRequestItemSizing";

import {
  buildPortalCatalogAddAccounting,
  resolvePortalCatalogAddLineSize,
} from "./addPortalCatalogDesignToPrintRequest";

test("accounts for a created catalog line and its analytics trigger", () => {
  assert.deepEqual(buildPortalCatalogAddAccounting("created", {
    transactionAttempts: 2,
    transactionDocumentsReturned: 7,
    durationMs: 25,
    outcome: "success",
  }), {
    itemWrites: 1,
    parentRequestWrites: 1,
    designAnalyticsWrites: 1,
    idempotencyWrites: 0,
    otherWrites: 0,
    totalWrites: 3,
    itemOutcome: "created",
    readOperations: 8,
    documentsReturned: 11,
    transactionAttempts: 2,
    batchSize: 0,
    deletes: 0,
    duplicateSkip: false,
    durationMs: 25,
    outcome: "success",
  });
});

test("does not claim a create-only analytics trigger for quantity increments", () => {
  assert.deepEqual(buildPortalCatalogAddAccounting("incremented", {
    transactionAttempts: 1,
    transactionDocumentsReturned: 3,
    durationMs: 10,
    outcome: "success",
  }), {
    itemWrites: 1,
    parentRequestWrites: 1,
    designAnalyticsWrites: 0,
    idempotencyWrites: 0,
    otherWrites: 0,
    totalWrites: 2,
    itemOutcome: "incremented",
    readOperations: 6,
    documentsReturned: 7,
    transactionAttempts: 1,
    batchSize: 0,
    deletes: 0,
    duplicateSkip: false,
    durationMs: 10,
    outcome: "success",
  });
});

describe("resolvePortalCatalogAddLineSize (Portal catalog-add callable)", () => {
  it("initializes eligible legacy catalog art at 11 inches when runtime default is absent", () => {
    const size = resolvePortalCatalogAddLineSize({
      pixelWidth: 3600,
      pixelHeight: 1800,
      designPrintWidthInches: 10,
    });
    assert.equal(size.printWidthInches, 11);
    assert.equal(size.printHeightInches, 5.5);
  });

  it("initializes at 11 inches when runtime default is configured", () => {
    const size = resolvePortalCatalogAddLineSize({
      pixelWidth: 3600,
      pixelHeight: 1800,
      designPrintWidthInches: 10,
      printRequestDefaultWidthInches: 11,
    });
    assert.equal(size.printWidthInches, 11);
    assert.equal(size.printHeightInches, 5.5);
  });

  it("allows 200–299 DPI at 11 inches with warning tier", () => {
    const size = resolvePortalCatalogAddLineSize({
      pixelWidth: 3000,
      pixelHeight: 3000,
      designPrintWidthInches: 10,
      printRequestDefaultWidthInches: 11,
    });
    assert.equal(size.printWidthInches, 11);
    const assessment = assessPrintRequestItemSize({
      pixelWidth: 3000,
      pixelHeight: 3000,
      printWidthInches: size.printWidthInches,
      printHeightInches: size.printHeightInches,
    });
    assert.equal(assessment.qualityLevel, "good");
    assert.ok(assessment.effectiveDpi >= 200 && assessment.effectiveDpi < 300);
    assert.equal(assessment.canSave, true);
    assert.ok(assessment.warningMessage);
  });

  it("does not create an invalid item below 200 DPI at 11 inches", () => {
    const size = resolvePortalCatalogAddLineSize({
      pixelWidth: 2000,
      pixelHeight: 2000,
      designPrintWidthInches: 10,
    });
    assert.ok(size.printWidthInches < 11);
    const assessment = assessPrintRequestItemSize({
      pixelWidth: 2000,
      pixelHeight: 2000,
      printWidthInches: size.printWidthInches,
      printHeightInches: size.printHeightInches,
    });
    assert.equal(assessment.canSave, true);
    assert.ok(assessment.effectiveDpi >= 200);
  });

  it("honors explicit client-requested dimensions when provided", () => {
    const size = resolvePortalCatalogAddLineSize({
      pixelWidth: 3600,
      pixelHeight: 1800,
      designPrintWidthInches: 10,
      requestedPrintWidthInches: 8,
      requestedPrintHeightInches: 4,
    });
    assert.equal(size.printWidthInches, 8);
    assert.equal(size.printHeightInches, 4);
  });

  it("uses the shared 11 inch system fallback constant when runtime default is absent", () => {
    assert.equal(STANDARD_PRINT_REQUEST_INITIAL_WIDTH_INCHES, 11);
    const size = resolvePortalCatalogAddLineSize({
      pixelWidth: 4500,
      pixelHeight: 4500,
    });
    assert.equal(size.printWidthInches, 11);
  });
});

describe("Portal catalog-add persisted sizing semantics", () => {
  it("cart and review surfaces read the same persisted width/height fields", () => {
    const size = resolvePortalCatalogAddLineSize({
      pixelWidth: 3600,
      pixelHeight: 1800,
      designPrintWidthInches: 10,
      printRequestDefaultWidthInches: 11,
    });
    const persistedItem = {
      printWidthInches: size.printWidthInches,
      printHeightInches: size.printHeightInches,
      quantity: 1,
    };
    assert.equal(persistedItem.printWidthInches, 11);
    assert.equal(persistedItem.printHeightInches, 5.5);
  });

  it("quantity-only updates preserve existing print dimensions", () => {
    const existingItem = {
      printWidthInches: 11,
      printHeightInches: 5.5,
      quantity: 2,
    };
    const nextQuantity = existingItem.quantity + 1;
    const responseItem = {
      printWidthInches: existingItem.printWidthInches,
      printHeightInches: existingItem.printHeightInches,
      quantity: nextQuantity,
    };
    assert.equal(responseItem.printWidthInches, 11);
    assert.equal(responseItem.printHeightInches, 5.5);
    assert.equal(responseItem.quantity, 3);
  });

  it("explicit Standard Size selection overrides the generic runtime default", () => {
    const genericDefault = resolveInitialPrintRequestItemSize({
      pixelWidth: 3600,
      pixelHeight: 3600,
      defaultPrintWidthInches: 10,
      printRequestDefaultWidthInches: 11,
    });
    const preset = applyStandardPrintSizePreset({
      presetWidthInches: 14,
      pixelWidth: 3600,
      pixelHeight: 3600,
    });
    assert.equal(genericDefault.printWidthInches, 11);
    assert.equal(preset.printWidthInches, 14);
  });

  it("uses runtime default 10.5 inches when configured", () => {
    const size = resolvePortalCatalogAddLineSize({
      pixelWidth: 3600,
      pixelHeight: 1800,
      designPrintWidthInches: 10,
      printRequestDefaultWidthInches: 10.5,
    });
    assert.equal(size.printWidthInches, 10.5);
  });

  it("uses runtime default 11.5 inches when configured", () => {
    const size = resolvePortalCatalogAddLineSize({
      pixelWidth: 3600,
      pixelHeight: 1800,
      designPrintWidthInches: 10,
      printRequestDefaultWidthInches: 11.5,
    });
    assert.equal(size.printWidthInches, 11.5);
  });

  it("falls back to 11 inches when runtime default is absent", () => {
    const size = resolvePortalCatalogAddLineSize({
      pixelWidth: 3600,
      pixelHeight: 1800,
      designPrintWidthInches: 10,
    });
    assert.equal(size.printWidthInches, 11);
  });
});
