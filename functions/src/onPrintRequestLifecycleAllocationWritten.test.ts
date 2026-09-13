import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { Timestamp } from "firebase-admin/firestore";

import { resolveAllocationTransition } from "./onPrintRequestLifecycleAllocationWritten";

const context = {
  title: "Recovery Friday",
  scheduledStartAt: Timestamp.fromMillis(900),
};

describe("Print Request lifecycle allocation trigger", () => {
  it("records initial show membership and Did Not Print requeue lineage", () => {
    const added = resolveAllocationTransition({
      allocationId: "allocation-1",
      printRequestId: "pr-1",
      sourceChangeId: "change-1",
      eventTime: "2026-09-09T12:00:00.000Z",
      showContext: context,
      after: {
        upcomingShowId: "show-1",
        createdAt: Timestamp.fromMillis(100),
        status: "queued",
      },
    });
    assert.equal(added?.type, "added_to_show");
    assert.equal(added?.showTitleSnapshot, "Recovery Friday");

    const requeued = resolveAllocationTransition({
      allocationId: "allocation-2",
      printRequestId: "pr-1",
      sourceChangeId: "change-2",
      eventTime: "2026-09-09T12:00:00.000Z",
      showContext: context,
      after: {
        upcomingShowId: "show-2",
        createdAt: Timestamp.fromMillis(200),
        status: "queued",
        requeuedFromAllocationId: "allocation-1",
      },
    });
    assert.equal(requeued?.type, "did_not_print_requeued");
    assert.equal(requeued?.relatedAllocationId, "allocation-1");
  });

  it("records production milestones and deletion as a server-observed removal", () => {
    const printed = resolveAllocationTransition({
      allocationId: "allocation-1",
      printRequestId: "pr-1",
      sourceChangeId: "change-3",
      eventTime: "2026-09-09T12:00:00.000Z",
      showContext: context,
      before: { upcomingShowId: "show-1", status: "in_progress" },
      after: {
        upcomingShowId: "show-1",
        status: "printed",
        printedAt: Timestamp.fromMillis(300),
      },
    });
    assert.equal(printed?.type, "allocation_printed");
    assert.equal(printed?.occurredAt.toMillis(), 300);

    const deleted = resolveAllocationTransition({
      allocationId: "allocation-1",
      printRequestId: "pr-1",
      sourceChangeId: "change-4",
      eventTime: "2026-09-09T12:00:01.000Z",
      showContext: context,
      before: { upcomingShowId: "show-1", status: "queued" },
    });
    assert.equal(deleted?.type, "removed_from_show");
    assert.equal(deleted?.source, "show_allocation_delete");
  });
});
