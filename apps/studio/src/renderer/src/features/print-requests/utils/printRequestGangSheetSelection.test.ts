import assert from "node:assert/strict";
import { describe, it } from "node:test";

import type { PrintRequestItem } from "@fresh-prints/shared/types/printRequest/printRequest.types";

import {
  buildPrintRequestGangSheetExportQuantities,
  buildPrintRequestGangSheetSelection,
  getPrintRequestGangSheetItemLabel,
  mergePrintRequestGangSheetExportQuantities,
  normalizeExportQuantity,
  resolvePrintRequestGangSheetExportItems,
  resolvePrintRequestGangSheetSelection,
  sumPrintRequestGangSheetExportQuantity,
} from "./printRequestGangSheetSelection";

function item(id: string, overrides: Partial<PrintRequestItem> = {}): PrintRequestItem {
  return {
    id,
    designId: `design-${id}`,
    quantity: 2,
    printWidthInches: 5,
    printHeightInches: 6,
    titleSnapshot: `Artwork ${id}`,
    ...overrides,
  } as PrintRequestItem;
}

describe("print request gang sheet selection", () => {
  it("defaults to every whole item and preserves the request item objects", () => {
    const items = [
      item("catalog-1"),
      item("upload-1", { designId: undefined, customerUploadId: "upload-1", sourceType: "customer_upload" }),
      item("staff-1", { designId: undefined, staffArtworkId: "staff-1", sourceType: "staff_artwork" }),
    ];
    const selection = buildPrintRequestGangSheetSelection(items);

    assert.deepEqual([...selection], ["catalog-1", "upload-1", "staff-1"]);
    assert.deepEqual(resolvePrintRequestGangSheetSelection(items, selection), items);
  });

  it("filters stale IDs at generate time without mutating source items", () => {
    const items = [item("one", { quantity: 7 }), item("two", { quantity: 3 })];
    const selected = resolvePrintRequestGangSheetSelection(items, new Set(["one", "removed"]));

    assert.deepEqual(selected, [items[0]]);
    assert.equal(selected[0]?.quantity, 7);
    assert.equal(items.length, 2);
    assert.equal(items[0]?.id, "one");
  });

  it("applies export-only quantity overrides by cloning changed items only", () => {
    const items = [item("one", { quantity: 7 }), item("two", { quantity: 3 })];
    const quantities = new Map([
      ["one", 2],
      ["two", 3],
    ]);
    const exported = resolvePrintRequestGangSheetExportItems(items, new Set(["one", "two"]), quantities);

    assert.equal(exported[0]?.quantity, 2);
    assert.equal(exported[1]?.quantity, 3);
    assert.notEqual(exported[0], items[0]);
    assert.equal(exported[1], items[1]);
    assert.equal(items[0]?.quantity, 7);
    assert.equal(sumPrintRequestGangSheetExportQuantity(items, new Set(["one"]), quantities), 2);
  });

  it("normalizes invalid export quantities and merges across item-list changes", () => {
    assert.equal(normalizeExportQuantity(0, 5), 1);
    assert.equal(normalizeExportQuantity(2.9, 5), 2);
    assert.equal(normalizeExportQuantity(Number.NaN, 5), 5);
    assert.equal(normalizeExportQuantity(5000, 5), 999);

    const items = [item("one", { quantity: 4 }), item("two", { quantity: 8 })];
    const previous = new Map([["one", 2], ["gone", 9]]);
    const merged = mergePrintRequestGangSheetExportQuantities(items, previous);
    assert.deepEqual([...merged.entries()], [
      ["one", 2],
      ["two", 8],
    ]);
    assert.deepEqual([...buildPrintRequestGangSheetExportQuantities(items).entries()], [
      ["one", 4],
      ["two", 8],
    ]);
  });

  it("provides safe labels for catalog, upload, and Staff Artwork sources", () => {
    assert.equal(getPrintRequestGangSheetItemLabel(item("catalog", { titleSnapshot: "  " })), "Catalog design");
    assert.equal(
      getPrintRequestGangSheetItemLabel(item("upload", { titleSnapshot: "", designId: undefined, customerUploadId: "upload", sourceType: "customer_upload" })),
      "Uploaded artwork",
    );
    assert.equal(
      getPrintRequestGangSheetItemLabel(item("staff", { titleSnapshot: "", designId: undefined, staffArtworkId: "staff", sourceType: "staff_artwork" })),
      "Staff Artwork",
    );
  });
});
