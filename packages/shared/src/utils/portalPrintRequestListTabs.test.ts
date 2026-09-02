import assert from "node:assert/strict";
import test from "node:test";

import {
  getPortalPrintRequestListTabLabel,
  groupPortalPrintRequestsByListTab,
  isPortalContinuablePrintRequestStatus,
  parsePortalPrintRequestListTab,
  PORTAL_PRINT_REQUEST_LIST_TABS,
  toPortalPrintRequestListTab,
} from "./portalPrintRequestListTabs";

test("parsePortalPrintRequestListTab accepts working, editing, queued, printing, and printed", () => {
  assert.equal(parsePortalPrintRequestListTab(null), "working");
  assert.equal(parsePortalPrintRequestListTab("working"), "working");
  assert.equal(parsePortalPrintRequestListTab("editing"), "editing");
  assert.equal(parsePortalPrintRequestListTab("queued"), "queued");
  assert.equal(parsePortalPrintRequestListTab("printing"), "printing");
  assert.equal(parsePortalPrintRequestListTab("printed"), "printed");
  assert.equal(parsePortalPrintRequestListTab("draft"), "working");
});

test("isPortalContinuablePrintRequestStatus matches editable portal statuses", () => {
  assert.equal(isPortalContinuablePrintRequestStatus("draft"), true);
  assert.equal(isPortalContinuablePrintRequestStatus("editing"), true);
  assert.equal(isPortalContinuablePrintRequestStatus("active"), false);
});

test("groupPortalPrintRequestsByListTab mirrors studio Working/Editing/Queued/Printing/Printed grouping", () => {
  const requests = [
    { id: "working-1", status: "draft" as const, name: "A", isInternal: false, itemCount: 1, createdBy: "u", updatedBy: "u", createdAt: {} as never, updatedAt: {} as never },
    { id: "editing-1", status: "editing" as const, name: "E", isInternal: false, itemCount: 1, createdBy: "u", updatedBy: "u", createdAt: {} as never, updatedAt: {} as never },
    { id: "queued-1", status: "active" as const, name: "B", isInternal: false, itemCount: 1, createdBy: "u", updatedBy: "u", createdAt: {} as never, updatedAt: {} as never },
    { id: "printing-1", status: "active" as const, name: "D", isInternal: false, itemCount: 1, createdBy: "u", updatedBy: "u", createdAt: {} as never, updatedAt: {} as never },
    { id: "printed-1", status: "completed" as const, name: "C", isInternal: false, itemCount: 1, createdBy: "u", updatedBy: "u", createdAt: {} as never, updatedAt: {} as never },
  ];

  const grouped = groupPortalPrintRequestsByListTab({
    requests,
    summariesByRequestId: {
      "working-1": { totalQuantity: 5, uniqueDesignCount: 1 },
      "editing-1": { totalQuantity: 3, uniqueDesignCount: 1 },
      "queued-1": { totalQuantity: 5, uniqueDesignCount: 1 },
      "printing-1": { totalQuantity: 5, uniqueDesignCount: 1 },
      "printed-1": { totalQuantity: 5, uniqueDesignCount: 1 },
    },
    allocationTotalsByRequestId: {
      "queued-1": { totalAllocatedQuantity: 5, totalInProgressQuantity: 0, totalPrintedQuantity: 0 },
      "printing-1": { totalAllocatedQuantity: 5, totalInProgressQuantity: 5, totalPrintedQuantity: 0 },
    },
  });

  assert.deepEqual(
    Object.fromEntries(
      (Object.keys(grouped) as Array<keyof typeof grouped>).map((tab) => [tab, grouped[tab].map((request) => request.id)]),
    ),
    {
      working: ["working-1"],
      editing: ["editing-1"],
      queued: ["queued-1"],
      printing: ["printing-1"],
      printed: ["printed-1"],
    },
  );
});

test("getPortalPrintRequestListTabLabel returns customer-facing labels", () => {
  assert.equal(getPortalPrintRequestListTabLabel("working"), "Working");
  assert.equal(getPortalPrintRequestListTabLabel("editing"), "Editing");
  assert.equal(getPortalPrintRequestListTabLabel("queued"), "Queued");
  assert.equal(getPortalPrintRequestListTabLabel("printing"), "Printing");
  assert.equal(getPortalPrintRequestListTabLabel("printed"), "Printed");
});

test("toPortalPrintRequestListTab keeps Studio editing as Portal Editing", () => {
  assert.equal(toPortalPrintRequestListTab("editing"), "editing");
  assert.equal(toPortalPrintRequestListTab("working"), "working");
  assert.equal(toPortalPrintRequestListTab("queued"), "queued");
});

test("PORTAL_PRINT_REQUEST_LIST_TABS order matches Studio customer lifecycle", () => {
  assert.deepEqual([...PORTAL_PRINT_REQUEST_LIST_TABS], [
    "working",
    "editing",
    "queued",
    "printing",
    "printed",
  ]);
});
