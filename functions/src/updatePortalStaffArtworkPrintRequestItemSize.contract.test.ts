import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const source = readFileSync("functions/src/updatePortalStaffArtworkPrintRequestItemSize.ts", "utf8");

test("Staff Artwork Portal size callable keeps source dimensions private", () => {
  assert.match(source, /requirePortalCustomer/);
  assert.match(source, /assertPortalMaintenanceAllowsCustomerMutation/);
  assert.match(source, /assertPortalActiveEditableRequestData/);
  assert.match(source, /staffArtworks/);
  assert.match(source, /requireSavablePrintRequestItemSize/);
  assert.doesNotMatch(source, /previewStoragePath/);
  assert.doesNotMatch(source, /effectiveDpi/);
  assert.doesNotMatch(source, /widthPx: active/);
});
