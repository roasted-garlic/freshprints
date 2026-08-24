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
});
