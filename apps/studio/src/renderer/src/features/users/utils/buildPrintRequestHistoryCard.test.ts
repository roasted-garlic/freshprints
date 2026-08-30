import assert from "node:assert/strict";
import { describe, it } from "node:test";

import type { Customer } from "@fresh-prints/shared/types/customer/customer.types";
import type { PrintRequest } from "@fresh-prints/shared/types/printRequest/printRequest.types";
import type { ShowAllocation } from "@fresh-prints/shared/types/showAllocation/showAllocation.types";
import type { UpcomingShow } from "@fresh-prints/shared/types/upcomingShow/upcomingShow.types";
import { Timestamp } from "firebase/firestore";

import {
  buildMissedShowContextForRequest,
  buildPrintRequestDeepLinkForRequest,
  buildPrintRequestHistoryCardSummary,
  buildPrintRequestHistoryDetailEvents,
  buildShowContextForRequest,
  comparePrintRequestHistorySummaries,
  dedupePrintRequestsById,
  sortPrintRequestHistorySummaries,
} from "./buildPrintRequestHistoryCard";
import { batchFirestoreInValues, resolveLogicalCustomerIds } from "./resolveLogicalCustomerIds";

function buildCustomer(overrides: Partial<Customer> = {}): Customer {
  return {
    id: "survivor-1",
    displayName: "Fresh Prints",
    username: "fresh_prints",
    email: "fresh@example.com",
    createdAt: Timestamp.fromMillis(1_700_000_000_000),
    updatedAt: Timestamp.fromMillis(1_700_000_000_000),
    totalPrintRequests: 2,
    totalDesignsUploaded: 0,
    ...overrides,
  } as Customer;
}

function buildRequest(overrides: Partial<PrintRequest> = {}): PrintRequest {
  return {
    id: "pr-1",
    name: "fresh_prints-CR001",
    customerId: "survivor-1",
    isInternal: false,
    requestOrigin: "portal_customer",
    status: "completed",
    itemCount: 6,
    queueTab: "printed",
    createdBy: "customer-uid",
    updatedBy: "staff-uid",
    createdAt: Timestamp.fromMillis(1_700_010_000_000),
    updatedAt: Timestamp.fromMillis(1_700_020_000_000),
    ...overrides,
  } as PrintRequest;
}

function buildAllocation(overrides: Partial<ShowAllocation> = {}): ShowAllocation {
  return {
    id: "alloc-1",
    upcomingShowId: "show-1",
    printRequestId: "pr-1",
    printRequestItemId: "item-1",
    allocatedQuantity: 1,
    sourceItemQuantitySnapshot: 1,
    status: "queued",
    requestNameSnapshot: "fresh_prints-CR001",
    addedBy: "staff-1",
    updatedBy: "staff-1",
    createdAt: Timestamp.fromMillis(1_700_015_000_000),
    updatedAt: Timestamp.fromMillis(1_700_015_000_000),
    customerId: "survivor-1",
    ...overrides,
  } as ShowAllocation;
}

function buildShow(overrides: Partial<UpcomingShow> = {}): UpcomingShow {
  return {
    id: "show-1",
    title: "Friday Night DTF",
    source: "whatnot",
    status: "scheduled",
    syncStatus: "idle",
    scheduledStartAt: Timestamp.fromMillis(1_800_000_000_000),
    createdAt: Timestamp.fromMillis(1_700_000_000_000),
    updatedAt: Timestamp.fromMillis(1_700_000_000_000),
    ...overrides,
  } as UpcomingShow;
}

describe("resolveLogicalCustomerIds", () => {
  it("returns survivor id first and unique merged source ids", () => {
    const ids = resolveLogicalCustomerIds(
      buildCustomer({
        mergedSourceCustomerIds: ["source-1", "source-2", "source-1"],
      }),
    );

    assert.deepEqual(ids, ["survivor-1", "source-1", "source-2"]);
  });
});

describe("batchFirestoreInValues", () => {
  it("chunks values for Firestore in queries", () => {
    const batches = batchFirestoreInValues(
      ["a", "b", "c", "d", "e", "f", "g", "h", "i", "j", "k"],
      10,
    );

    assert.equal(batches.length, 2);
    assert.equal(batches[0]?.length, 10);
    assert.equal(batches[1]?.length, 1);
  });
});

describe("sortPrintRequestHistorySummaries", () => {
  it("orders newest activity first using updatedAt then createdAt", () => {
    const sorted = sortPrintRequestHistorySummaries([
      buildPrintRequestHistoryCardSummary({
        request: buildRequest({
          id: "pr-old",
          name: "roasted_garlic-CR004",
          createdAt: Timestamp.fromMillis(100),
          updatedAt: Timestamp.fromMillis(100),
        }),
        customer: buildCustomer(),
        allocations: [],
        showsById: new Map(),
        relatedRequestNamesById: new Map(),
      }),
      buildPrintRequestHistoryCardSummary({
        request: buildRequest({
          id: "pr-newest",
          name: "roasted_garlic-CR001",
          createdAt: Timestamp.fromMillis(300),
          updatedAt: Timestamp.fromMillis(300),
        }),
        customer: buildCustomer(),
        allocations: [],
        showsById: new Map(),
        relatedRequestNamesById: new Map(),
      }),
      buildPrintRequestHistoryCardSummary({
        request: buildRequest({
          id: "pr-middle",
          name: "roasted_garlic-CR008",
          createdAt: Timestamp.fromMillis(200),
          updatedAt: Timestamp.fromMillis(250),
        }),
        customer: buildCustomer(),
        allocations: [],
        showsById: new Map(),
        relatedRequestNamesById: new Map(),
      }),
    ]);

    assert.deepEqual(
      sorted.map((summary) => summary.name),
      ["roasted_garlic-CR001", "roasted_garlic-CR008", "roasted_garlic-CR004"],
    );
    assert.ok(comparePrintRequestHistorySummaries(sorted[0], sorted[1]) <= 0);
  });
});

describe("dedupePrintRequestsById", () => {
  it("dedupes duplicate ids and keeps the newest updatedAt", () => {
    const deduped = dedupePrintRequestsById([
      buildRequest({ id: "pr-1", updatedAt: Timestamp.fromMillis(100) }),
      buildRequest({ id: "pr-1", updatedAt: Timestamp.fromMillis(200) }),
      buildRequest({ id: "pr-2", updatedAt: Timestamp.fromMillis(150) }),
    ]);

    assert.equal(deduped.length, 2);
    assert.equal(deduped[0]?.id, "pr-1");
    assert.equal(deduped[0]?.updatedAt.toMillis(), 200);
  });
});

describe("buildShowContextForRequest", () => {
  it("uses scheduled show time and separate queued-to-show timestamp", () => {
    const showContext = buildShowContextForRequest(
      buildRequest(),
      [buildAllocation()],
      new Map([[buildShow().id, buildShow()]]),
    );

    assert.ok(showContext);
    assert.equal(showContext?.showTitle, "Friday Night DTF");
    assert.equal(showContext?.scheduledStartAtMillis, 1_800_000_000_000);
    assert.equal(showContext?.queuedToShowAtMillis, 1_700_015_000_000);
    assert.match(showContext?.showDeepLinkPath ?? "", /showId=show-1/);
    assert.match(showContext?.showDeepLinkPath ?? "", /requestId=pr-1/);
    assert.match(showContext?.queuedToShowLabel ?? "", /202/);
  });

  it("prefers active destination allocation after Did Not Print requeue (canceled source ignored)", () => {
    const sourceShow = buildShow({
      id: "show-source",
      title: "Missed Monday",
      scheduledStartAt: Timestamp.fromMillis(1_700_000_000_000),
    });
    const destinationShow = buildShow({
      id: "show-dest",
      title: "Recovery Friday",
      scheduledStartAt: Timestamp.fromMillis(1_900_000_000_000),
    });

    const showContext = buildShowContextForRequest(
      buildRequest(),
      [
        buildAllocation({
          id: "alloc-source",
          upcomingShowId: "show-source",
          status: "canceled",
          createdAt: Timestamp.fromMillis(1_700_010_000_000),
        }),
        buildAllocation({
          id: "alloc-dest",
          upcomingShowId: "show-dest",
          status: "queued",
          requeuedFromAllocationId: "alloc-source",
          createdAt: Timestamp.fromMillis(1_700_030_000_000),
        }),
      ],
      new Map([
        [sourceShow.id, sourceShow],
        [destinationShow.id, destinationShow],
      ]),
    );

    assert.ok(showContext);
    assert.equal(showContext?.showId, "show-dest");
    assert.equal(showContext?.showTitle, "Recovery Friday");
    assert.equal(showContext?.scheduledStartAtMillis, 1_900_000_000_000);
    assert.equal(showContext?.queuedToShowAtMillis, 1_700_030_000_000);
  });

  it("surfaces missed source show after requeue alongside current destination", () => {
    const sourceShow = buildShow({
      id: "show-source",
      title: "DEV-OVERRIDE-7",
      productionResolutionKind: "unfulfilled_requeue",
      scheduledStartAt: Timestamp.fromMillis(1_700_000_000_000),
    });
    const destinationShow = buildShow({
      id: "show-dest",
      title: "Recovery Friday",
      scheduledStartAt: Timestamp.fromMillis(1_900_000_000_000),
    });
    const allocations = [
      buildAllocation({
        id: "alloc-source",
        upcomingShowId: "show-source",
        status: "canceled",
        createdAt: Timestamp.fromMillis(1_700_010_000_000),
      }),
      buildAllocation({
        id: "alloc-dest",
        upcomingShowId: "show-dest",
        status: "queued",
        requeuedFromAllocationId: "alloc-source",
        createdAt: Timestamp.fromMillis(1_700_030_000_000),
      }),
    ];
    const showsById = new Map([
      [sourceShow.id, sourceShow],
      [destinationShow.id, destinationShow],
    ]);

    const summary = buildPrintRequestHistoryCardSummary({
      request: buildRequest(),
      customer: buildCustomer(),
      allocations,
      showsById,
      relatedRequestNamesById: new Map(),
    });

    assert.equal(summary.showContext?.showTitle, "Recovery Friday");
    assert.equal(summary.missedShowContext?.showTitle, "DEV-OVERRIDE-7");
    assert.equal(
      buildMissedShowContextForRequest(buildRequest(), allocations, showsById)?.showTitle,
      "DEV-OVERRIDE-7",
    );
  });
});

describe("buildPrintRequestHistoryCardSummary", () => {
  it("builds conversion lineage and deep links", () => {
    const summary = buildPrintRequestHistoryCardSummary({
      request: buildRequest({
        closureKind: "converted_to_internal",
        convertedToInternalRequestId: "ir-1",
      }),
      customer: buildCustomer(),
      allocations: [],
      showsById: new Map(),
      relatedRequestNamesById: new Map([["ir-1", "fresh_prints-IR002"]]),
      relatedRequestsById: new Map([
        [
          "ir-1",
          buildRequest({
            id: "ir-1",
            name: "fresh_prints-IR002",
            isInternal: true,
            queueTab: "working",
          }),
        ],
      ]),
    });

    assert.equal(summary.conversion?.internalRequestName, "fresh_prints-IR002");
    assert.match(summary.deepLinkPath, /kind=internal/);
    assert.match(summary.deepLinkPath, /ir-1/);
    assert.match(summary.archivedCustomerDeepLinkPath ?? "", /pr-1/);
    assert.equal(summary.internalDeepLinkPath, summary.deepLinkPath);
  });

  it("keeps merged attribution off card fields but available for details", () => {
    const summary = buildPrintRequestHistoryCardSummary({
      request: buildRequest({
        customerId: "source-1",
        customerUsernameAtCreationSnapshot: "old_username",
      }),
      customer: buildCustomer({ mergedSourceCustomerIds: ["source-1"] }),
      allocations: [],
      showsById: new Map(),
      relatedRequestNamesById: new Map(),
    });

    assert.match(summary.mergedSourceAttribution?.label ?? "", /old_username/);
  });
});

describe("buildPrintRequestHistoryDetailEvents", () => {
  it("includes reconstructed allocation and merge attribution entries", () => {
    const summary = buildPrintRequestHistoryCardSummary({
      request: buildRequest({
        customerId: "source-1",
        customerUsernameAtCreationSnapshot: "old_username",
      }),
      customer: buildCustomer({ mergedSourceCustomerIds: ["source-1"] }),
      allocations: [buildAllocation()],
      showsById: new Map([[buildShow().id, buildShow()]]),
      relatedRequestNamesById: new Map(),
    });

    const detail = buildPrintRequestHistoryDetailEvents({
      summary,
      request: buildRequest({
        customerId: "source-1",
        customerUsernameAtCreationSnapshot: "old_username",
      }),
      allocations: [buildAllocation()],
      showsById: new Map([[buildShow().id, buildShow()]]),
      limit: 25,
    });

    assert.ok(detail.events.some((event) => event.label === "Queued to show"));
    assert.ok(detail.events.some((event) => event.label === "Merged account attribution"));
    assert.equal(detail.hasMoreEvents, false);
  });

  it("shows missed-show requeue timeline in details (canceled source + moved destination)", () => {
    const sourceShow = buildShow({
      id: "show-source",
      title: "Missed Monday",
      productionResolutionKind: "unfulfilled_requeue",
      scheduledStartAt: Timestamp.fromMillis(1_700_000_000_000),
    });
    const destinationShow = buildShow({
      id: "show-dest",
      title: "Recovery Friday",
      scheduledStartAt: Timestamp.fromMillis(1_900_000_000_000),
    });
    const allocations = [
      buildAllocation({
        id: "alloc-source",
        upcomingShowId: "show-source",
        status: "canceled",
        createdAt: Timestamp.fromMillis(1_700_010_000_000),
      }),
      buildAllocation({
        id: "alloc-dest",
        upcomingShowId: "show-dest",
        status: "queued",
        requeuedFromAllocationId: "alloc-source",
        createdAt: Timestamp.fromMillis(1_700_030_000_000,
        ),
      }),
    ];
    const summary = buildPrintRequestHistoryCardSummary({
      request: buildRequest(),
      customer: buildCustomer(),
      allocations,
      showsById: new Map([
        [sourceShow.id, sourceShow],
        [destinationShow.id, destinationShow],
      ]),
      relatedRequestNamesById: new Map(),
    });

    const detail = buildPrintRequestHistoryDetailEvents({
      summary,
      request: buildRequest(),
      allocations,
      showsById: new Map([
        [sourceShow.id, sourceShow],
        [destinationShow.id, destinationShow],
      ]),
      limit: 25,
    });

    assert.ok(
      detail.events.some((event) => event.label.includes("Originally queued to show · Did not print")),
    );
    assert.ok(detail.events.some((event) => event.label === "Moved to another show"));
    assert.equal(
      detail.events.filter((event) => event.label.includes("Queued to show")).length,
      0,
    );
  });

  it("groups per-item allocations into one show event per request", () => {
    const show = buildShow({ id: "show-1", title: "Wednesday Evening" });
    const allocations = Array.from({ length: 5 }, (_, index) =>
      buildAllocation({
        id: `alloc-${index + 1}`,
        printRequestItemId: `item-${index + 1}`,
        createdAt: Timestamp.fromMillis(1_700_015_000_000 + index * 1_000),
      }),
    );
    const summary = buildPrintRequestHistoryCardSummary({
      request: buildRequest(),
      customer: buildCustomer(),
      allocations,
      showsById: new Map([[show.id, show]]),
      relatedRequestNamesById: new Map(),
    });

    const detail = buildPrintRequestHistoryDetailEvents({
      summary,
      request: buildRequest(),
      allocations,
      showsById: new Map([[show.id, show]]),
      limit: 25,
    });

    const queuedEvents = detail.events.filter((event) => event.label === "Queued to show");
    assert.equal(queuedEvents.length, 1);
    assert.equal(queuedEvents[0]?.occurredAtMillis, 1_700_015_000_000);
  });
});

describe("buildPrintRequestDeepLinkForRequest", () => {
  it("uses buildPrintRequestDeepLinkPath inputs from the request", () => {
    const path = buildPrintRequestDeepLinkForRequest(
      buildRequest({ queueTab: "working", itemCount: 6, updatedAt: Timestamp.fromMillis(123) }),
    );

    assert.match(path, /print-requests/);
    assert.match(path, /pr-1/);
  });
});
