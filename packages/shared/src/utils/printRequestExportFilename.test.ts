import assert from "node:assert/strict";
import test from "node:test";

import {
  buildPrintRequestExportImageFilename,
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
  assert.equal(buildPrintRequestGangSheetBaseFileName("User Name-CR001"), "user-name-cr001_gang-sheet");
  assert.equal(buildPrintRequestGangSheetCacheScope("request-1"), "print-request:request-1");
});
