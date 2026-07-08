import assert from "node:assert/strict";
import test from "node:test";

import {
  getPortalPrintRequestListTabLabel,
  groupPortalPrintRequestsByListTab,
  isPortalContinuablePrintRequestStatus,
  parsePortalPrintRequestListTab,
} from "./portalPrintRequestListTabs";

test("parsePortalPrintRequestListTab accepts working, queued, and printed", () => {
  assert.equal(parsePortalPrintRequestListTab(null), "working");
  assert.equal(parsePortalPrintRequestListTab("working"), "working");
  assert.equal(parsePortalPrintRequestListTab("queued"), "queued");
  assert.equal(parsePortalPrintRequestListTab("printed"), "printed");
  assert.equal(parsePortalPrintRequestListTab("draft"), "working");
});

test("isPortalContinuablePrintRequestStatus matches editable portal statuses", () => {
  assert.equal(isPortalContinuablePrintRequestStatus("draft"), true);
  assert.equal(isPortalContinuablePrintRequestStatus("editing"), true);
  assert.equal(isPortalContinuablePrintRequestStatus("active"), false);
});

test("groupPortalPrintRequestsByListTab mirrors studio Working/Queued/Printed grouping", () => {
  const requests = [
    { id: "working-1", status: "draft" as const, name: "A", isInternal: false, itemCount: 1, createdBy: "u", updatedBy: "u", createdAt: {} as never, updatedAt: {} as never },
    { id: "queued-1", status: "active" as const, name: "B", isInternal: false, itemCount: 1, createdBy: "u", updatedBy: "u", createdAt: {} as never, updatedAt: {} as never },
    { id: "printed-1", status: "completed" as const, name: "C", isInternal: false, itemCount: 1, createdBy: "u", updatedBy: "u", createdAt: {} as never, updatedAt: {} as never },
  ];

  const grouped = groupPortalPrintRequestsByListTab({
    requests,
    summariesByRequestId: {
      "working-1": { totalQuantity: 5, uniqueDesignCount: 1 },
      "queued-1": { totalQuantity: 5, uniqueDesignCount: 1 },
      "printed-1": { totalQuantity: 5, uniqueDesignCount: 1 },
    },
    allocationTotalsByRequestId: {
      "queued-1": { totalAllocatedQuantity: 5, totalPrintedQuantity: 0 },
    },
  });

  assert.deepEqual(
    Object.fromEntries(
      (Object.keys(grouped) as Array<keyof typeof grouped>).map((tab) => [tab, grouped[tab].map((request) => request.id)]),
    ),
    {
      working: ["working-1"],
      queued: ["queued-1"],
      printed: ["printed-1"],
    },
  );
});

test("getPortalPrintRequestListTabLabel returns customer-facing labels", () => {
  assert.equal(getPortalPrintRequestListTabLabel("working"), "Working");
  assert.equal(getPortalPrintRequestListTabLabel("queued"), "Queued");
  assert.equal(getPortalPrintRequestListTabLabel("printed"), "Printed");
});
