import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { buildPortalAdminDailyShowQueueResponse } from "./portalAdminDailyShowQueue";

function timestamp(iso: string) {
  const milliseconds = new Date(iso).getTime();
  return { toMillis: () => milliseconds };
}

const show = (id: string, start: string, source = "whatnot") => ({
  id,
  data: {
    source,
    title: id,
    scheduledStartAt: timestamp(start),
    status: "scheduled",
    productionStatus: "open",
    isArchived: false,
  },
});

const allocation = (id: string, showId: string, requestId: string, extra: Record<string, unknown> = {}) => ({
  id,
  data: {
    upcomingShowId: showId,
    printRequestId: requestId,
    requestNameSnapshot: `${requestId}-snapshot`,
    allocatedQuantity: 2,
    status: "queued",
    sourceType: "catalog_design",
    designTitleSnapshot: `Design ${id}`,
    createdAt: timestamp(`2026-01-15T1${id.endsWith("2") ? "2" : "1"}:00:00.000Z`),
    ...extra,
  },
});

describe("Portal admin Show Queue DTO", () => {
  it("groups multiple shows, preserves canceled history, and excludes private identifiers", () => {
    const response = buildPortalAdminDailyShowQueueResponse({
      now: new Date("2026-01-15T18:00:00.000Z"),
      projectId: "fresh-prints-prod",
      shows: [show("later", "2026-01-15T20:00:00.000Z"), show("earlier", "2026-01-15T12:00:00.000Z"), show("gang", "2026-01-15T13:00:00.000Z", "staff_gang_sheet")],
      allocations: [
        allocation("a1", "earlier", "customer-request", { customerId: "customer-private" }),
        allocation("a2", "earlier", "customer-request", { status: "canceled", movedFromAllocationId: "lineage-private" }),
        allocation("a3", "later", "internal-request", { sourceType: "customer_upload", customerUploadId: "upload-private", requeuedFromAllocationId: "lineage-private" }),
      ],
      requests: new Map([
        ["customer-request", { name: "Customer Request", isInternal: false, customerUsernameSnapshot: "maker" , email: "private@example.com" }],
        ["internal-request", { name: "Internal Request", isInternal: true }],
      ]),
    });

    assert.deepEqual(response.shows.map((entry) => entry.title), ["earlier", "later"]);
    assert.equal(response.totals.showCount, 2);
    assert.equal(response.totals.attachedQuantity, 6);
    assert.equal(response.totals.activeWorkQuantity, 4);
    assert.equal(response.shows[0]?.requests[0]?.customerIdentityLabel, "@maker");
    assert.equal(response.shows[0]?.requests[0]?.items[1]?.status, "canceled");
    assert.equal(response.shows[1]?.requests[0]?.items[0]?.label, "Customer upload");
    assert.equal(response.shows[1]?.requests[0]?.items[0]?.origin, "requeued");
    const serialized = JSON.stringify(response);
    for (const forbidden of ["customer-private", "upload-private", "lineage-private", "private@example.com"]) {
      assert.equal(serialized.includes(forbidden), false, `DTO leaked ${forbidden}`);
    }
  });

  it("includes dev fixtures only in fresh-prints-dev and handles missing requests", () => {
    const fixture = buildPortalAdminDailyShowQueueResponse({
      now: new Date("2026-01-15T18:00:00.000Z"),
      projectId: "fresh-prints-dev",
      shows: [show("fixture", "2026-01-15T12:00:00.000Z", "dev_fixture")],
      allocations: [allocation("a1", "fixture", "missing", { requestNameSnapshot: "Historical request" })],
      requests: new Map(),
    });
    assert.equal(fixture.shows.length, 1);
    assert.equal(fixture.shows[0]?.requests[0]?.kind, "unknown");
    assert.equal(fixture.shows[0]?.requests[0]?.name, "Historical request");

    const production = buildPortalAdminDailyShowQueueResponse({
      now: new Date("2026-01-15T18:00:00.000Z"),
      projectId: "fresh-prints-prod",
      shows: [show("fixture", "2026-01-15T12:00:00.000Z", "dev_fixture")],
      allocations: [],
      requests: new Map(),
    });
    assert.equal(production.shows.length, 0);
  });
});
