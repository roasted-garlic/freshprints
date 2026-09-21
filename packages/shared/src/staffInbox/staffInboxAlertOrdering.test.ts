import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  compareStaffInboxAlertSoundKinds,
  compareStaffInboxItemsForDisplay,
} from "./staffInboxAlertOrdering";

describe("staffInboxAlertOrdering", () => {
  it("plays queued alerts before show full alerts", () => {
    assert.ok(
      compareStaffInboxAlertSoundKinds("request_queued_to_show", "show_queue_full") < 0,
    );
  });

  it("lists queued before show full when timestamps match", () => {
    const queued = {
      id: "portal_queued:req-1:show-1",
      kind: "portal_queued" as const,
      title: "CR-jane-1",
      subtitle: "Queued",
      occurredAtMillis: 500,
    };
    const full = {
      id: "show_queue_full:show-1",
      kind: "show_queue_full" as const,
      title: "Friday Vinyl",
      subtitle: "Full",
      occurredAtMillis: 500,
    };

    assert.ok(compareStaffInboxItemsForDisplay(queued, full) < 0);
  });

  it("uses the alert id as a deterministic final tie-breaker", () => {
    const first = {
      id: "show_queue_full:show-a",
      kind: "show_queue_full" as const,
      title: "A",
      subtitle: "Full",
      occurredAtMillis: 500,
    };
    const second = { ...first, id: "show_queue_full:show-b" };

    assert.ok(compareStaffInboxItemsForDisplay(first, second) < 0);
    assert.ok(compareStaffInboxItemsForDisplay(second, first) > 0);
  });
});
