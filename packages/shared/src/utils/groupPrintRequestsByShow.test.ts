import assert from "node:assert/strict";
import { describe, it } from "node:test";

import type { PrintRequest } from "../types/printRequest/printRequest.types";
import type { ShowAllocation } from "../types/showAllocation/showAllocation.types";
import {
  UNASSIGNED_SHOW_SECTION_KEY,
  buildGroupedGangSheetSectionContinuedHeading,
  buildGroupedGangSheetSectionHeading,
  groupPrintRequestsByShow,
  resolveGangSheetProductionGroupKey,
} from "./groupPrintRequestsByShow";

function mockTimestamp(ms: number) {
  return { toMillis: () => ms } as PrintRequest["updatedAt"];
}

function mockRequest(overrides: Partial<PrintRequest> & Pick<PrintRequest, "id" | "name">): PrintRequest {
  return {
    isInternal: false,
    status: "active",
    itemCount: 1,
    createdBy: "user-1",
    updatedBy: "user-1",
    createdAt: mockTimestamp(0),
    updatedAt: mockTimestamp(0),
    ...overrides,
  };
}

function mockAllocation(overrides: Partial<ShowAllocation> & Pick<ShowAllocation, "id" | "printRequestId" | "upcomingShowId">): ShowAllocation {
  return {
    status: "active",
    allocatedQuantity: 1,
    sourceType: "catalog_design",
    designId: "design-1",
    ...overrides,
  } as ShowAllocation;
}

describe("resolveGangSheetProductionGroupKey", () => {
  it("prefers customerId over username and request id", () => {
    const key = resolveGangSheetProductionGroupKey({
      printRequestId: "req-1",
      customerId: "cust-1",
      customerUsernameSnapshot: "alice",
      isInternal: false,
    });

    assert.equal(key, "customer:cust-1");
  });

  it("falls back to username then internal base name then request id", () => {
    assert.equal(
      resolveGangSheetProductionGroupKey({
        printRequestId: "req-2",
        customerUsernameSnapshot: "Bob",
        isInternal: false,
      }),
      "customer-username:bob",
    );

    assert.equal(
      resolveGangSheetProductionGroupKey({
        printRequestId: "req-3",
        internalBaseName: "StaffRun",
        isInternal: true,
      }),
      "internal-base:staffrun",
    );

    assert.equal(
      resolveGangSheetProductionGroupKey({
        printRequestId: "req-4",
        isInternal: false,
      }),
      "request:req-4",
    );
  });
});

describe("buildGroupedGangSheetSectionHeading", () => {
  it("joins unique request names for combined groups", () => {
    assert.equal(
      buildGroupedGangSheetSectionHeading(["alice-IR002", "alice-IR001", "alice-IR002"]),
      "alice-IR001, alice-IR002",
    );
  });

  it("returns a single request name unchanged", () => {
    assert.equal(buildGroupedGangSheetSectionHeading(["roasted_garlic-CR001"]), "roasted_garlic-CR001");
  });
});

describe("buildGroupedGangSheetSectionContinuedHeading", () => {
  it("appends -Continued to the base heading", () => {
    assert.equal(
      buildGroupedGangSheetSectionContinuedHeading("roasted_garlic-CR001"),
      "roasted_garlic-CR001-Continued",
    );
  });
});

describe("groupPrintRequestsByShow", () => {
  it("places each request once under the earliest scheduled show and records extra show counts", () => {
    const request = mockRequest({ id: "req-1", name: "alice-IR001", updatedAt: mockTimestamp(100) });
    const showsById = {
      "show-later": { id: "show-later", scheduledStartAt: new Date("2026-08-20T18:00:00Z") },
      "show-soon": { id: "show-soon", scheduledStartAt: new Date("2026-08-10T18:00:00Z") },
    };

    const sections = groupPrintRequestsByShow({
      requests: [request],
      allocationsByRequestId: {
        "req-1": [
          mockAllocation({ id: "alloc-1", printRequestId: "req-1", upcomingShowId: "show-later" }),
          mockAllocation({ id: "alloc-2", printRequestId: "req-1", upcomingShowId: "show-soon" }),
        ],
      },
      showsById,
    });

    assert.equal(sections.length, 1);
    assert.equal(sections[0]?.sectionKey, "show-soon");
    assert.equal(sections[0]?.requests.length, 1);
    assert.equal(sections[0]?.extraShowCountByRequestId["req-1"], 1);
  });

  it("sorts sections by show schedule and unassigned last", () => {
    const assigned = mockRequest({ id: "req-a", name: "assigned", updatedAt: mockTimestamp(200) });
    const unassigned = mockRequest({ id: "req-u", name: "unassigned", updatedAt: mockTimestamp(300) });

    const sections = groupPrintRequestsByShow({
      requests: [unassigned, assigned],
      allocationsByRequestId: {
        "req-a": [mockAllocation({ id: "alloc-a", printRequestId: "req-a", upcomingShowId: "show-1" })],
        "req-u": [],
      },
      showsById: {
        "show-1": { id: "show-1", scheduledStartAt: new Date("2026-08-15T18:00:00Z") },
      },
    });

    assert.equal(sections[0]?.sectionKey, "show-1");
    assert.equal(sections[1]?.sectionKey, UNASSIGNED_SHOW_SECTION_KEY);
  });

  it("staff_gang_sheet_history orders #5 before #4 when #5 finished later", () => {
    const req4 = mockRequest({ id: "req-4", name: "ir-4", isInternal: true, updatedAt: mockTimestamp(10) });
    const req5 = mockRequest({ id: "req-5", name: "ir-5", isInternal: true, updatedAt: mockTimestamp(20) });

    const sections = groupPrintRequestsByShow({
      requests: [req4, req5],
      allocationsByRequestId: {
        "req-4": [mockAllocation({ id: "a4", printRequestId: "req-4", upcomingShowId: "sheet-4" })],
        "req-5": [mockAllocation({ id: "a5", printRequestId: "req-5", upcomingShowId: "sheet-5" })],
      },
      showsById: {
        "sheet-4": {
          id: "sheet-4",
          staffGangSheetCycleNumber: 4,
          printFinishedAt: { toMillis: () => Date.parse("2026-08-01T00:00:00Z") },
        },
        "sheet-5": {
          id: "sheet-5",
          staffGangSheetCycleNumber: 5,
          printFinishedAt: { toMillis: () => Date.parse("2026-08-02T00:00:00Z") },
        },
      },
      sectionOrder: "staff_gang_sheet_history",
    });

    assert.deepEqual(
      sections.map((section) => section.sectionKey),
      ["sheet-5", "sheet-4"],
    );
    assert.deepEqual(
      sections[0]?.requests.map((request) => request.id),
      ["req-5"],
    );
  });

  it("staff_gang_sheet_history uses cycle DESC when both lack printFinishedAt", () => {
    const req4 = mockRequest({ id: "req-4", name: "ir-4", isInternal: true, updatedAt: mockTimestamp(10) });
    const req5 = mockRequest({ id: "req-5", name: "ir-5", isInternal: true, updatedAt: mockTimestamp(20) });
    const req6 = mockRequest({ id: "req-6", name: "ir-6", isInternal: true, updatedAt: mockTimestamp(30) });

    const sections = groupPrintRequestsByShow({
      requests: [req4, req6, req5],
      allocationsByRequestId: {
        "req-4": [mockAllocation({ id: "a4", printRequestId: "req-4", upcomingShowId: "sheet-4" })],
        "req-5": [mockAllocation({ id: "a5", printRequestId: "req-5", upcomingShowId: "sheet-5" })],
        "req-6": [mockAllocation({ id: "a6", printRequestId: "req-6", upcomingShowId: "sheet-6" })],
      },
      showsById: {
        "sheet-4": { id: "sheet-4", staffGangSheetCycleNumber: 4 },
        "sheet-5": { id: "sheet-5", staffGangSheetCycleNumber: 5 },
        "sheet-6": { id: "sheet-6", staffGangSheetCycleNumber: 6 },
      },
      sectionOrder: "staff_gang_sheet_history",
    });

    assert.deepEqual(
      sections.map((section) => section.sectionKey),
      ["sheet-6", "sheet-5", "sheet-4"],
    );
  });

  it("preserves updatedAt DESC request order inside a history-sorted section", () => {
    const older = mockRequest({ id: "older", name: "a", isInternal: true, updatedAt: mockTimestamp(100) });
    const newer = mockRequest({ id: "newer", name: "b", isInternal: true, updatedAt: mockTimestamp(200) });

    const sections = groupPrintRequestsByShow({
      requests: [older, newer],
      allocationsByRequestId: {
        older: [mockAllocation({ id: "ao", printRequestId: "older", upcomingShowId: "sheet-1" })],
        newer: [mockAllocation({ id: "an", printRequestId: "newer", upcomingShowId: "sheet-1" })],
      },
      showsById: {
        "sheet-1": { id: "sheet-1", staffGangSheetCycleNumber: 1 },
      },
      sectionOrder: "staff_gang_sheet_history",
    });

    assert.deepEqual(
      sections[0]?.requests.map((request) => request.id),
      ["newer", "older"],
    );
  });

  it("default sectionOrder keeps scheduled_start_asc for customer-style groups", () => {
    const early = mockRequest({ id: "early", name: "e", updatedAt: mockTimestamp(1) });
    const late = mockRequest({ id: "late", name: "l", updatedAt: mockTimestamp(2) });

    const sections = groupPrintRequestsByShow({
      requests: [late, early],
      allocationsByRequestId: {
        early: [mockAllocation({ id: "ae", printRequestId: "early", upcomingShowId: "s-early" })],
        late: [mockAllocation({ id: "al", printRequestId: "late", upcomingShowId: "s-late" })],
      },
      showsById: {
        "s-early": { id: "s-early", scheduledStartAt: new Date("2026-08-10T18:00:00Z") },
        "s-late": { id: "s-late", scheduledStartAt: new Date("2026-08-20T18:00:00Z") },
      },
    });

    assert.deepEqual(
      sections.map((section) => section.sectionKey),
      ["s-early", "s-late"],
    );
  });
});
