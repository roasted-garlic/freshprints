import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

const here = dirname(fileURLToPath(import.meta.url));

test("request export builds from request items and keeps x(Qty) on the shared ZIP IPC", () => {
  const source = readFileSync(join(here, "useExportPrintRequestZip.ts"), "utf8");
  assert.match(source, /buildPrintRequestExportAssets/);
  assert.match(source, /multiplyByQuantity/);
  assert.match(source, /requestItemId/);
  assert.doesNotMatch(source, /listShowAllocations|upcomingShowService/);
});

test("request gang sheet is Standard-only, request-scoped, and has no Show telemetry", () => {
  const source = readFileSync(join(here, "useGeneratePrintRequestGangSheet.ts"), "utf8");
  assert.match(source, /buildPrintRequestGangSheetCacheScope/);
  assert.match(source, /sheetLabel: printRequest\.name/);
  assert.match(source, /requestItemId/);
  assert.doesNotMatch(source, /recordGangSheetGenerated|layoutMode/);
});

test("request direct-action buttons are hidden on Working and Editing tabs", () => {
  const source = readFileSync(
    join(here, "../pages/PrintRequestsPage.tsx"),
    "utf8",
  );
  assert.match(source, /canShowDirectRequestActions/);
  assert.match(source, /selectedRequestDerivedListTab === "working"/);
  assert.match(source, /selectedRequestDerivedListTab === "editing"/);
  assert.match(source, /canShowDirectRequestActions \? \(/);
  assert.match(source, /canShowAllocationActions \? \(/);
});

test("request detail uses labeled total metrics instead of the size-count pill", () => {
  const source = readFileSync(
    join(here, "../pages/PrintRequestsPage.tsx"),
    "utf8",
  );
  assert.match(source, /print-requests-detail-metrics/);
  assert.match(source, /Total price/);
  assert.match(source, /Total weight/);
  assert.doesNotMatch(source, /selectedRequestSizeClassLabel/);
});

test("read-only design cards mirror quantity and cost metadata rows", () => {
  const source = readFileSync(
    join(here, "../components/PrintRequestItemCard.tsx"),
    "utf8",
  );
  assert.match(source, /print-requests-item-readonly-meta/);
  assert.match(source, /print-requests-item-cost-label/);
  assert.match(source, /print-requests-item-cost-value/);
  assert.match(source, /formatItemCost\(itemCost\.unitPriceUsd, itemCost\.quantity, itemCost\.totalPriceUsd\)/);
});

test("request totals breakdown includes the canonical size ranges", () => {
  const source = readFileSync(
    join(here, "../components/PrintRequestCostBreakdownModal.tsx"),
    "utf8",
  );
  assert.match(source, /TIER_SIZE_RANGES/);
  assert.match(source, /4" and under/);
  assert.match(source, /over 4" through 11"/);
  assert.match(source, /over 11" through 14"/);
  assert.match(source, /over 14"/);
  assert.match(source, /print-request-cost-breakdown-row-range/);
});
