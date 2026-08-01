import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { formatShowDateTimeLabel } from "./showDateTimeDisplay";
import {
  PORTAL_PRINT_REQUEST_SHOW_SCHEDULE_BATCH_MAX,
  PORTAL_SHOW_SCHEDULE_UNAVAILABLE_LABEL,
  buildPortalCustomerShowScheduleCardSummary,
  buildPortalCustomerShowSchedulesFromAllocations,
  formatPortalCustomerShowScheduleLabel,
  formatPortalPrintRequestShowScheduleBatchCapMessage,
} from "./portalCustomerShowSchedule";

const SHOW_A = "show-a";
const SHOW_B = "show-b";
const SHOW_C = "show-c";

describe("portalCustomerShowSchedule", () => {
  it("returns no schedules when there are no positive allocations", () => {
    const schedules = buildPortalCustomerShowSchedulesFromAllocations(
      [
        { upcomingShowId: SHOW_A, allocatedQuantity: 0, status: "queued" },
        { upcomingShowId: SHOW_B, allocatedQuantity: 5, status: "canceled" },
      ],
      new Map([[SHOW_A, { scheduledStartAt: "2026-08-01T01:00:00.000Z" }]]),
    );
    assert.deepEqual(schedules, []);
    assert.equal(buildPortalCustomerShowScheduleCardSummary(schedules).line, null);
  });

  it("formats one allocation with the existing show date/time formatter", () => {
    const iso = "2026-08-01T01:00:00.000Z";
    const schedules = buildPortalCustomerShowSchedulesFromAllocations(
      [{ upcomingShowId: SHOW_A, allocatedQuantity: 3, status: "queued" }],
      new Map([[SHOW_A, { scheduledStartAt: iso }]]),
    );
    assert.equal(schedules.length, 1);
    const expected = formatShowDateTimeLabel(new Date(iso));
    assert.equal(formatPortalCustomerShowScheduleLabel(schedules[0]!), expected);
    assert.equal(buildPortalCustomerShowScheduleCardSummary(schedules).line, `Queued for ${expected}`);
    assert.equal(formatPortalCustomerShowScheduleLabel(schedules[0]!).includes(SHOW_A), false);
  });

  it("dedupes multiple item allocations to the same show", () => {
    const schedules = buildPortalCustomerShowSchedulesFromAllocations(
      [
        { upcomingShowId: SHOW_A, allocatedQuantity: 2, status: "queued" },
        { upcomingShowId: SHOW_A, allocatedQuantity: 3, status: "queued" },
      ],
      new Map([[SHOW_A, { scheduledStartAt: "2026-08-01T01:00:00.000Z" }]]),
    );
    assert.equal(schedules.length, 1);
    assert.equal(schedules[0]!.upcomingShowId, SHOW_A);
  });

  it("lists multiple shows chronologically", () => {
    const schedules = buildPortalCustomerShowSchedulesFromAllocations(
      [
        { upcomingShowId: SHOW_B, allocatedQuantity: 1, status: "queued" },
        { upcomingShowId: SHOW_A, allocatedQuantity: 1, status: "queued" },
        { upcomingShowId: SHOW_C, allocatedQuantity: 1, status: "printed" },
      ],
      new Map([
        [SHOW_A, { scheduledStartAt: "2026-08-03T01:00:00.000Z" }],
        [SHOW_B, { scheduledStartAt: "2026-08-01T01:00:00.000Z" }],
        [SHOW_C, { scheduledStartAt: "2026-08-02T01:00:00.000Z" }],
      ]),
    );
    assert.deepEqual(
      schedules.map((s) => s.upcomingShowId),
      [SHOW_B, SHOW_C, SHOW_A],
    );
  });

  it("card summary uses earliest show plus accurate additional count", () => {
    const schedules = buildPortalCustomerShowSchedulesFromAllocations(
      [
        { upcomingShowId: SHOW_A, allocatedQuantity: 1, status: "queued" },
        { upcomingShowId: SHOW_B, allocatedQuantity: 1, status: "queued" },
        { upcomingShowId: SHOW_C, allocatedQuantity: 1, status: "queued" },
      ],
      new Map([
        [SHOW_A, { scheduledStartAt: "2026-08-03T01:00:00.000Z" }],
        [SHOW_B, { scheduledStartAt: "2026-08-01T01:00:00.000Z" }],
        [SHOW_C, { scheduledStartAt: "2026-08-02T01:00:00.000Z" }],
      ]),
    );
    const summary = buildPortalCustomerShowScheduleCardSummary(schedules);
    const earliest = formatShowDateTimeLabel(new Date("2026-08-01T01:00:00.000Z"));
    assert.equal(summary.additionalCount, 2);
    assert.equal(summary.line, `Queued for ${earliest} · + 2 more`);
  });

  it("treats printed/done allocations as schedule-retaining", () => {
    const schedules = buildPortalCustomerShowSchedulesFromAllocations(
      [{ upcomingShowId: SHOW_A, allocatedQuantity: 4, status: "done" }],
      new Map([[SHOW_A, { scheduledStartAt: "2026-07-01T01:00:00.000Z" }]]),
    );
    assert.equal(schedules.length, 1);
  });

  it("missing show uses quiet fallback without exposing show id", () => {
    const schedules = buildPortalCustomerShowSchedulesFromAllocations(
      [{ upcomingShowId: SHOW_A, allocatedQuantity: 1, status: "queued" }],
      new Map([[SHOW_A, { scheduledStartAt: null, missingShow: true }]]),
    );
    const label = formatPortalCustomerShowScheduleLabel(schedules[0]!);
    assert.equal(label, PORTAL_SHOW_SCHEDULE_UNAVAILABLE_LABEL);
    assert.equal(label.includes(SHOW_A), false);
    const card = buildPortalCustomerShowScheduleCardSummary(schedules);
    assert.equal(card.line, `Queued for ${PORTAL_SHOW_SCHEDULE_UNAVAILABLE_LABEL}`);
    assert.equal(card.line!.includes(SHOW_A), false);
  });

  it("documents the batch printRequestIds cap", () => {
    assert.equal(PORTAL_PRINT_REQUEST_SHOW_SCHEDULE_BATCH_MAX, 50);
    assert.match(formatPortalPrintRequestShowScheduleBatchCapMessage(), /50/);
  });
});
