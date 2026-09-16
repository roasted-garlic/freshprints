import assert from "node:assert/strict";
import test from "node:test";

import {
  buildPrintRequestExportImageFilename,
  buildPrintRequestExportItemFilename,
  buildPrintRequestExportZipFilename,
  buildPrintRequestGangSheetBaseFileName,
  buildPrintRequestGangSheetCacheScope,
} from "./printRequestExportFilename";

test("request export filenames use safe immutable request names and item labels", () => {
  assert.equal(buildPrintRequestExportZipFilename("User Name-CR001"), "user-name-cr001.zip");
  assert.match(
    buildPrintRequestExportImageFilename({
      sequenceNumber: 1,
      quantity: 2,
      printWidthInches: 10,
      printHeightInches: 8.33,
      designTitle: "A Design",
      itemId: "item-1234567890",
    }),
    /001_QTY-2_10x8\.33_a-design_item-item-1234567\.png$/,
  );
  const itemFilename = buildPrintRequestExportItemFilename({
    printWidthInches: 11,
    printHeightInches: 13.2,
    designTitle: "A Design / Final",
    itemId: "item-1234567890",
  });
  assert.match(itemFilename, /^a-design-final_11x13\.2_item-item-1234567\.png$/);
  assert.doesNotMatch(itemFilename, /alloc-|QTY-|^\d{3}_/);
  assert.equal(buildPrintRequestGangSheetBaseFileName("User Name-CR001"), "user-name-cr001_gang-sheet");
  assert.equal(buildPrintRequestGangSheetCacheScope("request-1"), "print-request:request-1");
});
