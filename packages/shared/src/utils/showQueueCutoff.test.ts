import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  DEFAULT_PORTAL_QUEUE_CUTOFF_HOURS_BEFORE_START,
  PORTAL_QUEUE_CUTOFF_CLOSED_SLOT_LABEL,
  PORTAL_QUEUE_CUTOFF_CLOSED_SLOT_LABEL_SHORT,
  formatPortalQueueCutoffCountdown,
  formatPortalQueueCutoffDuration,
  formatPortalQueueCutoffMeta,
  formatPortalQueueCutoffMetaLabel,
  getPortalQueueCutoffAt,
  getPortalQueueCutoffUrgency,
  isPastPortalQueueCutoff,
  isValidPortalQueueCutoffHours,
  resolvePortalQueueCutoffHours,
} from "./showQueueCutoff";

describe("resolvePortalQueueCutoffHours", () => {
  it("defaults when unset or invalid", () => {
    assert.equal(resolvePortalQueueCutoffHours(undefined), DEFAULT_PORTAL_QUEUE_CUTOFF_HOURS_BEFORE_START);
    assert.equal(resolvePortalQueueCutoffHours(null), DEFAULT_PORTAL_QUEUE_CUTOFF_HOURS_BEFORE_START);
    assert.equal(resolvePortalQueueCutoffHours(0), DEFAULT_PORTAL_QUEUE_CUTOFF_HOURS_BEFORE_START);
    assert.equal(resolvePortalQueueCutoffHours(100), DEFAULT_PORTAL_QUEUE_CUTOFF_HOURS_BEFORE_START);
  });

  it("floors valid numbers in range", () => {
    assert.equal(resolvePortalQueueCutoffHours(5), 5);
    assert.equal(resolvePortalQueueCutoffHours(5.9), 5);
    assert.equal(resolvePortalQueueCutoffHours(1), 1);
    assert.equal(resolvePortalQueueCutoffHours(72), 72);
  });
});

describe("isValidPortalQueueCutoffHours", () => {
  it("accepts integers in 1–72", () => {
    assert.equal(isValidPortalQueueCutoffHours(5), true);
    assert.equal(isValidPortalQueueCutoffHours(5.5), false);
    assert.equal(isValidPortalQueueCutoffHours(0), false);
  });
});

describe("getPortalQueueCutoffAt / isPastPortalQueueCutoff", () => {
  it("uses 5h before start for 8pm example", () => {
    const start = new Date("2026-07-20T20:00:00Z");
    const cutoff = getPortalQueueCutoffAt(start, 5);
    assert.ok(cutoff);
    assert.equal(cutoff.toISOString(), "2026-07-20T15:00:00.000Z");

    assert.equal(isPastPortalQueueCutoff(start, new Date("2026-07-20T14:59:59Z"), 5), false);
    assert.equal(isPastPortalQueueCutoff(start, new Date("2026-07-20T15:00:00Z"), 5), true);
  });

  it("supports Timestamp-like toDate()", () => {
    const start = { toDate: () => new Date("2026-07-20T20:00:00Z") };
    assert.equal(isPastPortalQueueCutoff(start, new Date("2026-07-20T16:00:00Z"), 5), true);
  });

  it("returns false when schedule missing", () => {
    assert.equal(isPastPortalQueueCutoff(null, new Date(), 5), false);
  });
});

describe("formatPortalQueueCutoffDuration", () => {
  it("formats compact duration without left suffix", () => {
    assert.equal(formatPortalQueueCutoffDuration(45 * 60_000), "45m");
    assert.equal(formatPortalQueueCutoffDuration(2 * 60 * 60_000 + 14 * 60_000), "2h 14m");
    assert.equal(formatPortalQueueCutoffDuration(3 * 60 * 60_000), "3h");
  });
});

describe("getPortalQueueCutoffUrgency", () => {
  it("maps remaining time to success / warning / danger", () => {
    assert.equal(getPortalQueueCutoffUrgency(3 * 60 * 60_000), "success");
    assert.equal(getPortalQueueCutoffUrgency(2 * 60 * 60_000), "warning");
    assert.equal(getPortalQueueCutoffUrgency(90 * 60_000), "warning");
    assert.equal(getPortalQueueCutoffUrgency(30 * 60_000), "danger");
    assert.equal(getPortalQueueCutoffUrgency(0), "danger");
    assert.equal(getPortalQueueCutoffUrgency(-1), "danger");
  });
});

describe("formatPortalQueueCutoffMeta", () => {
  it("builds open and closed slot copy with urgency", () => {
    const start = new Date("2026-07-20T20:00:00Z");
    const open = formatPortalQueueCutoffMeta(start, new Date("2026-07-20T12:00:00Z"), 5);
    assert.deepEqual(open, {
      label: "3h to add designs to this show",
      shortLabel: "3h to add designs",
      urgency: "success",
    });

    const warning = formatPortalQueueCutoffMeta(start, new Date("2026-07-20T13:30:00Z"), 5);
    assert.equal(warning?.label, "1h 30m to add designs to this show");
    assert.equal(warning?.shortLabel, "1h 30m to add designs");
    assert.equal(warning?.urgency, "warning");

    const closed = formatPortalQueueCutoffMeta(start, new Date("2026-07-20T16:00:00Z"), 5);
    assert.deepEqual(closed, {
      label: PORTAL_QUEUE_CUTOFF_CLOSED_SLOT_LABEL,
      shortLabel: PORTAL_QUEUE_CUTOFF_CLOSED_SLOT_LABEL_SHORT,
      urgency: "danger",
    });
  });
});

describe("formatPortalQueueCutoffCountdown (legacy)", () => {
  it("still appends left for open windows", () => {
    assert.equal(formatPortalQueueCutoffCountdown(45 * 60_000), "45m left");
    assert.equal(formatPortalQueueCutoffCountdown(0), PORTAL_QUEUE_CUTOFF_CLOSED_SLOT_LABEL);
  });
});

describe("formatPortalQueueCutoffMetaLabel (legacy)", () => {
  it("returns label only", () => {
    const start = new Date("2026-07-20T20:00:00Z");
    assert.equal(
      formatPortalQueueCutoffMetaLabel(start, new Date("2026-07-20T12:00:00Z"), 5),
      "3h to add designs to this show",
    );
  });
});
